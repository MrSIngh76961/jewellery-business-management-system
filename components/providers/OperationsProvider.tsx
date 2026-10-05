"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { calcInvoice } from "@/lib/billing";
import { billSchema } from "@/lib/schemas";
import { customerSchema } from "@/lib/schemas";
import { APPROVAL_REQUEST_EVENT, INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT, emptyOperations, type ApprovalRequest, type ApprovalSubmission, type Booking, type DayClose, type Expense, type OperationsData, type Purchase, type SalesReturn, type StockAdjustment, type Supplier, type SupplierPayment } from "@/lib/operations";
import { getSession } from "@/lib/services/auth";
import { assertDayIsOpen } from "@/lib/operations";
import type { InvoiceDraft } from "@/components/providers/AppProvider";
import type { Purity } from "@/lib/types";
import { uid } from "@/lib/utils";
import { publishWhatsAppEvent } from "@/lib/whatsapp-automation";
import { publishStoneStockReturned } from "@/lib/stones";
import { goldRateForPurity } from "@/lib/purity";

interface OperationsState extends OperationsData {
  saveSupplier: (supplier: Omit<Supplier, "id"> & { id?: string }) => Supplier;
  recordSupplierPayment: (supplierId: string, amount: number, mode: SupplierPayment["mode"], note: string) => number;
  recordPurchase: (draft: Omit<Purchase, "id" | "stockItemId">) => Purchase;
  recordReturn: (draft: Omit<SalesReturn, "id" | "date">) => SalesReturn;
  saveExpense: (expense: Omit<Expense, "id"> & { id?: string }) => Expense;
  deleteExpense: (id: string) => void;
  closeDay: (input: Omit<DayClose, "id" | "expected" | "difference" | "closedBy" | "status">) => DayClose;
  reopenDay: (id: string, reason: string) => void;
  saveBooking: (booking: Omit<Booking, "id"> & { id?: string }) => Booking;
  convertBooking: (id: string) => string;
  requestApproval: (input: Pick<ApprovalRequest, "action" | "module" | "reference" | "details" | "reason"> & { payload?: ApprovalRequest["payload"] }) => ApprovalRequest;
  decideApproval: (id: string, decision: "Approved" | "Rejected", reason: string) => void;
  adjustStock: (stockItemId: string, physicalWeight: number, reason: StockAdjustment["reason"]) => StockAdjustment;
}

const Context = createContext<OperationsState | null>(null);
const STORAGE_KEY = "reinsoft-gold-operations-v1";

function isAdjustmentReason(value: string): value is StockAdjustment["reason"] {
  return ["Damage", "Lost", "Testing/Melting", "Correction", "Manual adjustment", "Other"].includes(value);
}

