import type { Invoice } from "./types";
import type { Purchase, SalesReturn, StockAdjustment } from "./operations";
import type { StockItem } from "./types";
import { calculateGoldMetricsAtFineness, purityFineness } from "./purity";

export interface MetalPurity {
  id: string;
  name: string;
  fineness: number;
}

export const DEFAULT_METAL_PURITIES: MetalPurity[] = [
  { id: "24K", name: "24K", fineness: 1 },
  { id: "22K", name: "22K", fineness: purityFineness("22K") },
  { id: "18K", name: "18K", fineness: purityFineness("18K") },
];

export type MetalTransactionType =
  | "Purchase"
  | "Old Gold Received"
  | "Return Received"
  | "Karigar Return"
  | "Other Gold Received"
  | "Sale"
  | "Karigar Issue"
  | "Used in Manufacturing"
  | "Gold Loss / Wastage"
  | "Adjustment"
  | "Reversal";

export interface MetalTransaction {
  id: string;
  date: string;
  reference: string;
  type: MetalTransactionType;
  purityId: string;
  weight: number;
  signedWeight: number;
  fineGoldWeight: number;
  signedFineGoldWeight: number;
  actor: string;
  notes: string;
  grossWeight?: number;
  netWeight?: number;
  fineGoldPercentage?: number;
  equivalent22K?: number;
  equivalent18K?: number;
  source: "Purchase" | "Invoice" | "Return" | "Karigar" | "Stock" | "Manual" | "Reconciliation" | "Reversal";
  sourceId?: string;
  jobId?: string;
}

export interface KarigarJob {
  id: string;
  jobNumber: string;
  karigar: string;
  karigarId: string;
  orderId: string;
  reference: string;
  purityId: string;
  issuedTransactionId: string;
  issuedWeight: number;
  allowedWastage: number;
  issueDate: string;
  expectedReturnDate: string;
  notes: string;
  status: "Open" | "Returned" | "Review";
}

export interface GoldOpeningBalance {
  purityId: string;
  date: string;
  weight: number;
}

export interface GoldReconciliation {
  id: string;
  date: string;
  purityId: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason: string;
  actor: string;
  adjustmentTransactionId?: string;
}

export interface GoldAccountingData {
  purities: MetalPurity[];
  openingBalances: GoldOpeningBalance[];
  transactions: MetalTransaction[];
  karigarJobs: KarigarJob[];
  reconciliations: GoldReconciliation[];
}

export const emptyGoldAccounting: GoldAccountingData = {
  purities: DEFAULT_METAL_PURITIES,
  openingBalances: [],
  transactions: [],
  karigarJobs: [],
  reconciliations: [],
};

export function purityFor(purities: MetalPurity[], id: string) {
  return purities.find((purity) => purity.id === id);
}

function sourceTransaction(input: {
  id: string;
  date: string;
  reference: string;
  type: MetalTransactionType;
  purityId: string;
  weight: number;
  sign: 1 | -1;
  fineness: number;
  source: MetalTransaction["source"];
  sourceId?: string;
  jobId?: string;
  grossWeight?: number;
  actor?: string;
  notes?: string;
}): MetalTransaction {
  const signedWeight = input.weight * input.sign;
  const metrics = calculateGoldMetricsAtFineness(input.grossWeight ?? input.weight, input.weight, input.purityId, input.fineness);
  const fineGoldWeight = metrics.fineGoldWeight;
  return {
    id: input.id,
    date: input.date,
    reference: input.reference,
    type: input.type,
    purityId: input.purityId,
    weight: input.weight,
    signedWeight,
    fineGoldWeight,
    signedFineGoldWeight: fineGoldWeight * input.sign,
    actor: input.actor ?? "System",
    notes: input.notes ?? "",
    grossWeight: metrics.grossWeight,
    netWeight: metrics.netWeight,
    fineGoldPercentage: metrics.fineGoldPercentage,
    equivalent22K: metrics.equivalent22K,
    equivalent18K: metrics.equivalent18K,
    source: input.source,
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.jobId ? { jobId: input.jobId } : {}),
  };
}

