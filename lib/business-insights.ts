import { invoiceTotals } from "./billing";
import type { GoldReconciliation, MetalPurity } from "./gold-accounting";
import type { Invoice, StockItem } from "./types";

export type InsightSeverity = "Positive" | "Warning" | "Critical" | "Information";
export type InsightType = "Sales" | "Inventory" | "Reconciliation";

export interface BusinessInsight {
  id: string;
  type: InsightType;
  metric: string;
  comparison: string;
  dateRange: string;
  source: string;
  severity: InsightSeverity;
}

function shiftDay(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function labelRange(from: string, to: string) {
  return `${from} to ${to}`;
}

export function buildBusinessInsights(input: {
  invoices: Invoice[];
  stock: StockItem[];
  reconciliations: GoldReconciliation[];
  purities: MetalPurity[];
  referenceDate: string;
}): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const currentFrom = shiftDay(input.referenceDate, -29);
  const previousFrom = shiftDay(input.referenceDate, -59);
  const previousTo = shiftDay(input.referenceDate, -30);
  const currentInvoices = input.invoices.filter((invoice) => !invoice.cancelledAt && invoice.date >= currentFrom && invoice.date <= input.referenceDate);
  const previousInvoices = input.invoices.filter((invoice) => !invoice.cancelledAt && invoice.date >= previousFrom && invoice.date <= previousTo);

  if (currentInvoices.length >= 5 && previousInvoices.length >= 5) {
    const currentSales = currentInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).grand, 0);
    const previousSales = previousInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).grand, 0);
    const currentAverage = currentSales / currentInvoices.length;
    const previousAverage = previousSales / previousInvoices.length;
    if (previousSales > 0 && Number.isFinite(currentSales)) {
      const percent = ((currentSales - previousSales) / previousSales) * 100;
      insights.push({
        id: "rolling-sales",
        type: "Sales",
        metric: `${percent >= 0 ? "Sales increased" : "Sales decreased"} ${Math.abs(percent).toFixed(1)}%`,
        comparison: `₹${Math.round(currentSales).toLocaleString("en-IN")} vs ₹${Math.round(previousSales).toLocaleString("en-IN")}`,
        dateRange: `${labelRange(currentFrom, input.referenceDate)} vs ${labelRange(previousFrom, previousTo)}`,
        source: "Invoices",
        severity: percent >= 0 ? "Positive" : "Warning",
      });
    }
    if (previousAverage > 0 && Number.isFinite(currentAverage)) {
      const percent = ((currentAverage - previousAverage) / previousAverage) * 100;
      insights.push({
        id: "average-invoice-value",
        type: "Sales",
        metric: `Average invoice value ${percent >= 0 ? "increased" : "decreased"} ${Math.abs(percent).toFixed(1)}%`,
        comparison: `₹${Math.round(currentAverage).toLocaleString("en-IN")} vs ₹${Math.round(previousAverage).toLocaleString("en-IN")}`,
        dateRange: `${labelRange(currentFrom, input.referenceDate)} vs ${labelRange(previousFrom, previousTo)}`,
        source: "Invoices",
        severity: percent >= 0 ? "Positive" : "Information",
      });
    }
  }

  const agedStock = input.stock.filter((item) => {
    if (item.status !== "In Stock") return false;
    const age = Math.floor((Date.parse(`${input.referenceDate}T00:00:00Z`) - Date.parse(`${item.addedOn}T00:00:00Z`)) / 86_400_000);
    return Number.isFinite(age) && age > 180;
  });
  if (agedStock.length) {
    insights.push({
      id: "aged-stock",
      type: "Inventory",
      metric: `${agedStock.length} unsold ${agedStock.length === 1 ? "item" : "items"} are older than 180 days`,
      comparison: `${agedStock.reduce((sum, item) => sum + item.weight, 0).toFixed(3)} g currently in stock`,
      dateRange: `As of ${input.referenceDate}`,
      source: "Stock",
      severity: "Warning",
    });
  }

  const latestByPurity = new Map<string, GoldReconciliation>();
  for (const record of [...input.reconciliations].sort((a, b) => b.date.localeCompare(a.date))) {
    if (!latestByPurity.has(record.purityId)) latestByPurity.set(record.purityId, record);
  }
  for (const record of latestByPurity.values()) {
    if (Math.abs(record.difference) <= 0.001) continue;
    const purity = input.purities.find((item) => item.id === record.purityId)?.name ?? record.purityId;
    insights.push({
      id: `gold-variance-${record.purityId}`,
      type: "Reconciliation",
      metric: `${purity} physical reconciliation differs by ${record.difference > 0 ? "+" : ""}${record.difference.toFixed(3)} g`,
      comparison: `System ${record.systemStock.toFixed(3)} g · Physical ${record.physicalStock.toFixed(3)} g`,
      dateRange: `Reconciled ${record.date}`,
      source: "Gold Accounting",
      severity: "Warning",
    });
  }

  return insights;
}
