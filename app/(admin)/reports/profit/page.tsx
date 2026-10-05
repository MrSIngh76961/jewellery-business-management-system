"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { calcInvoice, calcItem } from "@/lib/billing";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate, money, num } from "@/lib/format";
import { invoiceGrand } from "@/lib/selectors";
import { toCsv, downloadFile } from "@/lib/utils";

const dateDaysAgo = (days: number) => {
  const date = new Date(`${DEMO_TODAY}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export default function ProfitReportPage() {
  const { invoices } = useApp();
  const { purchases, returns, expenses } = useOperations();
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState(`${DEMO_TODAY.slice(0, 7)}-01`);
  const [to, setTo] = useState(DEMO_TODAY);
  const [error, setError] = useState("");
  const chosen = useMemo(() => {
    if (range === "today") return { from: DEMO_TODAY, to: DEMO_TODAY };
    if (range === "week") return { from: dateDaysAgo(6), to: DEMO_TODAY };
    if (range === "month") return { from: `${DEMO_TODAY.slice(0, 7)}-01`, to: DEMO_TODAY };
    if (range === "year") return { from: `${DEMO_TODAY.slice(0, 4)}-01-01`, to: DEMO_TODAY };
    return { from, to };
  }, [range, from, to]);
  const validRange = chosen.from <= chosen.to;
  const inside = (date: string) => validRange && date >= chosen.from && date <= chosen.to;
  const sales = invoices.filter((invoice) => inside(invoice.date));
  const returnsInRange = returns.filter((record) => inside(record.date));
  const expensesInRange = expenses.filter((expense) => inside(expense.date));
  const salesRevenue = sales.reduce((sum, invoice) => sum + invoiceGrand(invoice), 0);
  const discounts = sales.reduce((sum, invoice) => sum + invoice.discount, 0);
  const making = sales.reduce((sum, invoice) => sum + invoice.items.reduce((subtotal, item) => subtotal + item.making + item.other, 0), 0);
  const refundTotal = returnsInRange.reduce((sum, record) => sum + record.refund, 0);
  const expenseTotal = expensesInRange.reduce((sum, expense) => sum + expense.amount, 0);
  const costByProduct = new Map<string, { weight: number; total: number }>();
  purchases.forEach((purchase) => {
    const key = `${purchase.item.trim().toLowerCase()}|${purchase.purity}`;
    const value = costByProduct.get(key) ?? { weight: 0, total: 0 };
    value.weight += purchase.netWeight;
    value.total += purchase.total;
    costByProduct.set(key, value);
  });
  const itemRows = sales.flatMap((invoice) => {
    const totals = calcInvoice(invoice);
    return invoice.items.map((item) => {
      const key = `${item.name.trim().toLowerCase()}|${item.purity}`;
      const productCost = costByProduct.get(key);
      const unitCost = productCost && productCost.weight > 0 ? productCost.total / productCost.weight : undefined;
      const cost = unitCost === undefined ? undefined : item.weight * unitCost;
      const line = calcItem(item);
      const scale = totals.subtotal > 0 ? (totals.subtotal - totals.discount) / totals.subtotal : 1;
      const goldPart = Math.min(line.goldValue + line.wastageAmount, line.total);
      const makingPart = line.total - goldPart;
      const taxes = Math.round(goldPart * scale * invoice.taxRate / 100) + Math.round(makingPart * scale * (invoice.makingTaxRate ?? invoice.taxRate) / 100);
      const oldGoldCredit = totals.subtotal > 0 ? totals.oldGold * line.total / totals.subtotal : 0;
      const lineRevenue = Math.round(line.total * scale + taxes - oldGoldCredit);
      return { id: `${invoice.id}-${item.id}`, invoiceId: invoice.id, date: invoice.date, customer: invoice.customerName, item: item.name, purity: item.purity, weight: item.weight, revenue: lineRevenue, cost, profit: cost === undefined ? undefined : lineRevenue - cost };
    });
  });
  const unavailableCount = itemRows.filter((row) => row.cost === undefined).length;
  const knownCost = itemRows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const matchedRevenue = itemRows.filter((row) => row.cost !== undefined).reduce((sum, row) => sum + row.revenue, 0);
  const estimatedGross = matchedRevenue - knownCost - refundTotal;
  const netProfit = estimatedGross - expenseTotal;
  const totalWeight = itemRows.reduce((sum, row) => sum + row.weight, 0);
  const margin = matchedRevenue > 0 ? estimatedGross / matchedRevenue * 100 : 0;
  const incomplete = unavailableCount > 0;
  const exportCsv = () => {
    downloadFile("reinsoft-gold-profit-analysis.csv", toCsv(itemRows, [
      { header: "Invoice", value: (row) => row.invoiceId }, { header: "Date", value: (row) => row.date }, { header: "Customer", value: (row) => row.customer }, { header: "Item", value: (row) => row.item }, { header: "Purity", value: (row) => row.purity }, { header: "Weight (g)", value: (row) => row.weight }, { header: "Revenue (INR)", value: (row) => row.revenue }, { header: "Known cost (INR)", value: (row) => row.cost ?? "Not available" }, { header: "Estimated profit (INR)", value: (row) => row.profit ?? "Not available" },
    ]));
  };
  const applyPreset = (value: string) => { setError(""); setRange(value); };

  return <>
    <PageHeader title="Profit & Margin" subtitle="Cost-backed analysis only; transactions without a matching recorded purchase cost are explicitly excluded from profit totals."><Button onClick={exportCsv}>Export detail</Button><Link href="/reports" className={buttonClass()}>Sales Reports</Link></PageHeader>
    <Card className="mb-4"><div className="grid items-end gap-3 sm:grid-cols-[1fr_180px_180px]"><Select label="Period" value={range} onChange={(e) => applyPreset(e.target.value)}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option></Select><Input label="From" type="date" disabled={range !== "custom"} value={from} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" disabled={range !== "custom"} value={to} onChange={(e) => setTo(e.target.value)} /></div>{range === "custom" && from > to && <p role="alert" className="mt-2 text-xs text-danger">Start date must be on or before end date.</p>}{error && <p className="mt-2 text-xs text-danger">{error}</p>}<p className="mt-3 text-xs text-muted">Showing {fmtDate(chosen.from)} – {fmtDate(chosen.to)} · Sales are matched to recorded purchase cost by item name and purity; absent cost is never assumed to be zero.</p></Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Sales revenue" value={salesRevenue} format={money} sub={`${sales.length} invoices`} />
      <StatCard label="Purchase cost (matched)" value={knownCost} format={money} sub={`${itemRows.length - unavailableCount} of ${itemRows.length} lines`} delay={0.05} />
      <StatCard label="Making charges" value={making} format={money} sub="Before expenses" delay={0.1} />
      <StatCard label="Discounts" value={discounts} format={money} sub="Invoice discounts" delay={0.15} />
      <StatCard label="Returns / refunds" value={refundTotal} format={money} sub={`${returnsInRange.length} return records`} delay={0.2} />
      <StatCard label="Expenses" value={expenseTotal} format={money} sub={`${expensesInRange.length} expense entries`} delay={0.25} />
      <StatCard label="Estimated gross profit" value={estimatedGross} format={money} sub={incomplete ? `Partial · ${unavailableCount} item costs unavailable` : "All sold item costs matched"} delay={0.3} />
      <StatCard label="Net profit / margin" value={netProfit} format={money} sub={incomplete ? "Partial cost coverage; not final" : `${margin.toFixed(1)}% margin`} delay={0.35} />
    </div>
    <Card className="mt-4"><CardHead title="Invoice and item level cost coverage"><Badge tone={incomplete ? "Partial" : "Paid"}>{incomplete ? "Estimated · incomplete costs" : "Cost matched"}</Badge></CardHead>
      {incomplete && <p className="mb-3 rounded-lg bg-[#fff0d1] px-3 py-2 text-xs text-[#805c1e]">Profit figures are partial because {unavailableCount} sold item line(s) have no matching supplier purchase cost. Unmatched lines are marked unavailable and are not treated as zero-cost sales.</p>}
      <SimpleTable rows={itemRows} rowKey={(row) => row.id} empty="No invoices in this date range." columns={[
        { head: "Invoice / date", cell: (row) => <span><Link href={`/invoices/${encodeURIComponent(row.invoiceId)}`} className="font-semibold text-brand underline">{row.invoiceId}</Link><small className="block text-muted">{fmtDate(row.date)}</small></span> },
        { head: "Item", cell: (row) => <span>{row.item}<small className="block text-muted">{row.customer}</small></span> }, { head: "Purity / weight", cell: (row) => `${row.purity} · ${num(row.weight)} g` },
        { head: "Sales revenue", cell: (row) => money(row.revenue) }, { head: "Cost", cell: (row) => row.cost === undefined ? <Badge tone="Partial">Not available</Badge> : money(row.cost) },
        { head: "Estimated profit", cell: (row) => row.profit === undefined ? "Not available" : money(row.profit) },
      ]} />
      <p className="mt-3 text-xs text-muted">Matched weight {num(totalWeight)} g · Net profit is gross estimate minus recorded expenses. This report is operational guidance, not a statutory accounting statement.</p>
    </Card>
  </>;
}
