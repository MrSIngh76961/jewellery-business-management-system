"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_TODAY } from "@/lib/config";
import { invoiceTotals } from "@/lib/billing";
import { withExtras } from "@/lib/seed-shop";
import { defaultSettings, seedAudit, seedBackups, seedCustomers, seedInvoices, seedRates } from "@/lib/seed";
import { createBackupRecord, restoreBackup as restoreService } from "@/lib/services/backup";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { publishWhatsAppEvent } from "@/lib/whatsapp-automation";
import { uid } from "@/lib/utils";
import type { AuditLog, BackupRecord, Customer, GoldItem, GoldRateEntry, Invoice, Settings } from "@/lib/types";
import { assertDayIsOpen } from "@/lib/operations";
import { useToast } from "@/components/ui/Toast";
import { getSession } from "@/lib/services/auth";

export type InvoiceDraft = Omit<Invoice, "id" | "items" | "customerName" | "customerMobile"> & {
  items: Omit<GoldItem, "id">[];
};
export type CustomerDraft = { name: string; mobile: string; address: string; email: string; birthday?: string; anniversary?: string; pan?: string; kycVerified?: boolean };
export type PrintJob = { invoice: Invoice; mode: "print" | "pdf" } | null;

interface AppState {
  customers: Customer[];
  invoices: Invoice[];
  backups: BackupRecord[];
  settings: Settings;
  rates: GoldRateEntry[];
  updateGoldRates: (rate22: number, rate18: number) => void;
  auditLogs: AuditLog[];
  getInvoice: (id: string) => Invoice | undefined;
  getCustomer: (id: string) => Customer | undefined;
  nextInvoiceNumber: () => string;
  addCustomer: (d: CustomerDraft) => Customer;
  updateCustomer: (id: string, d: CustomerDraft) => void;
  setInvoicePaid: (id: string, amountPaid: number) => void;
  addInvoice: (d: InvoiceDraft) => Invoice;
  updateInvoice: (id: string, d: InvoiceDraft) => Invoice;
  updateSettings: (s: Settings) => void;
  createBackup: (type?: BackupRecord["type"]) => Promise<BackupRecord>;
  restoreBackup: (id: string) => Promise<void>;
  logAudit: (action: string, details?: Pick<AuditLog, "module" | "referenceId" | "previousValue" | "newValue">) => void;
  viewInvoiceId: string | null;
  openInvoice: (id: string) => void;
  closeInvoice: () => void;
  editInvoice: (id: string) => void;
  printJob: PrintJob;
  clearPrint: () => void;
  printInvoice: (inv: Invoice) => void;
  downloadPdf: (inv: Invoice) => void;
  shareWhatsapp: (inv: Invoice) => void;
  markInvoiceReversed: (id: string, reversalId: string, at: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const APP_STORAGE_KEY = "reinsoft-gold-app-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function verificationIdFor(invoiceId: string) {
  return `RGV-${invoiceId.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState(() => withExtras(seedCustomers));
  const [invoices, setInvoices] = useState<Invoice[]>(() => seedInvoices.map((invoice) => ({ ...invoice, verificationId: verificationIdFor(invoice.id) })));
  const [backups, setBackups] = useState(seedBackups);
  const [settings, setSettings] = useState(defaultSettings);
  const [rates, setRates] = useState(seedRates);
  const [auditLogs, setAuditLogs] = useState(seedAudit);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [viewInvoiceId, setView] = useState<string | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(APP_STORAGE_KEY);
        if (raw) {
          const snapshot: unknown = JSON.parse(raw);
          if (!isObject(snapshot)) throw new Error("Saved shop data is not an object.");
          if (Array.isArray(snapshot.customers)) setCustomers(snapshot.customers as Customer[]);
          if (Array.isArray(snapshot.invoices)) setInvoices((snapshot.invoices as Invoice[]).map((invoice) => ({ ...invoice, verificationId: invoice.verificationId ?? verificationIdFor(invoice.id) })));
          if (Array.isArray(snapshot.backups)) setBackups(snapshot.backups as BackupRecord[]);
          if (Array.isArray(snapshot.rates)) setRates(snapshot.rates as GoldRateEntry[]);
          if (Array.isArray(snapshot.auditLogs)) setAuditLogs(snapshot.auditLogs as AuditLog[]);
          if (isObject(snapshot.settings) && typeof snapshot.settings.rate22 === "number" && typeof snapshot.settings.rate18 === "number") {
            const savedSettings: Record<string, unknown> = { ...defaultSettings, ...snapshot.settings };
            delete savedSettings.whatsappApiKey;
            setSettings({ ...defaultSettings, ...savedSettings } as Settings);
          }
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load saved shop data: ${error.message}` : "Could not load saved shop data.", "error");
      } finally {
        setStorageLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      const safeSettings: Settings & { whatsappApiKey?: string } = { ...settings };
      delete safeSettings.whatsappApiKey;
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({ customers, invoices, backups, settings: safeSettings, rates, auditLogs }));
    } catch (error) {
      toast(error instanceof Error ? `Could not save shop data: ${error.message}` : "Could not save shop data.", "error");
    }
  }, [auditLogs, backups, customers, invoices, rates, settings, storageLoaded, toast]);

  const logAudit = useCallback(
    (action: string, details?: Pick<AuditLog, "module" | "referenceId" | "previousValue" | "newValue">) =>
      setAuditLogs((l) => [{ id: uid("a"), at: new Date().toISOString(), actor: getSession()?.name ?? "Unknown user", action, ...details }, ...l]),
    [],
  );

  const nextInvoiceNumber = useCallback(() => {
    const max = invoices.reduce((m, i) => Math.max(m, parseInt(i.id.match(/(\d+)$/)?.[1] ?? "0", 10)), 0);
    const year = settings.includeYear ? `-${DEMO_TODAY.slice(0, 4)}` : "";
    return `${settings.invoicePrefix}${year}-${String(max + 1).padStart(settings.numberPadding, "0")}`;
  }, [invoices, settings]);

  const getCustomer = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);
  const getInvoice = useCallback((id: string) => invoices.find((i) => i.id === id), [invoices]);

  const addCustomer = useCallback(
    (d: CustomerDraft) => {
      const max = customers.reduce((m, c) => Math.max(m, parseInt(c.id.replace(/\D/g, ""), 10) || 0), 1000);
      const c: Customer = { id: `C-${max + 1}`, ...d, priorPurchases: 0, priorTotal: 0, createdAt: DEMO_TODAY };
      setCustomers((s) => [...s, c]);
      logAudit(`Added customer ${c.name}`, { module: "Customers", referenceId: c.id, newValue: `Name: ${c.name}; mobile: ${c.mobile}; PAN: ${c.pan || "not provided"}` });
      return c;
    },
    [customers, logAudit],
  );

  const updateCustomer = useCallback(
    (id: string, d: CustomerDraft) => {
      const previous = customers.find((customer) => customer.id === id);
      setCustomers((s) => s.map((c) => (c.id === id ? { ...c, ...d } : c)));
      setInvoices((s) => s.map((i) => (i.customerId === id ? { ...i, customerName: d.name, customerMobile: d.mobile } : i)));
      logAudit(`Updated customer ${d.name}`, { module: "Customers", referenceId: id, previousValue: previous ? `Name: ${previous.name}; mobile: ${previous.mobile}; PAN: ${previous.pan || "not provided"}` : undefined, newValue: `Name: ${d.name}; mobile: ${d.mobile}; PAN: ${d.pan || "not provided"}` });
    },
    [customers, logAudit],
  );

  const materialise = useCallback(
    (id: string, d: InvoiceDraft): Invoice => {
      const cu = customers.find((c) => c.id === d.customerId);
      const calc = invoiceTotals({ ...d, items: d.items as GoldItem[] });
      const existing = invoices.find((invoice) => invoice.id === id);
      return {
        ...d,
        id,
        verificationId: existing?.verificationId ?? uid("VERIFY"),
        customerName: cu?.name ?? "Walk-in Customer",
        customerMobile: cu?.mobile ?? "",
        amountPaid: calc.paid,
        items: d.items.map((it, i) => ({ ...it, id: `${id}-${i + 1}` })),
      };
    },
    [customers, invoices],
  );

  const addInvoice = useCallback(
    (d: InvoiceDraft) => {
      assertDayIsOpen(d.date);
      const inv = materialise(nextInvoiceNumber(), d);
      setInvoices((s) => [inv, ...s]);
      logAudit(`Created invoice ${inv.id}`, { module: "Billing", referenceId: inv.id, newValue: `Customer ${inv.customerName}; total ₹${invoiceTotals(inv).grand}; discount ₹${inv.discount}` });
      const totals = invoiceTotals(inv);
      publishWhatsAppEvent({
        id: `invoice-created-${inv.id}`,
        type: "invoice_created",
        customerName: inv.customerName,
        mobile: inv.customerMobile,
        variables: {
          invoice_number: inv.id,
          amount: Math.round(totals.grand).toLocaleString("en-IN"),
          balance: Math.round(totals.balance).toLocaleString("en-IN"),
        },
      });
      return inv;
    },
    [materialise, nextInvoiceNumber, logAudit],
  );

  const updateInvoice = useCallback(
    (id: string, d: InvoiceDraft) => {
      const existing = invoices.find((invoice) => invoice.id === id);
      if (existing?.cancelledAt) throw new Error("A reversed invoice cannot be edited.");
      if (existing) assertDayIsOpen(existing.date);
      assertDayIsOpen(d.date);
      const inv = materialise(id, d);
      setInvoices((s) => s.map((i) => (i.id === id ? inv : i)));
      logAudit(`Updated invoice ${id}`, { module: "Billing", referenceId: id, previousValue: existing ? `Total ₹${invoiceTotals(existing).grand}; discount ₹${existing.discount}` : undefined, newValue: `Total ₹${invoiceTotals(inv).grand}; discount ₹${inv.discount}` });
      return inv;
    },
    [invoices, materialise, logAudit],
  );

  const setInvoicePaid = useCallback((id: string, amountPaid: number) => {
    setInvoices((s) =>
      s.map((i) => {
        if (i.id !== id) return i;
        const grand = invoiceTotals({ ...i, amountPaid: 0, status: "Unpaid" }).grand;
        const paid = Math.min(amountPaid, grand);
        return { ...i, amountPaid: paid, status: paid >= grand ? "Paid" : paid > 0 ? "Partial" : "Unpaid" };
      }),
    );
  }, []);

  const markInvoiceReversed = useCallback((id: string, reversalId: string, at: string) => {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.cancelledAt || invoice.reversalId) throw new Error("This invoice has already been reversed.");
    setInvoices((current) => current.map((item) => item.id === id ? { ...item, cancelledAt: at, reversalId, amountPaid: 0, status: "Unpaid" } : item));
    logAudit(`Reversed invoice ${id}`, { module: "Reversals", referenceId: reversalId, previousValue: `Paid ₹${invoice.amountPaid}`, newValue: `Invoice marked cancelled; payment reversal ${invoice.amountPaid > 0 ? "recorded" : "not required"}` });
  }, [invoices, logAudit]);

  const recordRates = useCallback((rate22: number, rate18: number) => {
    setRates((r) => [...r.filter((x) => x.date !== DEMO_TODAY), { id: `gr-${DEMO_TODAY}`, date: DEMO_TODAY, rate22, rate18 }].sort((a, b) => a.date.localeCompare(b.date)));
  }, []);

  const updateGoldRates = useCallback(
    (rate22: number, rate18: number) => {
      setSettings((s) => ({ ...s, rate22, rate18 }));
      recordRates(rate22, rate18);
      logAudit(`Updated gold rates (22K ₹${rate22} / 18K ₹${rate18})`, { module: "Gold Rates", previousValue: `22K ₹${settings.rate22}; 18K ₹${settings.rate18}`, newValue: `22K ₹${rate22}; 18K ₹${rate18}` });
    },
    [recordRates, logAudit, settings.rate18, settings.rate22],
  );

  const updateSettings = useCallback(
    (s: Settings) => {
      if (s.rate22 !== settings.rate22 || s.rate18 !== settings.rate18) recordRates(s.rate22, s.rate18);
      setSettings(s);
      logAudit("Updated settings", { module: "Settings", newValue: "Business configuration updated" });
    },
    [settings.rate22, settings.rate18, recordRates, logAudit],
  );

  const createBackup = useCallback(
    async (type: BackupRecord["type"] = "Manual") => {
      const size = Math.round((84.6 + backups.length * 0.4 + invoices.length * 0.02) * 10) / 10;
      const rec = await createBackupRecord(type, size);
      setBackups((b) => [rec, ...b]);
      logAudit(`Created ${type.toLowerCase()} backup`, { module: "Backup", referenceId: rec.id, newValue: rec.status });
      return rec;
    },
    [backups.length, invoices.length, logAudit],
  );

  const restoreBackup = useCallback(
    async (id: string) => {
      const rec = backups.find((b) => b.id === id);
      const safety = await createBackupRecord("Pre-restore", rec?.sizeMb ?? 80);
      setBackups((b) => [safety, ...b]);
      await restoreService();
      logAudit(`Restored backup ${id}`, { module: "Backup", referenceId: id, newValue: `Restored; safety copy ${safety.id}` });
    },
    [backups, logAudit],
  );

  const printInvoice = useCallback((inv: Invoice) => setPrintJob({ invoice: inv, mode: "print" }), []);
  const downloadPdf = useCallback(
    (inv: Invoice) => {
      toast("Choose “Save as PDF” as the destination in the print dialog", "info");
      setPrintJob({ invoice: inv, mode: "pdf" });
    },
    [toast],
  );
  const shareWhatsapp = useCallback(
    (inv: Invoice) => {
      window.open(buildWhatsappUrl(inv, settings), "_blank", "noopener,noreferrer");
      toast(`WhatsApp share opened for ${inv.customerName}`);
      logAudit(`Shared ${inv.id} on WhatsApp`);
    },
    [settings, toast, logAudit],
  );

  const value = useMemo<AppState>(
    () => ({
      customers,
      invoices,
      backups,
      settings,
      rates,
      updateGoldRates,
      auditLogs,
      getInvoice,
      getCustomer,
      nextInvoiceNumber,
      addCustomer,
      updateCustomer,
      setInvoicePaid,
      addInvoice,
      updateInvoice,
      updateSettings,
      createBackup,
      restoreBackup,
      logAudit,
      viewInvoiceId,
      openInvoice: setView,
      closeInvoice: () => setView(null),
      editInvoice: (id) => {
        setView(null);
        router.push(`/invoices/${id}/edit`);
      },
      printJob,
      clearPrint: () => setPrintJob(null),
      printInvoice,
      downloadPdf,
      shareWhatsapp,
      markInvoiceReversed,
    }),
    [customers, invoices, backups, settings, rates, updateGoldRates, auditLogs, getInvoice, getCustomer, nextInvoiceNumber, addCustomer, updateCustomer, setInvoicePaid, addInvoice, updateInvoice, updateSettings, createBackup, restoreBackup, logAudit, viewInvoiceId, router, printJob, printInvoice, downloadPdf, shareWhatsapp, markInvoiceReversed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
