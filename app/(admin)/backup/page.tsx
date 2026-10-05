"use client";

import { DatabaseBackup, FileText, ReceiptText, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { BackupHistory } from "@/components/backup/BackupHistory";
import { BackupStatus } from "@/components/backup/BackupStatus";
import { RestoreModal } from "@/components/backup/RestoreModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { APP_NAME } from "@/lib/config";
import { customersCsv, invoicesCsv, salesCsv } from "@/lib/exports";
import { fmtDateTime } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import type { BackupRecord } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

export default function BackupPage() {
  const { backups, settings, customers, invoices, createBackup, restoreBackup } = useApp();
  const toast = useToast();
  const ready = useReady(250);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<BackupRecord | null>(null);
  if (!ready) return <PageSkeleton />;

  const create = async () => {
    setCreating(true);
    try {
      await createBackup("Manual");
      toast("Backup created successfully");
    } finally {
      setCreating(false);
    }
  };

  const download = (b: BackupRecord) => {
    const payload = { app: APP_NAME, backupId: b.id, createdAt: b.createdAt, type: b.type, customers, invoices, settings };
    downloadFile(`reinsoft-gold-backup-${b.createdAt.slice(0, 10)}-${b.id}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Backup file downloaded");
  };

  const exports = [
    { title: "Customer Data", desc: `${customers.length} customers`, icon: Users, name: "customers", csv: () => customersCsv(customers, invoices) },
    { title: "Invoice Data", desc: `${invoices.length} invoices`, icon: ReceiptText, name: "invoices", csv: () => invoicesCsv(invoices) },
    { title: "Sales Data", desc: "All sales transactions", icon: TrendingUp, name: "sales", csv: () => salesCsv(invoices) },
  ];

  return (
    <>
      <PageHeader title="Backup & Data" subtitle="Protect your records and export data any time.">
        <Button variant="primary" loading={creating} onClick={create}>
          <DatabaseBackup className="h-4 w-4" /> {creating ? "Creating…" : "Create Backup"}
        </Button>
      </PageHeader>

      <BackupStatus backups={backups} settings={settings} />

      <Card className="mt-4" delay={0.1}>
        <CardHead title="Recovery Points" />
        <BackupHistory backups={backups} onDownload={download} onRestore={setTarget} />
      </Card>

      <Card className="mt-4" delay={0.15}>
        <CardHead title="Export Data (CSV)" />
        <div className="grid gap-3 sm:grid-cols-3">
          {exports.map((e) => (
            <div key={e.name} className="flex items-center gap-3 rounded-xl border border-line bg-cream/50 p-4 transition-colors hover:border-gold/50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-deep">
                <e.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{e.title}</div>
                <div className="text-xs text-muted">{e.desc}</div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  downloadFile(`reinsoft-gold-${e.name}.csv`, e.csv());
                  toast(`${e.title} exported`);
                }}
              >
                <FileText className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <RestoreModal
        backup={target}
        onClose={() => setTarget(null)}
        onConfirm={async (b) => {
          await restoreBackup(b.id);
          setTarget(null);
          toast(`Restore from ${fmtDateTime(b.createdAt)} completed`);
        }}
      />
    </>
  );
}
