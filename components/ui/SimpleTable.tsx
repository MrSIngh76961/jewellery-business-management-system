"use client";

import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/Card";
import { useI18n } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export const TH = "px-2.5 py-2.5 text-left text-[11px] font-semibold tracking-wider text-[#7a807a] uppercase border-b border-line whitespace-nowrap";
export const TD = "px-2.5 py-3.5 text-[13px]";

export interface Column<T> {
  head: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function SimpleTable<T>({ columns, rows, rowKey, empty = "Nothing to show yet.", minWidth = 680 }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; empty?: string; minWidth?: number }) {
  const { t } = useI18n();
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.head} className={cn(TH, c.className)}>
                {t(c.head)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={rowKey(r)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.02 }} className="border-b border-[#f0ebdf] transition-colors hover:bg-cream/70">
              {columns.map((c) => (
                <td key={c.head} className={cn(TD, c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
