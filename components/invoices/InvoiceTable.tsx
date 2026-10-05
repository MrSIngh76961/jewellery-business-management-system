"use client";

import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { fmtDate, money } from "@/lib/format";
import { invoiceGrand } from "@/lib/selectors";
import type { Invoice } from "@/lib/types";
import { InvoiceActions } from "./InvoiceActions";

export const TH = "px-2.5 py-2.5 text-left text-[11px] font-semibold tracking-wider text-[#7a807a] uppercase border-b border-line whitespace-nowrap";
export const TD = "px-2.5 py-3.5 text-[13px]";

export function InvoiceTable({ invoices, onRowClick }: { invoices: Invoice[]; onRowClick?: (i: Invoice) => void }) {
  const { openInvoice } = useApp();
  const open = onRowClick ?? ((i: Invoice) => openInvoice(i.id));
  if (!invoices.length) return <EmptyState>No invoices match your filters.</EmptyState>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th className={TH}>Invoice</th>
            <th className={TH}>Customer</th>
            <th className={TH}>Date</th>
            <th className={TH}>Amount</th>
            <th className={TH}>Status</th>
            <th className={TH}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i, idx) => (
            <motion.tr
              key={i.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx, 8) * 0.03 }}
              onClick={() => open(i)}
              className="cursor-pointer border-b border-[#eee9de] transition-colors last:border-0 hover:bg-cream/70"
            >
              <td className={TD}>
                <b>{i.id}</b>
              </td>
              <td className={TD}>{i.customerName}</td>
              <td className={`${TD} whitespace-nowrap`}>{fmtDate(i.date)}</td>
              <td className={TD}>
                <b>{money(invoiceGrand(i))}</b>
              </td>
              <td className={TD}>
                {i.cancelledAt ? <Badge tone="Unpaid">Cancelled</Badge> : <StatusBadge status={i.status} />}
              </td>
              <td className={TD} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={() => open(i)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <InvoiceActions invoice={i} variant="row" hideEdit={!!i.cancelledAt} />
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
