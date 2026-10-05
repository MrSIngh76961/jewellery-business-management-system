import type { AuditLog, Invoice, StockItem } from "./types";
import type { GoldWeightMetrics } from "./purity";
import { calculateFineGoldWeight, calculateGoldWeightMetrics, goldRateForPurity, type PurityDefinition } from "./purity";
import type { SalesReturn, StockAdjustment } from "./operations";

export type MeltingStatus = "Draft" | "Processing" | "Tested" | "Completed" | "Cancelled";
export interface MeltingBatch {
  id: string;
  batchNumber: string;
  inputReference: string;
  inputGrossWeight: number;
  inputNetWeight: number;
  inputPurity: string;
  expectedFineGold: number;
  actualFineGold?: number;
  meltingLoss?: number;
  refiningLoss?: number;
  finalPurity?: string;
  finalWeight?: number;
  refinery: string;
  operator: string;
  date: string;
  notes: string;
  attachment: string;
  status: MeltingStatus;
  goldMovementIds: string[];
  finishedStockId?: string;
}

export type AssayLinkType = "Old Gold" | "Melting Batch" | "Stock Item" | "Purchase" | "Karigar Return";
export type TestingMethod = "XRF" | "Touchstone" | "Fire Assay" | "Other";
export interface AssayRecord {
  id: string;
  testId: string;
  linkType: AssayLinkType;
  reference: string;
  inputWeight: number;
  testedPurity: string;
  method: TestingMethod;
  testedBy: string;
  date: string;
  result: string;
  notes: string;
  attachment: string;
  applied: boolean;
}

export type ProductionStatus = "Draft" | "Material Issued" | "In Production" | "Quality Check" | "Completed" | "Cancelled";
export interface ProductionOrder {
  id: string;
  orderNumber: string;
  product: string;
  sku: string;
  category: string;
  goldRequired: number;
  purity: string;
  stonesRequired: string;
  otherMaterials: string;
  labourCost: number;
  expectedWeight: number;
  expectedWastage: number;
  actualWeight?: number;
  actualWastage?: number;
  karigar: string;
  status: ProductionStatus;
  createdAt: string;
  ledgerJobId?: string;
  finishedStockId?: string;
  goldCost: number;
  stoneCost: number;
  otherCost: number;
}

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired" | "Converted";
export interface QuotationLine {
  item: string;
  weight: number;
  purity: string;
  goldRate: number;
  making: number;
  wastage: number;
  stones: number;
  other: number;
  discount: number;
  gstRate: number;
}
export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  date: string;
  validUntil: string;
  items: QuotationLine[];
  estimatedTotal: number;
  advance: number;
  status: QuotationStatus;
  lockedRate: boolean;
  bookingId?: string;
  invoiceId?: string;
}