function isReturnDraft(value: unknown): value is Omit<SalesReturn, "id" | "date"> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.invoiceId === "string" &&
    typeof record.customerId === "string" &&
    typeof record.item === "string" &&
    typeof record.reason === "string" &&
    typeof record.weight === "number" &&
    (record.purity === "22K" || record.purity === "18K") &&
    typeof record.goldValue === "number" &&
    typeof record.makingAdjustment === "number" &&
    typeof record.gstAdjustment === "number" &&
    typeof record.refund === "number" &&
    typeof record.exchangeItem === "string" &&
    (record.status === "Refunded" || record.status === "Exchange" || record.status === "Pending");
}

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { logAudit, customers, invoices, settings, addInvoice, updateCustomer } = useApp();
  const { addStock, stock, adjustStockWeight, markSoldByTags, releaseLoan } = useShop();
  const [data, setData] = useState<OperationsData>(emptyOperations);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!saved || typeof saved !== "object" || !("suppliers" in saved) || !Array.isArray(saved.suppliers)) {
            throw new Error("Saved operations data has an invalid format.");
          }
          setData({ ...emptyOperations, ...(saved as Partial<OperationsData>) });
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load saved operations: ${error.message}` : "Could not load saved operations.", "error");
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
      toast(error instanceof Error ? `Could not save operations: ${error.message}` : "Could not save operations.", "error");
    }
  }, [data, loaded, toast]);

  const actor = () => getSession()?.name ?? "Unknown user";

  const saveSupplier = useCallback((draft: Omit<Supplier, "id"> & { id?: string }) => {
    const id = draft.id ?? uid("SUP");
    const supplier = { ...draft, id };
    setData((current) => ({ ...current, suppliers: current.suppliers.some((item) => item.id === id) ? current.suppliers.map((item) => item.id === id ? supplier : item) : [supplier, ...current.suppliers] }));
    logAudit(`${draft.id ? "Updated" : "Added"} supplier ${supplier.name}`, { module: "Suppliers", referenceId: id, newValue: JSON.stringify(supplier) });
    return supplier;
  }, [logAudit]);

  const recordSupplierPayment = useCallback((supplierId: string, amount: number, mode: SupplierPayment["mode"], note: string) => {
    assertDayIsOpen(DEMO_TODAY);
    if (!data.suppliers.some((supplier) => supplier.id === supplierId)) throw new Error("Select a valid supplier.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");
    let remaining = amount;
    const selected = data.purchases.filter((purchase) => purchase.supplierId === supplierId && purchase.total > purchase.paid).sort((a, b) => a.date.localeCompare(b.date));
    const allocations = new Map<string, number>();
    for (const purchase of selected) {
      if (remaining <= 0) break;
      const applied = Math.min(purchase.total - purchase.paid, remaining);
      allocations.set(purchase.id, applied);
      remaining -= applied;
    }
    const applied = amount - remaining;
    if (applied <= 0) return 0;
    const payment: SupplierPayment = { id: uid("SPAY"), supplierId, date: DEMO_TODAY, amount: applied, mode, note: note.trim(), allocations: [...allocations].map(([purchaseId, value]) => ({ purchaseId, amount: value })) };
    setData((current) => ({ ...current, purchases: current.purchases.map((purchase) => allocations.has(purchase.id) ? { ...purchase, paid: purchase.paid + (allocations.get(purchase.id) ?? 0) } : purchase), supplierPayments: [payment, ...current.supplierPayments] }));
    logAudit(`Supplier payment ₹${applied} allocated to ${allocations.size} oldest invoices`, { module: "Purchases", referenceId: supplierId, newValue: JSON.stringify(Object.fromEntries(allocations)) });
    return applied;
  }, [data.purchases, data.suppliers, logAudit]);

  const recordPurchase = useCallback((draft: Omit<Purchase, "id" | "stockItemId">) => {
    assertDayIsOpen(draft.date);
    if (!draft.invoiceNo.trim() || !draft.item.trim() || !Number.isFinite(draft.netWeight) || draft.netWeight <= 0 || !Number.isFinite(draft.grossWeight) || draft.grossWeight < draft.netWeight || !Number.isFinite(draft.rate) || draft.rate <= 0 || !Number.isFinite(draft.total) || draft.total <= 0) throw new Error("Purchase details and weights must be valid.");
    const id = uid("PUR");
    const supplier = data.suppliers.find((item) => item.id === draft.supplierId);
    if (!supplier) throw new Error("Select a valid supplier.");
    const paid = Math.min(draft.total, Math.max(0, draft.paid));
    const purchase: Purchase = { ...draft, id, paid, stockItemId: "" };
    const stockItem = addStock({
      name: draft.item,
      purity: draft.purity,
      weight: draft.netWeight,
      making: draft.making,
      purchaseCost: draft.total,
      supplierId: draft.supplierId,
      purchaseId: id,
      addedOn: draft.date,
    });
    purchase.stockItemId = stockItem.id;
    const initialPayment: SupplierPayment | undefined = paid > 0 ? { id: uid("SPAY"), supplierId: draft.supplierId, date: draft.date, amount: paid, mode: draft.paymentMethod, note: `Initial payment · ${draft.invoiceNo}`, allocations: [{ purchaseId: id, amount: paid }] } : undefined;
    setData((current) => ({ ...current, purchases: [purchase, ...current.purchases], ...(initialPayment ? { supplierPayments: [initialPayment, ...current.supplierPayments] } : {}) }));
    logAudit(`Recorded purchase ${draft.invoiceNo} from ${supplier.name}`, { module: "Purchases", referenceId: id, newValue: JSON.stringify(purchase) });
    return purchase;
  }, [addStock, data.suppliers, logAudit]);

  const recordReturn = useCallback((draft: Omit<SalesReturn, "id" | "date">) => {
    assertDayIsOpen(DEMO_TODAY);
    if (invoices.find((invoice) => invoice.id === draft.invoiceId)?.cancelledAt) throw new Error("A reversed invoice cannot receive another return or exchange.");
    if (!Number.isFinite(draft.weight) || draft.weight <= 0 || !Number.isFinite(draft.refund) || draft.refund < 0) throw new Error("Return weight and refund amount must be valid.");
    const id = uid("RET");
    const record: SalesReturn = { ...draft, id, date: DEMO_TODAY };
    const source = draft.item.trim();
    const returnedStock = addStock({ name: `Returned · ${source}`, purity: draft.purity, weight: draft.weight, making: 0, addedOn: DEMO_TODAY });
    setData((current) => ({ ...current, returns: [record, ...current.returns] }));
    logAudit(`${draft.status === "Exchange" ? "Processed exchange" : "Recorded sales return"} ${id}`, { module: "Returns", referenceId: id, newValue: JSON.stringify(record) });
    publishStoneStockReturned({ originalItem: source, returnId: id, returnedStock: { id: returnedStock.id, tag: returnedStock.tag } });
    return record;
  }, [addStock, invoices, logAudit]);

  const saveExpense = useCallback((draft: Omit<Expense, "id"> & { id?: string }) => {
    assertDayIsOpen(draft.date);
    const existing = draft.id ? data.expenses.find((expense) => expense.id === draft.id) : undefined;
    if (existing) assertDayIsOpen(existing.date);
    if (!Number.isFinite(draft.amount) || draft.amount <= 0 || !draft.description.trim()) throw new Error("Expense amount and description are required.");
    const id = draft.id ?? uid("EXP");
    const expense = { ...draft, id };
    setData((current) => ({ ...current, expenses: current.expenses.some((item) => item.id === id) ? current.expenses.map((item) => item.id === id ? expense : item) : [expense, ...current.expenses] }));
    logAudit(`${draft.id ? "Updated" : "Recorded"} expense ${id} · ₹${expense.amount}`, { module: "Expenses", referenceId: id, newValue: JSON.stringify(expense) });
    return expense;
  }, [data.expenses, logAudit]);

  const deleteExpense = useCallback((id: string) => {
    const expense = data.expenses.find((item) => item.id === id);
    if (!expense) return;
    assertDayIsOpen(expense.date);
    setData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== id) }));
    logAudit(`Deleted expense ${id}`, { module: "Expenses", referenceId: id, previousValue: JSON.stringify(expense) });
  }, [data.expenses, logAudit]);

  const closeDay = useCallback((input: Omit<DayClose, "id" | "expected" | "difference" | "closedBy" | "status">) => {
    const prior = data.dayCloses.find((item) => item.date === input.date && item.status === "Closed");
    if (prior) throw new Error(`The day ${input.date} is already closed.`);
    const cashValues = [input.openingCash, input.cashSales, input.ledgerReceived, input.otherReceived, input.cashExpenses, input.refunds, input.actual];
    if (cashValues.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Cash values must be valid non-negative amounts.");
    const expected = input.openingCash + input.cashSales + input.ledgerReceived + input.otherReceived - input.cashExpenses - input.refunds;
    if (input.actual !== expected && input.reason.trim().length < 2) throw new Error("Enter a reason for the cash difference.");
    const record: DayClose = { ...input, id: `DC-${Date.now().toString().slice(-6)}`, expected, difference: input.actual - expected, closedBy: actor(), status: "Closed" };
    setData((current) => ({ ...current, dayCloses: [record, ...current.dayCloses] }));
    logAudit(`Closed counter for ${input.date}`, { module: "Day Closing", referenceId: record.id, newValue: JSON.stringify(record) });
    return record;
  }, [data.dayCloses, logAudit]);

  const reopenDay = useCallback((id: string, reason: string) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can reopen a closed day.");
    if (reason.trim().length < 3) throw new Error("Enter a reason to reopen the day.");
    const record = data.dayCloses.find((item) => item.id === id && item.status === "Closed");
    if (!record) throw new Error("The selected closing is no longer active.");
    setData((current) => ({ ...current, dayCloses: current.dayCloses.map((item) => item.id === id ? { ...item, status: "Reopened" } : item) }));
    logAudit(`Owner reopened ${record.date}: ${reason}`, { module: "Day Closing", referenceId: id, previousValue: "Closed", newValue: `Reopened: ${reason}` });
  }, [data.dayCloses, logAudit]);

  const saveBooking = useCallback((draft: Omit<Booking, "id"> & { id?: string }) => {
    const id = draft.id ?? `BK-${Date.now().toString().slice(-6)}`;
    const booking = { ...draft, id, createdAt: draft.createdAt ?? DEMO_TODAY };
    setData((current) => ({ ...current, bookings: current.bookings.some((item) => item.id === id) ? current.bookings.map((item) => item.id === id ? booking : item) : [booking, ...current.bookings] }));
    logAudit(`${draft.id ? "Updated" : "Created"} booking ${id}`, { module: "Bookings", referenceId: id, newValue: JSON.stringify(booking) });
    if (!draft.id) {
      const customer = customers.find((item) => item.id === booking.customerId);
      publishWhatsAppEvent({
        id: `booking-created-${id}`,
        type: "booking_created",
        customerName: customer?.name ?? "Unknown customer",
        mobile: customer?.mobile ?? "",
        variables: { order_number: booking.reference, amount: Math.round(booking.estimatedAmount).toLocaleString("en-IN"), balance: Math.round(booking.estimatedAmount - booking.advance).toLocaleString("en-IN"), due_date: booking.deliveryDate },
      });
    }
    return booking;
  }, [customers, logAudit]);

  const convertBooking = useCallback((id: string) => {
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking || booking.status !== "Ready") throw new Error("Only ready bookings can be invoiced.");
    if (booking.invoiceId) throw new Error(`This booking was already invoiced as ${booking.invoiceId}.`);
    if (!(booking.weight > 0) || !(booking.estimatedAmount > 0)) throw new Error("Booking weight and estimate must be positive before invoicing.");
    const customer = customers.find((item) => item.id === booking.customerId);
    if (!customer) throw new Error("The booking customer could not be found.");
    const purity: Purity = booking.purity;
    const rate = booking.goldRate ?? goldRateForPurity(settings.rate22, settings.rate18, purity);
    const making = Math.max(0, booking.estimatedAmount - booking.weight * rate);
    const draft: InvoiceDraft = {
      customerId: customer.id,
      date: DEMO_TODAY,
      items: booking.items?.length
        ? booking.items.map((item) => ({ name: item.item, weight: item.weight, purity: item.purity, rate: item.goldRate, making: item.making, wastage: item.wastage, other: item.stones + item.other }))
        : [{ name: booking.item, weight: booking.weight, purity, rate, making, wastage: 0, other: 0 }],
      discount: booking.items?.reduce((sum, item) => sum + item.discount, 0) ?? 0,
      taxRate: booking.items?.[0]?.gstRate ?? settings.defaultTax,
      makingTaxRate: booking.items?.[0]?.gstRate ?? settings.defaultMakingTax,
      status: "Partial",
      amountPaid: booking.advance,
      notes: `Converted from booking ${booking.reference}`,
    };
    const firstPass = calcInvoice(draft);
    draft.status = booking.advance >= firstPass.grand ? "Paid" : booking.advance > 0 ? "Partial" : "Unpaid";
    draft.amountPaid = Math.min(booking.advance, firstPass.grand);
    const invoice = addInvoice(draft);
    const total = calcInvoice({ ...draft, items: draft.items.map((item, index) => ({ ...item, id: `${invoice.id}-${index + 1}` })) }).grand;
    setData((current) => ({ ...current, bookings: current.bookings.map((item) => item.id === id ? { ...item, status: "Delivered", invoiceId: invoice.id, estimatedAmount: total } : item) }));
    logAudit(`Converted booking ${id} to invoice ${invoice.id}`, { module: "Bookings", referenceId: id, newValue: invoice.id });
    return invoice.id;
  }, [addInvoice, customers, data.bookings, logAudit, settings.defaultMakingTax, settings.defaultTax, settings.rate18, settings.rate22]);

  const requestApproval = useCallback((input: Pick<ApprovalRequest, "action" | "module" | "reference" | "details" | "reason"> & { payload?: ApprovalRequest["payload"] }) => {
    if (!input.reference.trim() || !input.details.trim() || input.reason.trim().length < 3) throw new Error("Approval requests need a reference, details and a reason.");
    const request: ApprovalRequest = { ...input, id: uid("APR"), requestedBy: actor(), requestedAt: new Date().toISOString(), status: "Pending", reason: input.reason.trim() };
    setData((current) => ({ ...current, approvals: [request, ...current.approvals] }));
    logAudit(`Requested owner approval for ${input.action}`, { module: "Approvals", referenceId: request.id, newValue: JSON.stringify(request) });
    return request;
  }, [logAudit]);

  useEffect(() => {
    const onRequest = (event: Event) => requestApproval((event as CustomEvent<ApprovalSubmission>).detail);
    window.addEventListener(APPROVAL_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(APPROVAL_REQUEST_EVENT, onRequest);
  }, [requestApproval]);

  const adjustStock = useCallback((stockItemId: string, physicalWeight: number, reason: StockAdjustment["reason"]) => {
    assertDayIsOpen(DEMO_TODAY);
    const item = stock.find((record) => record.id === stockItemId && record.status === "In Stock");
    if (!item) throw new Error("Only an available stock item can be adjusted.");
    if (!Number.isFinite(physicalWeight) || physicalWeight < 0) throw new Error("Physical weight must be a non-negative number.");
    const adjustment: StockAdjustment = { id: uid("ADJ"), stockItemId, tag: item.tag, item: item.name, reason, systemWeight: item.weight, physicalWeight, difference: physicalWeight - item.weight, actor: actor(), date: new Date().toISOString() };
    adjustStockWeight(stockItemId, physicalWeight);
    setData((current) => ({ ...current, stockAdjustments: [adjustment, ...current.stockAdjustments] }));
    logAudit(`Stock adjustment ${item.tag} (${reason})`, { module: "Stock", referenceId: adjustment.id, previousValue: `${item.weight} g`, newValue: `${physicalWeight} g` });
    return adjustment;
  }, [adjustStockWeight, logAudit, stock]);

  const decideApproval = useCallback((id: string, decision: "Approved" | "Rejected", reason: string) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can decide approval requests.");
    const request = data.approvals.find((item) => item.id === id && item.status === "Pending");
    if (!request) throw new Error("This approval request has already been processed.");
    if (reason.trim().length < 3) throw new Error("Enter a decision reason of at least three characters.");
    if (decision === "Approved" && request.action === "Stock adjustment" && request.payload) {
      const { stockItemId, physicalWeight, reason: adjustmentReason } = request.payload;
      if (typeof stockItemId !== "string" || typeof physicalWeight !== "number" || typeof adjustmentReason !== "string" || !isAdjustmentReason(adjustmentReason)) throw new Error("Stock adjustment approval data is incomplete.");
      adjustStock(stockItemId, physicalWeight, adjustmentReason);
    }
    if (decision === "Approved" && request.action === "Refund" && request.payload && typeof request.payload.returnData === "string") {
      const draft: unknown = JSON.parse(request.payload.returnData);
      if (!isReturnDraft(draft)) throw new Error("Refund approval data is incomplete.");
      recordReturn(draft);
    }
    if (decision === "Approved" && request.action === "Large discount" && request.payload && typeof request.payload.invoiceDraft === "string") {
      const rawDraft: unknown = JSON.parse(request.payload.invoiceDraft);
      const parsed = billSchema.safeParse(rawDraft);
      if (!parsed.success) throw new Error("The held invoice is no longer valid. Re-create it before approval.");
      const invoice = addInvoice({ ...parsed.data, oldGold: parsed.data.oldGold.weight > 0 ? parsed.data.oldGold : undefined });
      markSoldByTags(parsed.data.items.map((item) => item.name));
      logAudit(`Approved discount created invoice ${invoice.id}`, { module: "Billing", referenceId: invoice.id, newValue: `Discount ₹${parsed.data.discount}` });
    }
    if (decision === "Approved" && request.action === "Loan release" && typeof request.payload?.loanId === "string") {
      if (!releaseLoan(request.payload.loanId)) throw new Error("The loan could not be released. Check its status and day-close state.");
    }
    if (decision === "Approved" && request.action === "Sensitive customer data change" && request.payload && typeof request.payload.customerId === "string" && typeof request.payload.customerDraft === "string") {
      const customerDraft: unknown = JSON.parse(request.payload.customerDraft);
      const parsed = customerSchema.safeParse(customerDraft);
      if (!parsed.success || !customers.some((customer) => customer.id === request.payload?.customerId)) throw new Error("The customer change request is invalid or the customer no longer exists.");
      updateCustomer(request.payload.customerId, parsed.data);
    }
    if (request.action === "Invoice reversal" && typeof request.payload?.reversalId === "string" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT, { detail: { reversalId: request.payload.reversalId, decision, reason: reason.trim() } }));
    }
    const updated = { ...request, status: decision, reason: reason.trim(), decisionBy: actor() } as ApprovalRequest;
    setData((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? updated : item) }));
    logAudit(`${decision} approval ${id}: ${reason.trim()}`, { module: "Approvals", referenceId: id, previousValue: "Pending", newValue: JSON.stringify(updated) });
  }, [addInvoice, adjustStock, customers, data.approvals, logAudit, markSoldByTags, recordReturn, releaseLoan, updateCustomer]);

  const value = useMemo<OperationsState>(() => ({
    ...data, saveSupplier, recordSupplierPayment, recordPurchase, recordReturn, saveExpense, deleteExpense, closeDay, reopenDay, saveBooking, convertBooking, requestApproval, decideApproval, adjustStock,
  }), [data, saveSupplier, recordSupplierPayment, recordPurchase, recordReturn, saveExpense, deleteExpense, closeDay, reopenDay, saveBooking, convertBooking, requestApproval, decideApproval, adjustStock]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOperations() {
  const context = useContext(Context);
  if (!context) throw new Error("useOperations must be used inside OperationsProvider");
  return context;
}
