"use client";

import { Download, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { invoicesCsv } from "@/lib/exports";
import { paginate, useReady } from "@/lib/hooks";
import { cn, downloadFile } from "@/lib/utils";

const SIZE = 8;

export default function InvoicesPage() {
  const { invoices } = useApp();
  const toast = useToast();
  const ready = useReady(250);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  if (!ready) return <PageSkeleton />;

  const term = q.trim().toLowerCase();
  const filtered = invoices.filter(
    (i) =>
      `${i.id} ${i.customerName} ${i.customerMobile}`.toLowerCase().includes(term) &&
      (!status || i.status === status) &&
      (!from || i.date >= from) &&
      (!to || i.date <= to),
  );
  const { rows, pages, current } = paginate(filtered, page, SIZE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Invoices" subtitle="Search, view, edit, print and share invoices.">
        <Button
          onClick={() => {
            downloadFile("reinsoft-gold-invoices.csv", invoicesCsv(filtered));
            toast(`Exported ${filtered.length} invoices to CSV`);
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Link href="/billing/new" className={buttonClass("primary")}>
          <Plus className="h-4 w-4" /> New Invoice
        </Link>
      </PageHeader>
      <Card>
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_170px_160px_160px]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input aria-label="Search invoices" value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search invoice or customer…" className={cn(controlClass, "pl-9")} />
          </div>
          <select aria-label="Filter by status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} className={cn(controlClass, "cursor-pointer")}>
            <option value="">All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Unpaid</option>
          </select>
          <input aria-label="From date" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} className={controlClass} />
          <input aria-label="To date" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} className={controlClass} />
        </div>
        <InvoiceTable invoices={rows} />
        <Pagination page={current} pages={pages} total={filtered.length} size={SIZE} onChange={setPage} />
      </Card>
    </>
  );
}
