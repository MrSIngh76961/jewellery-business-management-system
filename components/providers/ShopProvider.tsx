"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { invoiceBalance } from "@/lib/selectors";
import { seedLoans, seedOrders, seedPayments, seedStock, seedUsers } from "@/lib/seed-shop";
import { uid } from "@/lib/utils";
import { assertDayIsOpen } from "@/lib/operations";
import { publishApprovalRequest } from "@/lib/operations";
import { publishWhatsAppEvent } from "@/lib/whatsapp-automation";
import { publishStoneStockSold } from "@/lib/stones";
import { getSession } from "@/lib/services/auth";
import type { AppUser, KarigarOrder, Loan, OrderStatus, PayMode, Payment, Role, StockItem } from "@/lib/types";

export type StockDraft = Pick<StockItem, "name" | "purity" | "weight" | "making"> & Partial<Pick<StockItem, "purchaseCost" | "supplierId" | "purchaseId" | "addedOn">>;
export type OrderDraft = Pick<KarigarOrder, "customerId" | "description" | "karigar" | "estimate" | "advance" | "dueDate">;
export type LoanDraft = Pick<Loan, "customerId" | "item" | "weight" | "purity" | "principal" | "rate">;

interface ShopState {
  stock: StockItem[];
  addStock: (d: StockDraft) => StockItem;
  adjustStockWeight: (id: string, weight: number) => void;
  markSoldByTags: (names: string[]) => void;
  restoreSoldByTags: (tags: string[]) => void;
  updateStockPurity: (id: string, purity: StockItem["purity"]) => void;
  payments: Payment[];
  /** Applies a payment to the customer's oldest unpaid invoices first. Returns the amount allocated. */
  receivePayment: (customerId: string, amount: number, mode: PayMode, note: string) => number;
  orders: KarigarOrder[];
  addOrder: (d: OrderDraft) => void;
  setOrderStatus: (id: string, s: OrderStatus) => void;
  loans: Loan[];
  addLoan: (d: LoanDraft) => void;
  payLoanInterest: (id: string, amount: number) => void;
  releaseLoan: (id: string) => boolean;
  users: AppUser[];
  addUser: (d: { name: string; username: string; role: Role }) => void;
  updateUser: (id: string, patch: Partial<Pick<AppUser, "role" | "active">>) => void;
}

