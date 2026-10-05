"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import {
  DEFAULT_METAL_PURITIES,
  balanceAt,
  deriveMetalTransactions,
  karigarReturnedWeight,
  type GoldAccountingData,
  type GoldOpeningBalance,
  type GoldReconciliation,
  type KarigarJob,
  type MetalPurity,
  type MetalTransaction,
  type MetalTransactionType,
  emptyGoldAccounting,
} from "@/lib/gold-accounting";
import { assertDayIsOpen } from "@/lib/operations";
import { getSession } from "@/lib/services/auth";
import { calculateGoldWeightMetrics, calculateFineGoldWeight } from "@/lib/purity";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "reinsoft-gold-metal-v1";
const MANUAL_TYPES: MetalTransactionType[] = ["Other Gold Received", "Used in Manufacturing", "Gold Loss / Wastage"];

interface GoldAccountingState extends GoldAccountingData {
  metalTransactions: MetalTransaction[];
  setOpeningBalance: (purityId: string, date: string, weight: number) => void;
  addPurity: (name: string, fineness: number) => MetalPurity;
  recordMetalMovement: (input: { date: string; reference: string; type: MetalTransactionType; purityId: string; weight: number; notes: string }) => MetalTransaction;
  recordMetalMovements: (inputs: Array<{ date: string; reference: string; type: MetalTransactionType; purityId: string; weight: number; notes: string }>) => MetalTransaction[];
  reverseInvoiceGold: (invoiceId: string, reversalReference: string) => MetalTransaction[];
  reconcileGold: (purityId: string, date: string, physicalStock: number, reason: string) => GoldReconciliation;
  issueGold: (input: { jobNumber: string; karigar: string; orderId: string; reference: string; purityId: string; issuedWeight: number; allowedWastage: number; date: string; expectedReturnDate: string; notes: string }) => KarigarJob;
  returnGold: (input: { jobId: string; weight: number; date: string; notes: string; final: boolean; differenceReason: string }) => MetalTransaction;
}