export interface ReversalRecord {
  id: string;
  originalReference: string;
  reversalReference: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending Approval" | "Approved" | "Rejected";
  approvalId?: string;
  decisionBy?: string;
  decidedAt?: string;
  invoiceId: string;
  originalPaid: number;
  originalBalance: number;
  reversedGst: number;
  reversedGoldWeight: number;
  stockTags: string[];
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type RiskState = "Open" | "Acknowledged" | "Resolved";
export interface RiskAlert {
  id: string;
  level: RiskLevel;
  title: string;
  details: string;
  user: string;
  date: string;
  reference: string;
  recommendedAction: string;
  module: string;
  state: RiskState;
  assignedTo?: string;
  note?: string;
}

export interface AdvancedModulesData {
  meltingBatches: MeltingBatch[];
  assays: AssayRecord[];
  productionOrders: ProductionOrder[];
  quotations: Quotation[];
  reversals: ReversalRecord[];
  riskStates: Record<string, Pick<RiskAlert, "state" | "assignedTo" | "note">>;
}

export interface AdvancedRiskState extends AdvancedModulesData {
  riskAlerts: RiskAlert[];
}

export const emptyAdvancedModules: AdvancedModulesData = {
  meltingBatches: [],
  assays: [],
  productionOrders: [],
  quotations: [],
  reversals: [],
  riskStates: {},
};

export function quotationLineTotal(item: QuotationLine) {
  const gold = item.weight * item.goldRate;
  const wastage = gold * item.wastage / 100;
  const taxable = Math.max(0, gold + wastage + item.making + item.stones + item.other - item.discount);
  return taxable * (1 + item.gstRate / 100);
}

export function quotationTotal(items: QuotationLine[]) {
  return items.reduce((total, item) => total + quotationLineTotal(item), 0);
}

export function calculateStockScenario(stock: StockItem[], orders: { estimate: number }[], rate22: number, rate18: number, purities: readonly PurityDefinition[] = []) {
  const available = stock.filter((item) => item.status === "In Stock");
  const valuation = available.reduce((total, item) => {
    const itemRate = goldRateForPurity(rate22, rate18, item.purity, purities);
    return total + item.weight * itemRate;
  }, 0);
  const knownCost = available.reduce((total, item) => total + (item.purchaseCost ?? 0), 0);
  return {
    currentValuation: valuation,
    stockItems: available.length,
    knownCost,
    marginAtCurrentRate: knownCost > 0 ? valuation - knownCost : null,
    openOrderEstimates: orders.reduce((total, order) => total + order.estimate, 0),
  };
}

function riskLevelFromAction(action: string): RiskLevel {
  if (/cancel|write.?off|refund|reopen|override/i.test(action)) return "High";
  if (/adjust|discount|delete|sensitive|failed|denied/i.test(action)) return "Medium";
  return "Low";
}

export function deriveRiskAlerts(input: {
  auditLogs: AuditLog[];
  invoices: Invoice[];
  reconciliations: Array<{ id: string; difference: number; date: string; actor: string; purityId: string }>;
  stockAdjustments: StockAdjustment[];
  returns: SalesReturn[];
  reversals: ReversalRecord[];
  riskStates: AdvancedModulesData["riskStates"];
}): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const add = (record: Omit<RiskAlert, "state" | "assignedTo" | "note">) => {
    const status = input.riskStates[record.id];
    alerts.push({ ...record, state: status?.state ?? "Open", ...(status?.assignedTo ? { assignedTo: status.assignedTo } : {}), ...(status?.note ? { note: status.note } : {}) });
  };
  for (const log of input.auditLogs) {
    const elevated = /cancel|write.?off|refund|reopen|override|adjust|discount|failed|denied|gold rates/i.test(log.action);
    if (!elevated) continue;
    add({
      id: `audit-${log.id}`,
      level: riskLevelFromAction(log.action),
      title: log.action,
      details: `${log.module ?? "System"} activity was recorded and matched a configured high-risk action rule.`,
      user: log.actor,
      date: log.at,
      reference: log.referenceId ?? log.id,
      recommendedAction: "Review the audit trail and confirm the action was authorized.",
      module: log.module ?? "Audit Log",
    });
  }
  for (const adjustment of input.stockAdjustments) {
    if (Math.abs(adjustment.difference) < 10) continue;
    add({
      id: `stock-adjustment-${adjustment.id}`,
      level: Math.abs(adjustment.difference) >= 25 ? "Critical" : "High",
      title: "Large stock adjustment",
      details: `${adjustment.tag} was adjusted by ${adjustment.difference.toFixed(3)} g (${adjustment.reason}).`,
      user: adjustment.actor,
      date: adjustment.date,
      reference: adjustment.id,
      recommendedAction: "Verify the physical recount and Owner approval against the stock audit trail.",
      module: "Stock",
    });
  }
  for (const record of input.returns) {
    if (record.refund < 50000) continue;
    add({
      id: `refund-${record.id}`,
      level: record.refund >= 100000 ? "Critical" : "High",
      title: "Large customer refund",
      details: `Refund of ₹${record.refund.toLocaleString("en-IN")} was recorded against invoice ${record.invoiceId}.`,
      user: "Return record",
      date: record.date,
      reference: record.id,
      recommendedAction: "Verify the refund approval, payment settlement and returned-stock receipt.",
      module: "Returns",
    });
  }
  const repeatedInvoiceChanges = new Map<string, AuditLog[]>();
  for (const log of input.auditLogs) {
    if (!log.referenceId || !/updated invoice/i.test(log.action)) continue;
    repeatedInvoiceChanges.set(log.referenceId, [...(repeatedInvoiceChanges.get(log.referenceId) ?? []), log]);
  }
  for (const [invoiceId, changes] of repeatedInvoiceChanges) {
    if (changes.length < 3) continue;
    add({
      id: `invoice-changes-${invoiceId}`,
      level: changes.length >= 5 ? "Critical" : "High",
      title: "Repeated changes to one invoice",
      details: `${invoiceId} has ${changes.length} recorded edits.`,
      user: changes[0].actor,
      date: changes[0].at,
      reference: invoiceId,
      recommendedAction: "Review previous/new invoice values and confirm the changes are authorized.",
      module: "Billing",
    });
  }
  const cancellations = input.reversals.filter((reversal) => reversal.status === "Approved");
  if (cancellations.length >= 3) {
    const recent = cancellations.slice(0, 3);
    add({
      id: `cancel-frequency-${recent.map((item) => item.id).join("-")}`,
      level: cancellations.length >= 5 ? "Critical" : "High",
      title: "Frequent invoice reversals",
      details: `${cancellations.length} invoice reversals are recorded; the threshold for review is 3.`,
      user: recent[0].decisionBy ?? recent[0].requestedBy,
      date: recent[0].decidedAt ?? recent[0].requestedAt,
      reference: recent.map((item) => item.invoiceId).join(", "),
      recommendedAction: "Review the invoice reversal reasons and approval trail.",
      module: "Reversals",
    });
  }
  for (const reconciliation of input.reconciliations) {
    if (Math.abs(reconciliation.difference) < 1) continue;
    add({
      id: `gold-difference-${reconciliation.id}`,
      level: Math.abs(reconciliation.difference) >= 10 ? "Critical" : "High",
      title: "Physical gold mismatch",
      details: `${reconciliation.purityId} reconciliation differs by ${reconciliation.difference.toFixed(3)} g.`,
      user: reconciliation.actor,
      date: reconciliation.date,
      reference: reconciliation.id,
      recommendedAction: "Recount physical stock and review movements around this date.",
      module: "Gold Accounting",
    });
  }
  const discountCandidates = input.invoices.filter((invoice) => {
    if (invoice.cancelledAt) return false;
    const gross = invoice.items.reduce((sum, item) => sum + item.weight * item.rate + item.making + item.wastage + item.other, 0);
    return gross > 0 && invoice.discount / gross >= 0.15;
  });
  for (const invoice of discountCandidates) {
    add({
      id: `discount-${invoice.id}`,
      level: invoice.discount / Math.max(1, invoice.items.reduce((sum, item) => sum + item.weight * item.rate + item.making + item.wastage + item.other, 0)) >= 0.25 ? "Critical" : "High",
      title: "Unusually high invoice discount",
      details: `Discount of ₹${invoice.discount.toLocaleString("en-IN")} exceeds the deterministic 15% review threshold.`,
      user: "Invoice record",
      date: invoice.date,
      reference: invoice.id,
      recommendedAction: "Verify discount approval and invoice margin.",
      module: "Billing",
    });
  }
  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}

export function metricsForPurity(grossWeight: number, netWeight: number, purity: string, purities: Array<{ id: string; fineness: number }>): GoldWeightMetrics {
  return calculateGoldWeightMetrics({ grossWeight, netWeight, purity, configured: purities });
}

export function calculateMeltingExpectedFine(netWeight: number, purity: string, purities: Array<{ id: string; fineness: number }>) {
  return calculateFineGoldWeight(netWeight, purity, purities);
}
