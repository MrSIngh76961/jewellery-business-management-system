"use client";

import { motion } from "framer-motion";
import { FilePlus2, History, Pencil, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass, Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/Card";
import { TD, TH } from "@/components/invoices/InvoiceTable";
import { money } from "@/lib/format";
import { customerStats } from "@/lib/selectors";
import type { Customer, Invoice } from "@/lib/types";

export function CustomerTable({ customers, invoices, onEdit, onHistory }: { customers: Customer[]; invoices: Invoice[]; onEdit: (c: Customer) => void; onHistory: (c: Customer) => void }) {
  const router = useRouter();
  if (!customers.length) return <EmptyState>No customers match your search.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            {["ID", "Customer", "Mobile", "Purchases", "Total", "Actions"].map((h) => (
              <th key={h} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => {
            const s = customerStats(c, invoices);
            return (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                onClick={() => router.push(`/customers/${c.id}`)}
                className="cursor-pointer border-b border-[#eee9de] transition-colors last:border-0 hover:bg-cream/70"
              >
                <td className={TD}>{c.id}</td>
                <td className={TD}>
                  <b>{c.name}</b>
                </td>
                <td className={`${TD} whitespace-nowrap`}>{c.mobile}</td>
                <td className={TD}>{s.purchases}</td>
                <td className={TD}>
                  <b>{money(s.total)}</b>
                </td>
                <td className={TD} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/customers/${c.id}`} className={buttonClass("secondary", "sm")}>
                      <UserRound className="h-3.5 w-3.5" /> View
                    </Link>
                    <Tooltip label="Purchase history">
                      <Button size="sm" onClick={() => onHistory(c)}>
                        <History className="h-3.5 w-3.5" /> History
                      </Button>
                    </Tooltip>
                    <Tooltip label="Edit customer">
                      <Button size="sm" aria-label={`Edit ${c.name}`} onClick={() => onEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </Tooltip>
                    <Link href={`/billing/new?customer=${c.id}`} className={buttonClass("secondary", "sm")}>
                      <FilePlus2 className="h-3.5 w-3.5" /> New Bill
                    </Link>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
