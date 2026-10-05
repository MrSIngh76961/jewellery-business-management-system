"use client";

import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TD, TH } from "@/components/invoices/InvoiceTable";
import { fmtDateTime } from "@/lib/format";
import type { BackupRecord } from "@/lib/types";

export function BackupHistory({ backups, onDownload, onRestore }: { backups: BackupRecord[]; onDownload: (b: BackupRecord) => void; onRestore: (b: BackupRecord) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr>
            <th className={TH}>Date &amp; Time</th>
            <th className={TH}>Type</th>
            <th className={TH}>Size</th>
            <th className={TH}>Status</th>
            <th className={TH}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((b, i) => (
            <motion.tr key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} className="border-b border-[#f0ebdf] transition-colors hover:bg-gold/[.07]">
              <td className={TD}>{fmtDateTime(b.createdAt)}</td>
              <td className={TD}>{b.type}</td>
              <td className={TD}>{b.sizeMb.toFixed(1)} MB</td>
              <td className={TD}>
                <Badge tone={b.status === "Successful" ? "Paid" : "Unpaid"}>{b.status}</Badge>
              </td>
              <td className={TD}>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => onDownload(b)} aria-label={`Download backup ${fmtDateTime(b.createdAt)}`}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button size="sm" disabled={b.status !== "Successful"} onClick={() => onRestore(b)} aria-label={`Restore backup ${fmtDateTime(b.createdAt)}`}>
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </Button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