const Ctx = createContext<ShopState | null>(null);
const SHOP_STORAGE_KEY = "reinsoft-gold-shop-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { invoices, customers, settings, setInvoicePaid, logAudit } = useApp();
  const [stock, setStock] = useState(seedStock);
  const [payments, setPayments] = useState(seedPayments);
  const [orders, setOrders] = useState(seedOrders);
  const [loans, setLoans] = useState(seedLoans);
  const [users, setUsers] = useState(seedUsers);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(SHOP_STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isObject(saved)) throw new Error("Saved inventory and shop data is not an object.");
          if (Array.isArray(saved.stock)) setStock(saved.stock as StockItem[]);
          if (Array.isArray(saved.payments)) setPayments(saved.payments as Payment[]);
          if (Array.isArray(saved.orders)) setOrders(saved.orders as KarigarOrder[]);
          if (Array.isArray(saved.loans)) setLoans(saved.loans as Loan[]);
          if (Array.isArray(saved.users)) setUsers(saved.users as AppUser[]);
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load saved inventory: ${error.message}` : "Could not load saved inventory.", "error");
      } finally {
        setStorageLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      window.localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify({ stock, payments, orders, loans, users }));
    } catch (error) {
      toast(error instanceof Error ? `Could not save inventory: ${error.message}` : "Could not save inventory.", "error");
    }
  }, [loans, orders, payments, stock, storageLoaded, toast, users]);

  const addStock = useCallback(
    (d: StockDraft) => {
      assertDayIsOpen(d.addedOn ?? DEMO_TODAY);
      const max = stock.reduce((m, s) => Math.max(m, parseInt(s.tag.replace(/\D/g, ""), 10) || 0), 1000);
      const item: StockItem = { id: uid("st"), tag: `RG-T${max + 1}`, ...d, status: "In Stock", addedOn: d.addedOn ?? DEMO_TODAY };
      setStock((s) => [item, ...s]);
      logAudit(`Added stock ${item.tag} (${d.name})`, { module: "Stock", referenceId: item.tag, newValue: `${item.name}; ${item.weight} g · ${item.purity}` });
      return item;
    },
    [stock, logAudit],
  );

  const markSoldByTags = useCallback((names: string[]) => {
    const tags = names.map((n) => n.match(/RG-T\d+/)?.[0]).filter(Boolean) as string[];
    const sold = stock.filter((item) => tags.includes(item.tag) && item.status === "In Stock");
    if (sold.length) {
      setStock((s) => s.map((x) => (tags.includes(x.tag) ? { ...x, status: "Sold" } : x)));
      logAudit(`Sold stock ${sold.map((item) => item.tag).join(", ")}`, { module: "Stock", referenceId: sold.map((item) => item.tag).join(", "), previousValue: "In Stock", newValue: "Sold" });
      publishStoneStockSold(sold.map(({ id, tag }) => ({ id, tag })));
    }
  }, [logAudit, stock]);

  const adjustStockWeight = useCallback(
    (id: string, weight: number) => {
      setStock((items) => items.map((item) => (item.id === id ? { ...item, weight } : item)));
    },
    [],
  );

  const restoreSoldByTags = useCallback((tags: string[]) => {
    const restored = stock.filter((item) => tags.includes(item.tag) && item.status === "Sold");
    if (!restored.length) return;
    setStock((items) => items.map((item) => tags.includes(item.tag) && item.status === "Sold" ? { ...item, status: "In Stock" } : item));
    logAudit(`Restored stock after invoice reversal: ${restored.map((item) => item.tag).join(", ")}`, { module: "Stock", referenceId: tags.join(", "), previousValue: "Sold", newValue: "In Stock" });
  }, [logAudit, stock]);

  const updateStockPurity = useCallback((id: string, purity: StockItem["purity"]) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can apply assay results to stock purity.");
    const item = stock.find((candidate) => candidate.id === id);
    if (!item) throw new Error("Stock item not found.");
    if (item.purity === purity) return;
    setStock((items) => items.map((candidate) => candidate.id === id ? { ...candidate, purity } : candidate));
    logAudit(`Applied assay purity to ${item.tag}`, { module: "Assay", referenceId: item.tag, previousValue: item.purity, newValue: purity });
  }, [logAudit, stock]);

  const receivePayment = useCallback(
    (customerId: string, amount: number, mode: PayMode, note: string) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return 0;
      }
      let left = amount;
      const touched: string[] = [];
      [...invoices]
        .filter((i) => i.customerId === customerId && invoiceBalance(i) > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((i) => {
          if (left <= 0) return;
          const bal = invoiceBalance(i);
          const pay = Math.min(bal, left);
          setInvoicePaid(i.id, i.amountPaid + pay);
          touched.push(i.id);
          left -= pay;
        });
      const applied = amount - left;
      if (applied > 0) {
        setPayments((p) => [{ id: uid("pay"), customerId, date: DEMO_TODAY, amount: applied, mode, note, invoices: touched }, ...p]);
        const customer = customers.find((c) => c.id === customerId);
        const name = customer?.name ?? customerId;
        logAudit(`Received ₹${applied} from ${name} via ${mode}`, { module: "Ledger", referenceId: customerId, newValue: `${applied}; allocated to ${touched.join(", ")}` });
        publishWhatsAppEvent({
          id: `payment-${uid("evt")}`,
          type: "payment_received",
          customerName: name,
          mobile: customer?.mobile ?? "",
          variables: {
            amount: Math.round(applied).toLocaleString("en-IN"),
            balance: Math.round(Math.max(0, invoices.filter((invoice) => invoice.customerId === customerId).reduce((sum, invoice) => sum + invoiceBalance(invoice), 0) - applied)).toLocaleString("en-IN"),
          },
        });
      }
      return applied;
    },
    [invoices, customers, setInvoicePaid, logAudit, toast],
  );

  const addOrder = useCallback(
    (d: OrderDraft) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return;
      }
      const max = orders.reduce((m, o) => Math.max(m, parseInt(o.id.replace(/\D/g, ""), 10) || 0), 100);
      const cu = customers.find((c) => c.id === d.customerId);
      setOrders((o) => [{ id: `ORD-${max + 1}`, ...d, customerName: cu?.name ?? "Walk-in Customer", status: "Ordered" }, ...o]);
      logAudit(`Created karigar order ORD-${max + 1}`, { module: "Karigar Orders", referenceId: `ORD-${max + 1}`, newValue: `${d.description}; estimate ₹${d.estimate}` });
      publishWhatsAppEvent({
        id: `order-created-ORD-${max + 1}`,
        type: "order_created",
        customerName: cu?.name ?? "Walk-in Customer",
        mobile: cu?.mobile ?? "",
        variables: { order_number: `ORD-${max + 1}`, due_date: d.dueDate },
      });
    },
    [orders, customers, logAudit, toast],
  );

  const setOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return;
      }
      const order = orders.find((item) => item.id === id);
      setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
      logAudit(`Order ${id} marked ${status}`, { module: "Karigar Orders", referenceId: id, newValue: status });
      if (order && order.status !== status && (status === "Ready" || status === "Delivered")) {
        const customer = customers.find((item) => item.id === order.customerId);
        publishWhatsAppEvent({
          id: `order-${status.toLowerCase()}-${id}`,
          type: status === "Ready" ? "order_ready" : "order_delivered",
          customerName: order.customerName,
          mobile: customer?.mobile ?? "",
          variables: { order_number: id, due_date: order.dueDate },
        });
      }
    },
    [customers, logAudit, orders, toast],
  );

  const addLoan = useCallback(
    (d: LoanDraft) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return;
      }
      const max = loans.reduce((m, l) => Math.max(m, parseInt(l.id.replace(/\D/g, ""), 10) || 0), 200);
      const cu = customers.find((c) => c.id === d.customerId);
      setLoans((l) => [{ id: `GL-${max + 1}`, ...d, customerName: cu?.name ?? "Walk-in Customer", startDate: DEMO_TODAY, status: "Active", paidInterest: 0 }, ...l]);
      logAudit(`Created girvi GL-${max + 1}`, { module: "Loans", referenceId: `GL-${max + 1}`, newValue: `Principal ₹${d.principal}; ${d.weight} g ${d.purity}` });
    },
    [loans, customers, logAudit, toast],
  );

  const payLoanInterest = useCallback(
    (id: string, amount: number) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return;
      }
      setLoans((l) => l.map((x) => (x.id === id ? { ...x, paidInterest: x.paidInterest + amount } : x)));
      logAudit(`Interest ₹${amount} received on ${id}`, { module: "Loans", referenceId: id, newValue: `Interest payment ₹${amount}` });
    },
    [logAudit, toast],
  );

  const releaseLoan = useCallback(
    (id: string) => {
      try {
        assertDayIsOpen(DEMO_TODAY);
      } catch (error) {
        toast(error instanceof Error ? error.message : "The counter is closed.", "error");
        return false;
      }
      const loan = loans.find((item) => item.id === id && item.status === "Active");
      if (!loan) {
        toast(`Active loan ${id} was not found.`, "error");
        return false;
      }
      const session = getSession();
      if (settings.approvalRequireLoanRelease && session?.role !== "Owner") {
        publishApprovalRequest({ action: "Loan release", module: "Loans", reference: id, details: `${loan.customerName} · principal ₹${loan.principal} · ${loan.item}`, reason: "Loan release requires Owner approval.", payload: { loanId: id } });
        toast(`Loan ${id} release request sent for Owner approval.`, "info");
        return false;
      }
      setLoans((l) => l.map((x) => (x.id === id ? { ...x, status: "Released", releasedOn: DEMO_TODAY } : x)));
      logAudit(`Released girvi ${id}`, { module: "Loans", referenceId: id, previousValue: "Active", newValue: "Released" });
      toast(`Loan ${id} released`);
      return true;
    },
    [logAudit, loans, settings.approvalRequireLoanRelease, toast],
  );

  const addUser = useCallback(
    (d: { name: string; username: string; role: Role }) => {
      setUsers((u) => [...u, { id: uid("u"), ...d, active: true }]);
      logAudit(`Added user ${d.username} (${d.role})`, { module: "Users", referenceId: d.username, newValue: d.role });
    },
    [logAudit],
  );

  const updateUser = useCallback(
    (id: string, patch: Partial<Pick<AppUser, "role" | "active">>) => {
      const previous = users.find((user) => user.id === id);
      setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      logAudit("Updated user access", { module: "Users", referenceId: id, previousValue: previous ? `${previous.role}; active=${previous.active}` : undefined, newValue: `${patch.role ?? previous?.role}; active=${patch.active ?? previous?.active}` });
    },
    [logAudit, users],
  );

  const value = useMemo<ShopState>(
    () => ({ stock, addStock, adjustStockWeight, markSoldByTags, restoreSoldByTags, updateStockPurity, payments, receivePayment, orders, addOrder, setOrderStatus, loans, addLoan, payLoanInterest, releaseLoan, users, addUser, updateUser }),
    [stock, addStock, adjustStockWeight, markSoldByTags, restoreSoldByTags, updateStockPurity, payments, receivePayment, orders, addOrder, setOrderStatus, loans, addLoan, payLoanInterest, releaseLoan, users, addUser, updateUser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
