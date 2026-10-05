"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useToast } from "@/components/ui/Toast";
import { invoiceTotals } from "@/lib/billing";
import { DEMO_TODAY } from "@/lib/config";
import {
  calculateMeltingExpectedFine,
  deriveRiskAlerts,
  emptyAdvancedModules,
  quotationTotal,
  type AdvancedModulesData,
  type AssayRecord,
  type MeltingBatch,
  type ProductionOrder,
  type Quotation,
  type ReversalRecord,
  type RiskAlert,
} from "@/lib/advanced-modules";
import type { InvoiceDraft } from "@/components/providers/AppProvider";
import { getSession } from "@/lib/services/auth";
import { invoiceBalance } from "@/lib/selectors";
import { uid } from "@/lib/utils";
import { publishStoneStockRestored } from "@/lib/stones";
import { goldRateForPurity } from "@/lib/purity";
import { INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT } from "@/lib/operations";

const STORAGE_KEY = "reinsoft-gold-advanced-modules-v1";

interface AdvancedModulesState extends AdvancedModulesData {
  riskAlerts: RiskAlert[];
  addMeltingBatch: (input: Omit<MeltingBatch, "id" | "expectedFineGold" | "status" | "goldMovementIds">) => MeltingBatch;
  updateMeltingStatus: (id: string, status: MeltingBatch["status"], actualFineGold?: number) => void;
  addAssay: (input: Omit<AssayRecord, "id" | "testId" | "applied"> & { applyToStock?: boolean }) => AssayRecord;
  addProductionOrder: (input: Omit<ProductionOrder, "id" | "orderNumber" | "status" | "createdAt" | "goldCost" | "stoneCost" | "otherCost" | "ledgerJobId" | "finishedStockId"> & { stoneCost: number; otherCost: number }) => ProductionOrder;
  advanceProduction: (id: string, actualWeight?: number, actualWastage?: number) => void;
  cancelProduction: (id: string, reason: string) => void;
  addQuotation: (input: Omit<Quotation, "id" | "quotationNumber" | "estimatedTotal" | "status" | "bookingId" | "invoiceId"> & { advance?: number }) => Quotation;
  setQuotationStatus: (id: string, status: Exclude<Quotation["status"], "Converted">) => void;
  convertQuotationToBooking: (id: string) => string;
  convertQuotationToInvoice: (id: string) => string;
  requestInvoiceReversal: (id: string, reason: string) => ReversalRecord;
  decideInvoiceReversal: (id: string, decision: "Approved" | "Rejected", reason: string) => void;
  updateRisk: (id: string, change: { state?: RiskAlert["state"]; assignedTo?: string; note?: string }) => void;
}

const Context = createContext<AdvancedModulesState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function requireRole(roles: Array<"Owner" | "Staff" | "Accountant">) {
  const role = getSession()?.role;
  if (!role || !roles.includes(role)) throw new Error("Your role does not have permission for this action.");
}

function dateIsValid(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requirePositive(value: number, label: string, allowZero = false) {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) throw new Error(`${label} must be ${allowZero ? "non-negative" : "greater than zero"}.`);
}