export function deriveMetalTransactions(input: {
  purchases: Purchase[];
  invoices: Invoice[];
  returns: SalesReturn[];
  stockAdjustments: StockAdjustment[];
  stockItems: StockItem[];
  recorded: MetalTransaction[];
  purities: MetalPurity[];
}): MetalTransaction[] {
  const events: MetalTransaction[] = [...input.recorded];
  const fineness = (id: string) => purityFor(input.purities, id)?.fineness ?? 0;

  for (const purchase of input.purchases) {
    events.push(sourceTransaction({
      id: `PUR-${purchase.id}`,
      date: purchase.date,
      reference: purchase.invoiceNo,
      type: "Purchase",
      purityId: purchase.purity,
      weight: purchase.netWeight,
      grossWeight: purchase.grossWeight,
      sign: 1,
      fineness: fineness(purchase.purity),
      source: "Purchase",
      sourceId: purchase.id,
      notes: purchase.item,
    }));
  }

  for (const invoice of input.invoices) {
    invoice.items.forEach((item) => events.push(sourceTransaction({
      id: `SALE-${invoice.id}-${item.id}`,
      date: invoice.date,
      reference: invoice.id,
      type: "Sale",
      purityId: item.purity,
      weight: item.weight,
      sign: -1,
      fineness: fineness(item.purity),
      source: "Invoice",
      sourceId: invoice.id,
      notes: item.name,
    })));
    if (invoice.oldGold && invoice.oldGold.weight > 0) {
      events.push(sourceTransaction({
        id: `OLDGOLD-${invoice.id}`,
        date: invoice.date,
        reference: invoice.id,
        type: "Old Gold Received",
        purityId: invoice.oldGold.purity,
        weight: invoice.oldGold.weight,
        sign: 1,
        fineness: fineness(invoice.oldGold.purity),
        source: "Invoice",
        sourceId: invoice.id,
        notes: invoice.oldGold.description || "Old gold exchange",
      }));
    }
  }

  for (const record of input.returns) {
    events.push(sourceTransaction({
      id: `RETURN-${record.id}`,
      date: record.date,
      reference: record.id,
      type: "Return Received",
      purityId: record.purity,
      weight: record.weight,
      sign: 1,
      fineness: fineness(record.purity),
      source: "Return",
      sourceId: record.id,
      notes: `${record.item} · ${record.reason}`,
    }));
  }

  for (const adjustment of input.stockAdjustments) {
    const stockItem = input.stockItems.find((item) => item.id === adjustment.stockItemId);
    if (!stockItem || Math.abs(adjustment.difference) <= 0.0001) continue;
    events.push(sourceTransaction({
      id: `STOCK-${adjustment.id}`,
      date: adjustment.date.slice(0, 10),
      reference: adjustment.tag,
      type: "Adjustment",
      purityId: stockItem.purity,
      weight: Math.abs(adjustment.difference),
      sign: adjustment.difference > 0 ? 1 : -1,
      fineness: fineness(stockItem.purity),
      source: "Stock",
      sourceId: adjustment.id,
      actor: adjustment.actor,
      notes: `${adjustment.reason} · ${adjustment.item}`,
    }));
  }

  return events.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function karigarReturnedWeight(jobId: string, transactions: MetalTransaction[]) {
  return transactions
    .filter((transaction) => transaction.jobId === jobId && transaction.type === "Karigar Return")
    .reduce((sum, transaction) => sum + transaction.weight, 0);
}

export function karigarActualWastage(job: KarigarJob, transactions: MetalTransaction[]) {
  return Math.max(0, job.issuedWeight - karigarReturnedWeight(job.id, transactions));
}

export function karigarDifference(job: KarigarJob, transactions: MetalTransaction[]) {
  return karigarActualWastage(job, transactions) - job.allowedWastage;
}

export function karigarPendingGold(job: KarigarJob, transactions: MetalTransaction[]) {
  const returned = karigarReturnedWeight(job.id, transactions);
  return job.status === "Open"
    ? Math.max(0, job.issuedWeight - returned)
    : Math.max(0, karigarDifference(job, transactions));
}

export function balanceAt(
  opening: GoldOpeningBalance | undefined,
  transactions: MetalTransaction[],
  purityId: string,
  throughDate: string,
) {
  if (opening && opening.date > throughDate) return 0;
  const startingWeight = opening?.purityId === purityId ? opening.weight : 0;
  return startingWeight + transactions
    .filter((transaction) => transaction.purityId === purityId && transaction.date <= throughDate && (!opening || transaction.date >= opening.date))
    .reduce((sum, transaction) => sum + transaction.signedWeight, 0);
}
