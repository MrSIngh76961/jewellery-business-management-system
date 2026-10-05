import { addDays, format, parseISO } from "date-fns";
import { DEMO_TODAY } from "./config";
import { invoiceTotals } from "./billing";
import { MONTH_HISTORY, YEAR_HISTORY } from "./seed";
import type { Customer, Invoice } from "./types";

export const invoiceGrand = (i: Invoice) => invoiceTotals(i).grand;
export const invoiceBalance = (i: Invoice) => i.cancelledAt ? 0 : invoiceTotals(i).balance;
export const invoiceGold = (i: Invoice) => i.cancelledAt ? 0 : i.items.reduce((s, x) => s + x.weight, 0);

export function customerStats(c: Customer, invoices: Invoice[]) {
  const mine = invoices.filter((i) => i.customerId === c.id && !i.cancelledAt);
  return {
    invoices: mine,
    purchases: c.priorPurchases + mine.length,
    total: c.priorTotal + mine.reduce((s, i) => s + invoiceGrand(i), 0),
  };
}

export function dashboardStats(invoices: Invoice[], customerCount: number) {
  const month = DEMO_TODAY.slice(0, 7);
  const valid = invoices.filter((invoice) => !invoice.cancelledAt);
  const today = valid.filter((i) => i.date === DEMO_TODAY);
  const monthInv = valid.filter((i) => i.date.startsWith(month));
  const outstanding = valid.reduce((s, i) => s + invoiceBalance(i), 0);
  const pending = valid.filter((i) => i.status !== "Paid").length;
  const sum = (a: Invoice[]) => a.reduce((s, i) => s + invoiceGrand(i), 0);
  const yesterday = format(addDays(parseISO(DEMO_TODAY), -1), "yyyy-MM-dd");
  const yTotal = sum(valid.filter((i) => i.date === yesterday));
  const todayTotal = sum(today);
  return {
    today: todayTotal,
    todayDelta: yTotal ? ((todayTotal - yTotal) / yTotal) * 100 : 0,
    month: sum(monthInv),
    monthInvoices: monthInv.length,
    outstanding,
    pending,
    customers: customerCount,
  };
}

export function dailySeries(invoices: Invoice[], days: number) {
  return Array.from({ length: days }, (_, k) => {
    const d = addDays(parseISO(DEMO_TODAY), k - (days - 1));
    const iso = format(d, "yyyy-MM-dd");
    const day = invoices.filter((i) => i.date === iso && !i.cancelledAt);
    return {
      label: format(d, "dd MMM"),
      short: format(d, "d"),
      sales: day.reduce((s, i) => s + invoiceGrand(i), 0),
      invoices: day.length,
    };
  });
}

export function monthlySeries(invoices: Invoice[]) {
  const live = invoices.filter((i) => i.date.startsWith(DEMO_TODAY.slice(0, 7)) && !i.cancelledAt);
  return [
    ...MONTH_HISTORY,
    {
      label: "Sep",
      sales: live.reduce((s, i) => s + invoiceGrand(i), 0),
      invoices: live.length,
      gold: Math.round(live.reduce((s, i) => s + invoiceGold(i), 0)),
    },
  ];
}

export function yearlySeries(invoices: Invoice[]) {
  const m = monthlySeries(invoices);
  return [
    ...YEAR_HISTORY,
    {
      label: "2026",
      sales: m.reduce((s, x) => s + x.sales, 0),
      invoices: m.reduce((s, x) => s + x.invoices, 0),
      gold: m.reduce((s, x) => s + x.gold, 0),
    },
  ];
}

export function paymentBreakdown(invoices: Invoice[]) {
  const n = invoices.length || 1;
  const count = (s: string) => invoices.filter((i) => !i.cancelledAt && i.status === s).length;
  return ["Paid", "Partial", "Unpaid"].map((status) => ({
    status,
    count: count(status),
    pct: Math.round((count(status) / n) * 100),
  }));
}

export function purityMix(invoices: Invoice[]) {
  const w: Record<string, number> = { "22K": 0, "18K": 0 };
  invoices.forEach((i) => i.items.forEach((x) => (w[x.purity] += x.weight)));
  return Object.entries(w).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

export function topCustomers(customers: Customer[], invoices: Invoice[], n = 6) {
  return customers
    .map((c) => ({ name: c.name.split(" ")[0], full: c.name, total: customerStats(c, invoices).total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}