export function AdvancedModulesProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { invoices, customers, settings, auditLogs, addInvoice, markInvoiceReversed, logAudit } = useApp();
  const { stock, addStock, restoreSoldByTags, updateStockPurity } = useShop();
  const { saveBooking, requestApproval, approvals, decideApproval, stockAdjustments, returns } = useOperations();
  const gold = useGoldAccounting();
  const [data, setData] = useState<AdvancedModulesData>(emptyAdvancedModules);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!isRecord(parsed)) throw new Error("Saved advanced-module data has an invalid format.");
          setData({
            meltingBatches: Array.isArray(parsed.meltingBatches) ? parsed.meltingBatches as MeltingBatch[] : [],
            assays: Array.isArray(parsed.assays) ? parsed.assays as AssayRecord[] : [],
            productionOrders: Array.isArray(parsed.productionOrders) ? parsed.productionOrders as ProductionOrder[] : [],
            quotations: Array.isArray(parsed.quotations) ? parsed.quotations as Quotation[] : [],
            reversals: Array.isArray(parsed.reversals) ? parsed.reversals as ReversalRecord[] : [],
            riskStates: isRecord(parsed.riskStates) ? parsed.riskStates as AdvancedModulesData["riskStates"] : {},
          });
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load advanced modules: ${error.message}` : "Could not load advanced modules.", "error");
      } finally {
        setLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      toast(error instanceof Error ? `Could not save advanced modules: ${error.message}` : "Could not save advanced modules.", "error");
    }
  }, [data, loaded, toast]);

  const addMeltingBatch = useCallback((input: Omit<MeltingBatch, "id" | "expectedFineGold" | "status" | "goldMovementIds">) => {
    requireRole(["Owner", "Accountant"]);
    if (!input.batchNumber.trim() || !input.inputReference.trim() || !dateIsValid(input.date)) throw new Error("Enter a batch number, input reference and valid date.");
    if (data.meltingBatches.some((batch) => batch.batchNumber.toLowerCase() === input.batchNumber.trim().toLowerCase())) throw new Error("That melting batch number is already in use.");
    requirePositive(input.inputGrossWeight, "Gross weight");
    requirePositive(input.inputNetWeight, "Net weight");
    if (input.inputNetWeight > input.inputGrossWeight) throw new Error("Net weight cannot exceed gross weight.");
    if (!input.refinery.trim() || !input.operator.trim()) throw new Error("Refinery and operator are required.");
    const purity = gold.purities.find((item) => item.id === input.inputPurity);
    if (!purity) throw new Error("Choose a configured input purity.");
    const batch: MeltingBatch = {
      ...input,
      id: uid("MELT"),
      batchNumber: input.batchNumber.trim(),
      expectedFineGold: calculateMeltingExpectedFine(input.inputNetWeight, input.inputPurity, gold.purities),
      status: "Draft",
      goldMovementIds: [],
    };
    setData((current) => ({ ...current, meltingBatches: [batch, ...current.meltingBatches] }));
    logAudit(`Created melting batch ${batch.batchNumber}`, { module: "Melting", referenceId: batch.id, newValue: JSON.stringify(batch) });
    return batch;
  }, [data.meltingBatches, gold.purities, logAudit]);

  const updateMeltingStatus = useCallback((id: string, status: MeltingBatch["status"], actualFineGold?: number) => {
    requireRole(["Owner", "Accountant"]);
    const batch = data.meltingBatches.find((item) => item.id === id);
    if (!batch) throw new Error("Melting batch not found.");
    const allowed: Record<MeltingBatch["status"], MeltingBatch["status"][]> = {
      Draft: ["Processing", "Cancelled"],
      Processing: ["Tested", "Cancelled"],
      Tested: ["Completed", "Cancelled"],
      Completed: [],
      Cancelled: [],
    };
    if (!allowed[batch.status].includes(status)) throw new Error(`Cannot change a ${batch.status} batch to ${status}.`);
    if (status === "Tested" && (actualFineGold === undefined || !Number.isFinite(actualFineGold) || actualFineGold < 0)) throw new Error("Enter a valid actual fine-gold assay result.");
    let movementIds = batch.goldMovementIds;
    let actualWeight = batch.actualFineGold;
    let finalWeight = batch.finalWeight;
    let meltingLoss = batch.meltingLoss;
    let refiningLoss = batch.refiningLoss;
    let finishedStockId = batch.finishedStockId;
    if (status === "Completed") {
      requireRole(["Owner"]);
      if (batch.actualFineGold === undefined || !batch.finalPurity || !Number.isFinite(batch.actualFineGold) || batch.actualFineGold < 0) throw new Error("Record a valid assay result and final purity before completion.");
      if (Math.abs(batch.actualFineGold - batch.expectedFineGold) > 0.001 && batch.notes.trim().length < 3) throw new Error("Add a note explaining the difference between expected and actual fine gold.");
      const finalPurity = gold.purities.find((item) => item.id === batch.finalPurity);
      if (!finalPurity) throw new Error("Choose a configured final purity.");
      actualWeight = batch.actualFineGold;
      finalWeight = batch.actualFineGold / finalPurity.fineness;
      meltingLoss = Math.max(0, batch.expectedFineGold - batch.actualFineGold);
      refiningLoss = Math.max(0, batch.inputNetWeight - finalWeight);
      const movements = gold.recordMetalMovements([
        { date: batch.date, reference: batch.batchNumber, type: "Used in Manufacturing", purityId: batch.inputPurity, weight: batch.inputNetWeight, notes: `Melting input · ${batch.inputReference}` },
        { date: batch.date, reference: batch.batchNumber, type: "Other Gold Received", purityId: batch.finalPurity, weight: finalWeight, notes: `Refined gold output · actual fine gold ${batch.actualFineGold.toFixed(3)} g` },
      ]);
      movementIds = movements.map((movement) => movement.id);
      const finished = addStock({ name: `Refined gold · ${batch.batchNumber}`, purity: batch.finalPurity, weight: finalWeight, making: 0, addedOn: batch.date });
      finishedStockId = finished.id;
    }
    setData((current) => ({
      ...current,
      meltingBatches: current.meltingBatches.map((item) => item.id === id ? {
        ...item,
        status,
        ...(status === "Tested" ? { actualFineGold } : {}),
        ...(status === "Completed" ? { actualFineGold: actualWeight, finalWeight, meltingLoss, refiningLoss, goldMovementIds: movementIds, finishedStockId } : {}),
      } : item),
    }));
    logAudit(`Melting batch ${batch.batchNumber} changed to ${status}`, { module: "Melting", referenceId: id, previousValue: batch.status, newValue: status === "Tested" ? `Actual fine gold ${actualFineGold} g` : status });
  }, [addStock, data.meltingBatches, gold, logAudit]);

  const addAssay = useCallback((input: Omit<AssayRecord, "id" | "testId" | "applied"> & { applyToStock?: boolean }) => {
    requireRole(["Owner", "Accountant"]);
    if (!input.reference.trim() || !input.testedBy.trim() || !input.result.trim() || !dateIsValid(input.date)) throw new Error("Enter the reference, tester, assay result and valid date.");
    requirePositive(input.inputWeight, "Input weight");
    if (!gold.purities.some((purity) => purity.id === input.testedPurity)) throw new Error("Choose a configured tested purity.");
    const { applyToStock, ...assayInput } = input;
    let applied = false;
    if (applyToStock) {
      requireRole(["Owner"]);
      const item = stock.find((candidate) => candidate.id === input.reference || candidate.tag === input.reference);
      if (!item) throw new Error("The referenced stock item was not found.");
      updateStockPurity(item.id, input.testedPurity);
      applied = item.purity !== input.testedPurity;
    }
    const assay: AssayRecord = { ...assayInput, id: uid("ASSAY"), testId: uid("TEST"), applied };
    setData((current) => ({ ...current, assays: [assay, ...current.assays] }));
    logAudit(`Recorded ${input.method} assay ${assay.testId}`, { module: "Assay", referenceId: input.reference, newValue: `${input.testedPurity}; ${input.result}` });
    return assay;
  }, [gold.purities, logAudit, stock, updateStockPurity]);

  const addProductionOrder = useCallback((input: Omit<ProductionOrder, "id" | "orderNumber" | "status" | "createdAt" | "goldCost" | "stoneCost" | "otherCost" | "ledgerJobId" | "finishedStockId"> & { stoneCost: number; otherCost: number }) => {
    requireRole(["Owner", "Staff"]);
    if (!input.product.trim() || !input.sku.trim() || !input.category.trim()) throw new Error("Product, SKU and category are required.");
    requirePositive(input.goldRequired, "Gold required");
    requirePositive(input.expectedWeight, "Expected weight");
    requirePositive(input.expectedWastage, "Expected wastage", true);
    if (input.expectedWastage >= input.goldRequired) throw new Error("Expected wastage must be less than gold required.");
    for (const [value, label] of [[input.labourCost, "Labour"], [input.stoneCost, "Stone"], [input.otherCost, "Other material"]] as const) requirePositive(value, label, true);
    const goldCost = input.goldRequired * goldRateForPurity(settings.rate22, settings.rate18, input.purity, gold.purities);
    const order: ProductionOrder = {
      ...input,
      id: uid("PROD"),
      orderNumber: uid("JOB").toUpperCase(),
      status: "Draft",
      createdAt: DEMO_TODAY,
      goldCost,
      ledgerJobId: undefined,
      finishedStockId: undefined,
    };
    setData((current) => ({ ...current, productionOrders: [order, ...current.productionOrders] }));
    logAudit(`Created production order ${order.orderNumber}`, { module: "Production", referenceId: order.id, newValue: JSON.stringify(order) });
    return order;
  }, [gold.purities, logAudit, settings.rate18, settings.rate22]);

  const advanceProduction = useCallback((id: string, actualWeight?: number, actualWastage?: number) => {
    const order = data.productionOrders.find((item) => item.id === id);
    if (!order) throw new Error("Production order not found.");
    const actorRole = getSession()?.role;
    if (actorRole === "Accountant") throw new Error("Accountants can review production but cannot issue materials or complete jobs.");
    if (order.status === "Draft") {
      const job = gold.issueGold({
        jobNumber: order.orderNumber,
        karigar: order.karigar || "In-house production",
        orderId: "",
        reference: order.orderNumber,
        purityId: order.purity,
        issuedWeight: order.goldRequired,
        allowedWastage: order.expectedWastage,
        date: DEMO_TODAY,
        expectedReturnDate: DEMO_TODAY,
        notes: `Production material issue · ${order.sku}`,
      });
      setData((current) => ({ ...current, productionOrders: current.productionOrders.map((item) => item.id === id ? { ...item, status: "Material Issued", ledgerJobId: job.id } : item) }));
      logAudit(`Issued ${order.goldRequired} g to production order ${order.orderNumber}`, { module: "Production", referenceId: id, newValue: job.id });
      return;
    }
    if (order.status === "Material Issued" || order.status === "In Production") {
      const next: ProductionOrder["status"] = order.status === "Material Issued" ? "In Production" : "Quality Check";
      setData((current) => ({ ...current, productionOrders: current.productionOrders.map((item) => item.id === id ? { ...item, status: next } : item) }));
      logAudit(`Production order ${order.orderNumber} changed to ${next}`, { module: "Production", referenceId: id, previousValue: order.status, newValue: next });
      return;
    }
    if (order.status !== "Quality Check") throw new Error(`Cannot advance a ${order.status} production order.`);
    requireRole(["Owner"]);
    requirePositive(actualWeight ?? 0, "Actual finished weight");
    const wastage = actualWastage ?? order.expectedWastage;
    requirePositive(wastage, "Actual wastage", true);
    if (wastage >= order.goldRequired) throw new Error("Actual wastage must be less than gold issued.");
    const job = order.ledgerJobId ? gold.karigarJobs.find((item) => item.id === order.ledgerJobId) : undefined;
    if (!job) throw new Error("The gold issue job could not be found; production cannot be completed.");
    gold.returnGold({ jobId: job.id, weight: order.goldRequired - wastage, date: DEMO_TODAY, notes: `Production return · ${order.sku}`, final: true, differenceReason: Math.abs(wastage - order.expectedWastage) > 0.001 ? `Actual wastage ${wastage} g` : "" });
    const finished = addStock({ name: order.product, purity: order.purity, weight: actualWeight!, making: order.labourCost, purchaseCost: order.goldCost + order.stoneCost + order.labourCost + order.otherCost, addedOn: DEMO_TODAY });
    setData((current) => ({ ...current, productionOrders: current.productionOrders.map((item) => item.id === id ? { ...item, status: "Completed", actualWeight, actualWastage: wastage, finishedStockId: finished.id } : item) }));
    logAudit(`Completed production order ${order.orderNumber}`, { module: "Production", referenceId: id, newValue: `Finished stock ${finished.tag}; total cost ₹${(order.goldCost + order.stoneCost + order.labourCost + order.otherCost).toFixed(2)}` });
  }, [addStock, data.productionOrders, gold, logAudit]);

  const cancelProduction = useCallback((id: string, reason: string) => {
    requireRole(["Owner"]);
    if (reason.trim().length < 3) throw new Error("Enter a cancellation reason.");
    const order = data.productionOrders.find((item) => item.id === id);
    if (!order || order.status !== "Draft") throw new Error("Only a draft production order can be cancelled before materials are issued.");
    setData((current) => ({ ...current, productionOrders: current.productionOrders.map((item) => item.id === id ? { ...item, status: "Cancelled" } : item) }));
    logAudit(`Cancelled production order ${order.orderNumber}: ${reason.trim()}`, { module: "Production", referenceId: id, previousValue: "Draft", newValue: "Cancelled" });
  }, [data.productionOrders, logAudit]);

  const addQuotation = useCallback((input: Omit<Quotation, "id" | "quotationNumber" | "estimatedTotal" | "status" | "bookingId" | "invoiceId"> & { advance?: number }) => {
    requireRole(["Owner", "Staff"]);
    if (!customers.some((customer) => customer.id === input.customerId)) throw new Error("Select an existing customer.");
    if (!dateIsValid(input.date) || !dateIsValid(input.validUntil) || input.validUntil < input.date) throw new Error("Enter a valid expiry date on or after the quotation date.");
    if (!input.items.length) throw new Error("Add at least one quotation item.");
    for (const item of input.items) {
      if (!item.item.trim() || !Number.isFinite(item.weight) || item.weight <= 0 || !Number.isFinite(item.goldRate) || item.goldRate <= 0) throw new Error("Each quotation item needs a description, positive weight and gold rate.");
      if ([item.making, item.wastage, item.stones, item.other, item.discount, item.gstRate].some((value) => !Number.isFinite(value) || value < 0) || item.wastage > 100 || item.gstRate > 100) throw new Error("Quotation charges, discount and tax must be valid non-negative values; wastage and GST cannot exceed 100%.");
    }
    const total = quotationTotal(input.items);
    if (input.advance !== undefined && (!Number.isFinite(input.advance) || input.advance < 0 || input.advance > total)) throw new Error("Advance must be between zero and the estimate.");
    const quotation: Quotation = { ...input, advance: input.advance ?? 0, id: uid("QUO"), quotationNumber: uid("EST").toUpperCase(), estimatedTotal: total, status: "Draft" };
    setData((current) => ({ ...current, quotations: [quotation, ...current.quotations] }));
    logAudit(`Created quotation ${quotation.quotationNumber}`, { module: "Quotations", referenceId: quotation.id, newValue: `Estimate ₹${total.toFixed(2)}${quotation.lockedRate ? " · rate locked" : ""}` });
    return quotation;
  }, [customers, logAudit]);

  const setQuotationStatus = useCallback((id: string, status: Exclude<Quotation["status"], "Converted">) => {
    requireRole(["Owner", "Staff"]);
    const quotation = data.quotations.find((item) => item.id === id);
    if (!quotation || quotation.status === "Converted") throw new Error("This quotation can no longer be changed.");
    const nextStatus = quotation.validUntil < DEMO_TODAY && status !== "Rejected" ? "Expired" : status;
    setData((current) => ({ ...current, quotations: current.quotations.map((item) => item.id === id ? { ...item, status: nextStatus } : item) }));
    logAudit(`Quotation ${quotation.quotationNumber} changed to ${nextStatus}`, { module: "Quotations", referenceId: id, previousValue: quotation.status, newValue: nextStatus });
  }, [data.quotations, logAudit]);

  const convertQuotationToBooking = useCallback((id: string) => {
    const quotation = data.quotations.find((item) => item.id === id);
    if (!quotation || quotation.status !== "Accepted" || quotation.bookingId || quotation.invoiceId) throw new Error("Only an accepted, unconverted quotation can become a booking.");
    const customer = customers.find((item) => item.id === quotation.customerId);
    if (!customer) throw new Error("Quotation customer not found.");
    const line = quotation.items[0];
    const booking = saveBooking({
      customerId: customer.id,
      reference: quotation.quotationNumber,
      item: line.item,
      category: line.item,
      purity: line.purity,
      goldRate: line.goldRate,
      items: quotation.items,
      weight: line.weight,
      estimatedAmount: quotation.estimatedTotal,
      advance: quotation.advance,
      deliveryDate: quotation.validUntil,
      notes: `Converted from ${quotation.quotationNumber}. Items: ${quotation.items.map((item) => `${item.item} ${item.weight}g ${item.purity}, rate ₹${item.goldRate}/g, making ₹${item.making}, stones ₹${item.stones}, other ₹${item.other}`).join("; ")}`,
      status: "Pending",
    });
    setData((current) => ({ ...current, quotations: current.quotations.map((item) => item.id === id ? { ...item, status: "Converted", bookingId: booking.id } : item) }));
    logAudit(`Converted quotation ${quotation.quotationNumber} to booking ${booking.id}`, { module: "Quotations", referenceId: id, newValue: booking.id });
    return booking.id;
  }, [customers, data.quotations, logAudit, saveBooking]);

  const convertQuotationToInvoice = useCallback((id: string) => {
    const quotation = data.quotations.find((item) => item.id === id);
    if (!quotation || quotation.status !== "Accepted" || quotation.bookingId || quotation.invoiceId) throw new Error("Only an accepted, unconverted quotation can become an invoice.");
    const customer = customers.find((item) => item.id === quotation.customerId);
    if (!customer) throw new Error("Quotation customer not found.");
    const draft: InvoiceDraft = {
      customerId: customer.id,
      date: DEMO_TODAY,
      items: quotation.items.map((item) => ({ name: item.item, weight: item.weight, purity: item.purity, rate: quotation.lockedRate ? item.goldRate : goldRateForPurity(settings.rate22, settings.rate18, item.purity, gold.purities), making: item.making, wastage: item.wastage, other: item.stones + item.other })),
      discount: quotation.items.reduce((sum, item) => sum + item.discount, 0),
      taxRate: quotation.items[0].gstRate,
      makingTaxRate: quotation.items[0].gstRate,
      status: quotation.advance >= quotation.estimatedTotal ? "Paid" : quotation.advance > 0 ? "Partial" : "Unpaid",
      amountPaid: quotation.advance,
      notes: `Converted from quotation ${quotation.quotationNumber}${quotation.lockedRate ? " · quoted gold rate retained" : ""}`,
    };
    const invoice = addInvoice(draft);
    setData((current) => ({ ...current, quotations: current.quotations.map((item) => item.id === id ? { ...item, status: "Converted", invoiceId: invoice.id } : item) }));
    logAudit(`Converted quotation ${quotation.quotationNumber} to invoice ${invoice.id}`, { module: "Quotations", referenceId: id, newValue: invoice.id });
    return invoice.id;
  }, [addInvoice, customers, data.quotations, gold.purities, logAudit, settings.rate18, settings.rate22]);

  const performReversal = useCallback((record: ReversalRecord, decisionBy: string) => {
    const invoice = invoices.find((item) => item.id === record.invoiceId);
    if (!invoice || invoice.cancelledAt) throw new Error("Invoice is unavailable or already reversed.");
    const reversalId = record.reversalReference;
    gold.reverseInvoiceGold(invoice.id, reversalId);
    markInvoiceReversed(invoice.id, reversalId, new Date().toISOString());
    restoreSoldByTags(record.stockTags);
    publishStoneStockRestored(record.stockTags.map((tag) => ({ id: tag, tag })), reversalId);
    logAudit(`Approved full reversal of ${invoice.id}`, { module: "Reversals", referenceId: reversalId, previousValue: `Paid ₹${record.originalPaid}`, newValue: `Reason: ${record.reason}; approval by ${decisionBy}` });
  }, [gold, invoices, logAudit, markInvoiceReversed, restoreSoldByTags]);

  const requestInvoiceReversal = useCallback((id: string, reason: string) => {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.cancelledAt || data.reversals.some((record) => record.invoiceId === id && record.status !== "Rejected")) throw new Error("This invoice has already been reversed or has a pending reversal request.");
    if (reason.trim().length < 3) throw new Error("Enter a reversal reason of at least three characters.");
    const session = getSession();
    if (!session) throw new Error("Sign in before requesting a reversal.");
    if (session.role === "Accountant") throw new Error("Accountants can review reversal records but cannot submit or approve invoice reversals.");
    const record: ReversalRecord = {
      id: uid("REV"),
      originalReference: invoice.id,
      reversalReference: uid("RVS").toUpperCase(),
      reason: reason.trim(),
      requestedBy: session.name,
      requestedAt: new Date().toISOString(),
      status: session.role === "Owner" ? "Approved" : "Pending Approval",
      invoiceId: invoice.id,
      originalPaid: invoice.amountPaid,
      originalBalance: invoiceBalance(invoice),
      reversedGst: invoiceTotals(invoice).tax,
      reversedGoldWeight: invoice.items.reduce((sum, item) => sum + item.weight, 0) - (invoice.oldGold?.weight ?? 0),
      stockTags: invoice.items.map((item) => item.name.match(/RG-T\d+/)?.[0]).filter((tag): tag is string => !!tag),
    };
    if (session.role === "Staff") {
      const approval = requestApproval({ action: "Invoice reversal", module: "Reversals", reference: invoice.id, details: `Invoice ${invoice.id}; paid ₹${invoice.amountPaid.toLocaleString("en-IN")}`, reason: record.reason, payload: { reversalId: record.id } });
      record.approvalId = approval.id;
    } else {
      performReversal(record, session.name);
      record.decisionBy = session.name;
      record.decidedAt = new Date().toISOString();
    }
    setData((current) => ({ ...current, reversals: [record, ...current.reversals] }));
    logAudit(`${session.role === "Owner" ? "Reversed" : "Requested reversal of"} invoice ${invoice.id}`, { module: "Reversals", referenceId: record.reversalReference, newValue: `Reason: ${record.reason}; status ${record.status}` });
    return record;
  }, [data.reversals, invoices, logAudit, performReversal, requestApproval]);

  const decideInvoiceReversal = useCallback((id: string, decision: "Approved" | "Rejected", reason: string) => {
    requireRole(["Owner"]);
    if (decision === "Rejected" && reason.trim().length < 3) throw new Error("Enter a rejection reason.");
    const record = data.reversals.find((item) => item.id === id && item.status === "Pending Approval");
    if (!record) throw new Error("Pending reversal request not found.");
    const approval = approvals.find((item) => item.id === record.approvalId && item.status === "Pending");
    if (approval) {
      decideApproval(approval.id, decision, reason.trim() || record.reason);
      return;
    }
    if (decision === "Approved") performReversal({ ...record, status: "Approved", reason: reason.trim() || record.reason }, getSession()?.name ?? "Owner");
    const decided: ReversalRecord = { ...record, status: decision, reason: reason.trim() || record.reason, decisionBy: getSession()?.name ?? "Owner", decidedAt: new Date().toISOString() };
    setData((current) => ({ ...current, reversals: current.reversals.map((item) => item.id === id ? decided : item) }));
    logAudit(`${decision} invoice reversal ${record.reversalReference}`, { module: "Approvals", referenceId: id, previousValue: record.status, newValue: reason.trim() || record.reason });
  }, [approvals, data.reversals, decideApproval, logAudit, performReversal]);

  useEffect(() => {
    const onDecision = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (!isRecord(detail) || typeof detail.reversalId !== "string" || (detail.decision !== "Approved" && detail.decision !== "Rejected") || typeof detail.reason !== "string") return;
      const record = data.reversals.find((item) => item.id === detail.reversalId && item.status === "Pending Approval");
      if (!record) {
        toast("Approval was recorded, but its pending reversal record could not be found.", "error");
        return;
      }
      try {
        if (detail.decision === "Approved") performReversal({ ...record, status: "Approved", reason: detail.reason || record.reason }, getSession()?.name ?? "Owner");
        const decided: ReversalRecord = { ...record, status: detail.decision, reason: detail.reason || record.reason, decisionBy: getSession()?.name ?? "Owner", decidedAt: new Date().toISOString() };
        setData((current) => ({ ...current, reversals: current.reversals.map((item) => item.id === record.id ? decided : item) }));
        logAudit(`${detail.decision} invoice reversal ${record.reversalReference}`, { module: "Approvals", referenceId: record.id, previousValue: record.status, newValue: detail.reason || record.reason });
      } catch (error) {
        toast(error instanceof Error ? error.message : "Invoice reversal could not be applied.", "error");
        throw error;
      }
    };
    window.addEventListener(INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT, onDecision);
    return () => window.removeEventListener(INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT, onDecision);
  }, [data.reversals, logAudit, performReversal, toast]);

  const updateRisk = useCallback((id: string, change: { state?: RiskAlert["state"]; assignedTo?: string; note?: string }) => {
    requireRole(["Owner"]);
    setData((current) => ({ ...current, riskStates: { ...current.riskStates, [id]: { ...current.riskStates[id], ...change } } }));
    logAudit(`Updated risk alert ${id}`, { module: "Risk Center", referenceId: id, newValue: JSON.stringify(change) });
  }, [logAudit]);

  const riskAlerts = useMemo(() => deriveRiskAlerts({
    auditLogs,
    invoices,
    reconciliations: gold.reconciliations,
    stockAdjustments,
    returns,
    reversals: data.reversals,
    riskStates: data.riskStates,
  }), [auditLogs, data.reversals, data.riskStates, gold.reconciliations, invoices, returns, stockAdjustments]);

  const value = useMemo<AdvancedModulesState>(() => ({
    ...data,
    addMeltingBatch,
    updateMeltingStatus,
    addAssay,
    addProductionOrder,
    advanceProduction,
    cancelProduction,
    addQuotation,
    setQuotationStatus,
    convertQuotationToBooking,
    convertQuotationToInvoice,
    requestInvoiceReversal,
    decideInvoiceReversal,
    updateRisk,
    riskAlerts,
  }), [
    data, addMeltingBatch, updateMeltingStatus, addAssay, addProductionOrder, advanceProduction,
    cancelProduction, addQuotation, setQuotationStatus, convertQuotationToBooking, convertQuotationToInvoice,
    requestInvoiceReversal, decideInvoiceReversal, updateRisk, riskAlerts,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdvancedModules() {
  const context = useContext(Context);
  if (!context) throw new Error("useAdvancedModules must be used inside AdvancedModulesProvider");
  return context;
}
