import { DEMO_NOW } from "../config";
import { uid } from "../utils";
import type { BackupRecord } from "../types";

/**
 * Mock backup service. Swap the bodies for calls to a server endpoint
 * (e.g. POST /api/backups, GET /api/backups/:id/download, POST /api/backups/:id/restore).
 */
export async function createBackupRecord(type: BackupRecord["type"], sizeMb: number): Promise<BackupRecord> {
  await new Promise((r) => setTimeout(r, 1200));
  return { id: uid("bk"), createdAt: DEMO_NOW, type, sizeMb, status: "Successful" };
}

export async function restoreBackup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 1800));
}