const Context = createContext<GoldAccountingState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function slugForKarigar(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateIsValid(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function weightAttributes(weight: number, purityId: string, purities: MetalPurity[]) {
  const metrics = calculateGoldWeightMetrics({ grossWeight: weight, netWeight: weight, purity: purityId, configured: purities });
  return {
    grossWeight: metrics.grossWeight,
    netWeight: metrics.netWeight,
    fineGoldPercentage: metrics.fineGoldPercentage,
    equivalent22K: metrics.equivalent22K,
    equivalent18K: metrics.equivalent18K,
  };
}

export function GoldAccountingProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { invoices, logAudit } = useApp();
  const { purchases, returns, stockAdjustments } = useOperations();
  const { orders, stock, setOrderStatus } = useShop();
  const [data, setData] = useState<GoldAccountingData>(emptyGoldAccounting);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isRecord(saved)) throw new Error("Saved metal accounting data has an invalid format.");
          setData({
            purities: Array.isArray(saved.purities) ? saved.purities as MetalPurity[] : DEFAULT_METAL_PURITIES,
            openingBalances: Array.isArray(saved.openingBalances) ? saved.openingBalances as GoldOpeningBalance[] : [],
            transactions: Array.isArray(saved.transactions) ? saved.transactions as MetalTransaction[] : [],
            karigarJobs: Array.isArray(saved.karigarJobs) ? saved.karigarJobs as KarigarJob[] : [],
            reconciliations: Array.isArray(saved.reconciliations) ? saved.reconciliations as GoldReconciliation[] : [],
          });
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load gold accounting: ${error.message}` : "Could not load gold accounting.", "error");
      } finally {
        setLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      toast(error instanceof Error ? `Could not save gold accounting: ${error.message}` : "Could not save gold accounting.", "error");
    }
  }, [data, loaded, toast]);

  const actor = () => getSession()?.name ?? "Unknown user";
  const metalTransactions = useMemo(
    () => deriveMetalTransactions({ purchases, invoices, returns, stockAdjustments, stockItems: stock, recorded: data.transactions, purities: data.purities }),
    [data.purities, data.transactions, invoices, purchases, returns, stock, stockAdjustments],
  );

  const setOpeningBalance = useCallback((purityId: string, date: string, weight: number) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can set opening metal balances.");
    if (!data.purities.some((purity) => purity.id === purityId)) throw new Error("Select a configured purity.");
    if (!dateIsValid(date) || !Number.isFinite(weight) || weight < 0) throw new Error("Enter a valid opening date and non-negative weight.");
    const prior = data.openingBalances.find((balance) => balance.purityId === purityId);
    const balance = { purityId, date, weight };
    setData((current) => ({ ...current, openingBalances: current.openingBalances.some((item) => item.purityId === purityId) ? current.openingBalances.map((item) => item.purityId === purityId ? balance : item) : [...current.openingBalances, balance] }));
    logAudit(`Set ${purityId} opening gold stock`, { module: "Gold Accounting", referenceId: purityId, previousValue: prior ? `${prior.weight} g from ${prior.date}` : "Not configured", newValue: `${weight} g from ${date}` });
  }, [data.openingBalances, data.purities, logAudit]);

  const addPurity = useCallback((name: string, fineness: number) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can configure gold purities.");
    const cleanName = name.trim().toUpperCase();
    if (cleanName.length < 2 || cleanName.length > 12 || data.purities.some((purity) => purity.name.toUpperCase() === cleanName)) throw new Error("Enter a unique purity name (2–12 characters).");
    if (!Number.isFinite(fineness) || fineness <= 0 || fineness > 1) throw new Error("Fineness must be greater than 0 and no more than 1.");
    const purity = { id: uid("PURITY"), name: cleanName, fineness };
    setData((current) => ({ ...current, purities: [...current.purities, purity] }));
    logAudit(`Added gold purity ${cleanName}`, { module: "Gold Accounting", referenceId: purity.id, newValue: `Fineness ${(fineness * 100).toFixed(2)}%` });
    return purity;
  }, [data.purities, logAudit]);

  const recordMetalMovement = useCallback((input: { date: string; reference: string; type: MetalTransactionType; purityId: string; weight: number; notes: string }) => {
    if (getSession()?.role === "Staff") throw new Error("Only Owners and Accountants can record manual gold movements.");
    if (!MANUAL_TYPES.includes(input.type)) throw new Error("Select a supported manual gold movement type.");
    const purity = data.purities.find((item) => item.id === input.purityId);
    if (!purity || !dateIsValid(input.date) || !input.reference.trim() || !Number.isFinite(input.weight) || input.weight <= 0) throw new Error("Enter a valid date, reference, purity and weight.");
    assertDayIsOpen(input.date);
    const sign = input.type === "Other Gold Received" ? 1 : -1;
    const movement: MetalTransaction = {
      id: uid("GOLD"),
      date: input.date,
      reference: input.reference.trim(),
      type: input.type,
      purityId: purity.id,
      weight: input.weight,
      signedWeight: input.weight * sign,
      fineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities),
      signedFineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities) * sign,
      ...weightAttributes(input.weight, purity.id, data.purities),
      actor: actor(),
      notes: input.notes.trim(),
      source: "Manual",
    };
    setData((current) => ({ ...current, transactions: [movement, ...current.transactions] }));
    logAudit(`Recorded ${input.type} ${input.weight} g (${purity.name})`, { module: "Gold Accounting", referenceId: movement.id, newValue: JSON.stringify(movement) });
    return movement;
  }, [data.purities, logAudit]);

  const recordMetalMovements = useCallback((inputs: Array<{ date: string; reference: string; type: MetalTransactionType; purityId: string; weight: number; notes: string }>) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can record a linked multi-line gold movement.");
    if (!inputs.length) throw new Error("At least one gold movement is required.");
    const movements = inputs.map((input) => {
      if (!MANUAL_TYPES.includes(input.type)) throw new Error("Select supported manual gold movement types.");
      const purity = data.purities.find((item) => item.id === input.purityId);
      if (!purity || !dateIsValid(input.date) || !input.reference.trim() || !Number.isFinite(input.weight) || input.weight <= 0) throw new Error("Every linked movement needs a valid date, reference, purity and positive weight.");
      assertDayIsOpen(input.date);
      const sign = input.type === "Other Gold Received" ? 1 : -1;
      return {
        id: uid("GOLD"),
        date: input.date,
        reference: input.reference.trim(),
        type: input.type,
        purityId: purity.id,
        weight: input.weight,
        signedWeight: input.weight * sign,
        fineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities),
        signedFineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities) * sign,
        ...weightAttributes(input.weight, purity.id, data.purities),
        actor: actor(),
        notes: input.notes.trim(),
        source: "Manual" as const,
      };
    });
    setData((current) => ({ ...current, transactions: [...movements, ...current.transactions] }));
    logAudit(`Recorded linked gold movements ${movements.map((item) => item.reference).join(", ")}`, { module: "Gold Accounting", referenceId: movements.map((item) => item.id).join(", "), newValue: JSON.stringify(movements) });
    return movements;
  }, [data.purities, logAudit]);

  const reverseInvoiceGold = useCallback((invoiceId: string, reversalReference: string) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can post invoice gold reversals.");
    if (data.transactions.some((transaction) => transaction.source === "Reversal" && transaction.sourceId === invoiceId)) throw new Error("Gold movements for this invoice have already been reversed.");
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || !reversalReference.trim()) throw new Error("Invoice and reversal reference are required.");
    const reversed: MetalTransaction[] = [];
    for (const item of invoice.items) {
      const purity = data.purities.find((entry) => entry.id === item.purity);
      if (!purity) throw new Error(`Invoice purity ${item.purity} is not configured.`);
      const fineGoldWeight = calculateFineGoldWeight(item.weight, purity.id, data.purities);
      reversed.push({
        id: uid("GREV"),
        date: DEMO_TODAY,
        reference: reversalReference,
        type: "Reversal",
        purityId: purity.id,
        weight: item.weight,
        signedWeight: item.weight,
        fineGoldWeight,
        signedFineGoldWeight: fineGoldWeight,
        ...weightAttributes(item.weight, purity.id, data.purities),
        actor: actor(),
        notes: `Sale reversal for invoice ${invoiceId} · ${item.name}`,
        source: "Reversal",
        sourceId: invoiceId,
      });
    }
    if (invoice.oldGold && invoice.oldGold.weight > 0) {
      const purity = data.purities.find((entry) => entry.id === invoice.oldGold?.purity);
      if (!purity) throw new Error(`Invoice old-gold purity ${invoice.oldGold.purity} is not configured.`);
      const fineGoldWeight = calculateFineGoldWeight(invoice.oldGold.weight, purity.id, data.purities);
      reversed.push({
        id: uid("GREV"),
        date: DEMO_TODAY,
        reference: reversalReference,
        type: "Reversal",
        purityId: purity.id,
        weight: invoice.oldGold.weight,
        signedWeight: -invoice.oldGold.weight,
        fineGoldWeight,
        signedFineGoldWeight: -fineGoldWeight,
        ...weightAttributes(invoice.oldGold.weight, purity.id, data.purities),
        actor: actor(),
        notes: `Reversal of old-gold receipt for invoice ${invoiceId}`,
        source: "Reversal",
        sourceId: invoiceId,
      });
    }
    setData((current) => ({ ...current, transactions: [...reversed, ...current.transactions] }));
    logAudit(`Reversed gold movements for invoice ${invoiceId}`, { module: "Gold Accounting", referenceId: reversalReference, newValue: JSON.stringify(reversed) });
    return reversed;
  }, [data.purities, data.transactions, invoices, logAudit]);

  const reconcileGold = useCallback((purityId: string, date: string, physicalStock: number, reason: string) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can reconcile physical gold stock.");
    const purity = data.purities.find((item) => item.id === purityId);
    if (!purity || !dateIsValid(date) || !Number.isFinite(physicalStock) || physicalStock < 0) throw new Error("Enter a valid purity, date and physical stock weight.");
    const opening = data.openingBalances.find((balance) => balance.purityId === purityId);
    if (!opening || opening.date > date) throw new Error("Set a valid opening balance before reconciling this purity.");
    assertDayIsOpen(date);
    const currentTransactions = deriveMetalTransactions({ purchases, invoices, returns, stockAdjustments, stockItems: stock, recorded: data.transactions, purities: data.purities });
    const systemStock = balanceAt(opening, currentTransactions, purityId, date);
    const difference = physicalStock - systemStock;
    if (Math.abs(difference) > 0.001 && reason.trim().length < 3) throw new Error("A difference was found. Enter an adjustment reason of at least three characters.");
    const adjustment = Math.abs(difference) > 0.001
      ? {
          id: uid("GOLD"),
          date,
          reference: `RECON-${date.replaceAll("-", "")}`,
          type: "Adjustment" as const,
          purityId,
          weight: Math.abs(difference),
          signedWeight: difference,
          fineGoldWeight: calculateFineGoldWeight(Math.abs(difference), purity.id, data.purities),
          signedFineGoldWeight: calculateFineGoldWeight(Math.abs(difference), purity.id, data.purities) * Math.sign(difference),
          ...weightAttributes(Math.abs(difference), purity.id, data.purities),
          actor: actor(),
          notes: reason.trim(),
          source: "Reconciliation" as const,
        }
      : undefined;
    const reconciliation: GoldReconciliation = {
      id: uid("GREC"),
      date,
      purityId,
      systemStock,
      physicalStock,
      difference,
      reason: reason.trim(),
      actor: actor(),
      ...(adjustment ? { adjustmentTransactionId: adjustment.id } : {}),
    };
    setData((current) => ({
      ...current,
      ...(adjustment ? { transactions: [adjustment, ...current.transactions] } : {}),
      reconciliations: [reconciliation, ...current.reconciliations],
    }));
    logAudit(
      `${adjustment ? "Adjusted" : "Reconciled"} ${purity.name} gold stock${adjustment ? ` (${difference > 0 ? "+" : ""}${difference.toFixed(3)} g)` : ""}`,
      { module: "Gold Accounting", referenceId: reconciliation.id, previousValue: `System ${systemStock.toFixed(3)} g`, newValue: `Physical ${physicalStock.toFixed(3)} g; difference ${difference.toFixed(3)} g; ${reason.trim() || "No difference"}` },
    );
    return reconciliation;
  }, [data.openingBalances, data.purities, data.transactions, invoices, logAudit, purchases, returns, stock, stockAdjustments]);

  const issueGold = useCallback((input: { jobNumber: string; karigar: string; orderId: string; reference: string; purityId: string; issuedWeight: number; allowedWastage: number; date: string; expectedReturnDate: string; notes: string }) => {
    if (getSession()?.role === "Accountant") throw new Error("Accountants can review the karigar ledger but cannot issue or return physical gold.");
    const purity = data.purities.find((item) => item.id === input.purityId);
    const order = input.orderId ? orders.find((item) => item.id === input.orderId) : undefined;
    if (!purity || !input.jobNumber.trim() || input.jobNumber.trim().length < 2 || input.karigar.trim().length < 2 || !input.reference.trim()) throw new Error("Enter a job number, karigar, reference and configured purity.");
    if (!dateIsValid(input.date) || !dateIsValid(input.expectedReturnDate) || input.expectedReturnDate < input.date) throw new Error("Choose a valid expected return date on or after the issue date.");
    if (!Number.isFinite(input.issuedWeight) || input.issuedWeight <= 0 || !Number.isFinite(input.allowedWastage) || input.allowedWastage < 0 || input.allowedWastage >= input.issuedWeight) throw new Error("Issued weight must be positive; allowed wastage must be below the issued weight.");
    if (data.karigarJobs.some((job) => job.jobNumber.toLowerCase() === input.jobNumber.trim().toLowerCase())) throw new Error("That job number is already in use.");
    if (input.orderId && (!order || order.karigar.trim().toLowerCase() !== input.karigar.trim().toLowerCase())) throw new Error("The selected order does not match this karigar.");
    assertDayIsOpen(input.date);
    const jobId = uid("KJOB");
    const movement: MetalTransaction = {
      id: uid("GOLD"),
      date: input.date,
      reference: input.reference.trim(),
      type: "Karigar Issue",
      purityId: purity.id,
      weight: input.issuedWeight,
      signedWeight: -input.issuedWeight,
      fineGoldWeight: calculateFineGoldWeight(input.issuedWeight, purity.id, data.purities),
      signedFineGoldWeight: -calculateFineGoldWeight(input.issuedWeight, purity.id, data.purities),
      ...weightAttributes(input.issuedWeight, purity.id, data.purities),
      actor: actor(),
      notes: input.notes.trim(),
      source: "Karigar",
      sourceId: jobId,
      jobId,
    };
    const job: KarigarJob = {
      id: jobId,
      jobNumber: input.jobNumber.trim(),
      karigar: input.karigar.trim(),
      karigarId: slugForKarigar(input.karigar),
      orderId: input.orderId,
      reference: input.reference.trim(),
      purityId: purity.id,
      issuedTransactionId: movement.id,
      issuedWeight: input.issuedWeight,
      allowedWastage: input.allowedWastage,
      issueDate: input.date,
      expectedReturnDate: input.expectedReturnDate,
      notes: input.notes.trim(),
      status: "Open",
    };
    setData((current) => ({ ...current, karigarJobs: [job, ...current.karigarJobs], transactions: [movement, ...current.transactions] }));
    if (order?.status === "Ordered") setOrderStatus(order.id, "Making");
    logAudit(`Issued ${input.issuedWeight} g ${purity.name} to karigar ${job.karigar}`, { module: "Karigar Gold", referenceId: job.jobNumber, newValue: `Order ${order?.id ?? "not linked"}; expected return ${input.issuedWeight - input.allowedWastage} g` });
    return job;
  }, [data.karigarJobs, data.purities, logAudit, orders, setOrderStatus]);

  const returnGold = useCallback((input: { jobId: string; weight: number; date: string; notes: string; final: boolean; differenceReason: string }) => {
    if (getSession()?.role === "Accountant") throw new Error("Accountants can review the karigar ledger but cannot issue or return physical gold.");
    const job = data.karigarJobs.find((item) => item.id === input.jobId && item.status === "Open");
    if (!job) throw new Error("Select an open karigar job.");
    const returned = karigarReturnedWeight(job.id, data.transactions);
    const remaining = job.issuedWeight - returned;
    if (!dateIsValid(input.date) || !Number.isFinite(input.weight) || input.weight <= 0 || input.weight > remaining + 0.0001) throw new Error("Returned weight must be positive and cannot exceed the gold still issued.");
    assertDayIsOpen(input.date);
    const finalWastage = job.issuedWeight - returned - input.weight;
    const difference = finalWastage - job.allowedWastage;
    if (input.final && Math.abs(difference) > 0.001 && input.differenceReason.trim().length < 3) throw new Error("The final wastage differs from the allowance. Enter a reason for the variance.");
    const purity = data.purities.find((item) => item.id === job.purityId);
    if (!purity) throw new Error("The job purity is no longer configured.");
    const movement: MetalTransaction = {
      id: uid("GOLD"),
      date: input.date,
      reference: job.reference,
      type: "Karigar Return",
      purityId: job.purityId,
      weight: input.weight,
      signedWeight: input.weight,
      fineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities),
      signedFineGoldWeight: calculateFineGoldWeight(input.weight, purity.id, data.purities),
      ...weightAttributes(input.weight, purity.id, data.purities),
      actor: actor(),
      notes: [input.notes.trim(), input.final && input.differenceReason.trim() ? `Final variance: ${input.differenceReason.trim()}` : ""].filter(Boolean).join(" · "),
      source: "Karigar",
      sourceId: job.id,
      jobId: job.id,
    };
    const status: KarigarJob["status"] = input.final ? Math.abs(difference) > 0.001 ? "Review" : "Returned" : "Open";
    setData((current) => ({
      ...current,
      transactions: [movement, ...current.transactions],
      karigarJobs: current.karigarJobs.map((item) => item.id === job.id ? { ...item, status } : item),
    }));
    const order = orders.find((item) => item.id === job.orderId);
    if (status === "Returned" && order?.status === "Making") setOrderStatus(order.id, "Ready");
    logAudit(`Recorded ${input.weight} g gold return for karigar job ${job.jobNumber}`, { module: "Karigar Gold", referenceId: job.jobNumber, newValue: `Returned ${returned + input.weight} g; actual wastage ${finalWastage.toFixed(3)} g; allowance ${job.allowedWastage.toFixed(3)} g; status ${status}` });
    return movement;
  }, [data.karigarJobs, data.purities, data.transactions, logAudit, orders, setOrderStatus]);

  const value = useMemo<GoldAccountingState>(() => ({
    ...data,
    metalTransactions,
    setOpeningBalance,
    addPurity,
    recordMetalMovement,
    recordMetalMovements,
    reverseInvoiceGold,
    reconcileGold,
    issueGold,
    returnGold,
  }), [data, metalTransactions, setOpeningBalance, addPurity, recordMetalMovement, recordMetalMovements, reverseInvoiceGold, reconcileGold, issueGold, returnGold]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useGoldAccounting() {
  const context = useContext(Context);
  if (!context) throw new Error("useGoldAccounting must be used inside GoldAccountingProvider");
  return context;
}
