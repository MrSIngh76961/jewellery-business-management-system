"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fmtDateTime } from "@/lib/format";
import type { BackupRecord } from "@/lib/types";

export function RestoreModal({ backup, onClose, onConfirm }: { backup: BackupRecord | null; onClose: () => void; onConfirm: (b: BackupRecord) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const close = () => !busy && onClose();
  return (
    <Modal
      open={!!backup}
      onClose={close}
      title="Restore backup?"
      size="sm"
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              if (!backup) return;
              setBusy(true);
              try {
                await onConfirm(backup);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Restoring…" : "Yes, restore"}
          </Button>
        </>
      }
    >
      {backup && (
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" />
          <p className="text-sm leading-relaxed text-muted">
            Data will be rolled back to the backup taken on <b className="text-ink">{fmtDateTime(backup.createdAt)}</b> ({backup.sizeMb.toFixed(1)} MB). A safety backup of the current data is created first.
          </p>
        </div>
      )}
    </Modal>
  );
}
