import { invoiceTotals } from "./billing";
import { fmtDate } from "./format";
import { customerStats } from "./selectors";
import { toCsv } from "./utils";
import type { Customer, Invoice } from "./types";

export const invoicesCsv = (rows: Invoice[]) =>
  toCsv(rows, [
    { header: "Invoice", value: (i) => i.id },
    { header: "Customer", value: (i) => i.customerName },
    { header: "Mobile", value: (i) => i.customerMobile },
    { header: "Date", value: (i) => fmtDate(i.date) },
    { header: "Items", value: (i) => i.items.map((x) => `${x.name} (${x.weight}g ${x.purity})`).join("; ") },
    { header: "Subtotal", value: (i) => invoiceTotals(i).subtotal },
    { header: "Discount", value: (i) => invoiceTotals(i).discount },
    { header: "Tax", value: (i) => invoiceTotals(i).tax },
    { header: "Amount", value: (i) => invoiceTotals(i).grand },
    { header: "Paid", value: (i) => invoiceTotals(i).paid },
    { header: "Balance", value: (i) => invoiceTotals(i).balance },
    { header: "Status", value: (i) => i.status },
  ]);

export const salesCsv = (rows: Invoice[]) =>
  toCsv(rows, [
    { header: "Date", value: (i) => fmtDate(i.date) },
    { header: "Invoice", value: (i) => i.id },
    { header: "Customer", value: (i) => i.customerName },
    { header: "Gold (g)", value: (i) => Math.round(i.items.reduce((s, x) => s + x.weight, 0) * 100) / 100 },
    { header: "Amount", value: (i) => invoiceTotals(i).grand },
    { header: "Paid", value: (i) => invoiceTotals(i).paid },
    { header: "Balance", value: (i) => invoiceTotals(i).balance },
    { header: "Status", value: (i) => i.status },
  ]);

export const customersCsv = (rows: Customer[], invoices: Invoice[]) =>
  toCsv(rows, [
    { header: "Customer ID", value: (c) => c.id },
    { header: "Name", value: (c) => c.name },
    { header: "Mobile", value: (c) => c.mobile },
    { header: "Email", value: (c) => c.email },
    { header: "Address", value: (c) => c.address },
    { header: "Purchases", value: (c) => customerStats(c, invoices).purchases },
    { header: "Total Purchase", value: (c) => customerStats(c, invoices).total },
  ]);
