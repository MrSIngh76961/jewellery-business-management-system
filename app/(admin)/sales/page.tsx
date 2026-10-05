"use client";

import { Download, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { salesCsv } from "@/lib/exports";
import { moneyCompact } from "@/lib/format";
import { paginate, useReady } from "@/lib/hooks";
import { invoiceBalance, invoiceGrand } from "@/lib/selectors";
import { cn, downloadFile } from "@/lib/utils";

const SIZE = 8;

export default function SalesPage() {
  const { invoices, customers } = useApp();
  const toast = useToast();
  const ready = useReady(250);
  const [f, setF] = useState({ q: "", invoice: "", customer: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  if (!ready) return <PageSkeleton />;

  const set = (k: keyof typeof f) => (v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    setPage(1);
  };

  const month = DEMO_TODAY.slice(0, 7);
  const sum = (a: typeof invoices, fn: (i: (typeof invoices)[number]) => number) => a.reduce((s, i) => s + fn(i), 0);
  const monthInv = invoices.filter((i) => i.date.startsWith(month));

  const term = f.q.trim().toLowerCase();
  const filtered = invoices.filter(
    (i) =>
      `${i.id} ${i.customerName} ${i.customerMobile}`.toLowerCase().includes(term) &&
      (!f.invoice || i.id.toLowerCase().includes(f.invoice.trim().toLowerCase())) &&
      (!f.customer || i.customerId === f.customer) &&
      (!f.status || i.status === f.status) &&
      (!f.from || i.date >= f.from) &&
      (!f.to || i.date <= f.to),
  );
  const { rows, pages, current } = paginate(filtered, page, SIZE);

  return (
    <>
      <PageHeader title="Sales History" subtitle="All sales transactions with date and payment status.">
        <Button
          onClick={() => {
            downloadFile("reinsoft-gold-sales.csv", salesCsv(filtered));
            toast(`CSV export downloaded (${filtered.length} transactions)`);
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={sum(invoices.filter((i) => i.date === DEMO_TODAY), invoiceGrand)} format={moneyCompact} sub="Sales today" />
        <StatCard label="Monthly Sales" value={sum(monthInv, invoiceGrand)} format={moneyCompact} sub="This month" delay={0.05} />
        <StatCard label="Paid" value={sum(monthInv, (i) => invoiceGrand(i) - invoiceBalance(i))} format={moneyCompact} sub="Collected" delay={0.1} trend="up" />
        <StatCard label="Outstanding" value={sum(invoices, invoiceBalance)} format={moneyCompact} sub="Yet to collect" delay={0.15} trend="down" />
      </div>

      <Card className="mt-4" delay={0.1}>
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input aria-label="Search transactions" value={f.q} onChange={(e) => set("q")(e.target.value)} placeholder="Search transactions…" className={cn(controlClass, "pl-9")} />
          </div>
          <input aria-label="Filter by invoice number" value={f.invoice} onChange={(e) => set("invoice")(e.target.value)} placeholder="Invoice no. (e.g. 0045)" className={controlClass} />
          <select aria-label="Filter by customer" value={f.customer} onChange={(e) => set("customer")(e.target.value)} className={cn(controlClass, "cursor-pointer")}>
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select aria-label="Filter by payment status" value={f.status} onChange={(e) => set("status")(e.target.value)} className={cn(controlClass, "cursor-pointer")}>
            <option value="">All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Unpaid</option>
          </select>
          <input aria-label="From date" type="date" value={f.from} onChange={(e) => set("from")(e.target.value)} className={controlClass} />
          <input aria-label="To date" type="date" value={f.to} onChange={(e) => set("to")(e.target.value)} className={controlClass} />
          <Button className="sm:col-span-2" onClick={() => { setF({ q: "", invoice: "", customer: "", status: "", from: "", to: "" }); setPage(1); }}>
            Clear filters
          </Button>
        </div>
        <InvoiceTable invoices={rows} />
        <Pagination page={current} pages={pages} total={filtered.length} size={SIZE} onChange={setPage} />
      </Card>
    </>
  );
}
