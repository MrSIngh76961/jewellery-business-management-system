"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { fmtDateTime } from "@/lib/format";
import type { BackupRecord, Settings } from "@/lib/types";

export function BackupStatus({ backups, settings }: { backups: BackupRecord[]; settings: Settings }) {
  const last = backups.find((b) => b.status === "Successful");
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Backup Status" value={last ? "Healthy" : "Attention"} sub={settings.autoBackup ? `Auto daily at ${settings.backupTime}` : "Auto backup off"} trend={last ? "up" : "down"} />
      <StatCard label="Last Backup" value={last ? fmtDateTime(last.createdAt) : "—"} sub={last?.type ?? "No backup yet"} delay={0.05} />
      <StatCard label="Backup Size" value={last ? `${last.sizeMb.toFixed(1)} MB` : "—"} sub={`${backups.length} recovery points`} delay={0.1} />
      <StatCard label="Retention" value={`${settings.retentionDays} days`} sub="Older copies auto-removed" delay={0.15} />
    </div>
  );
}
