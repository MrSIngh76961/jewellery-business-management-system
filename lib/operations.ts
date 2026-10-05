import type { Purity } from "./types";

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  pan: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  invoiceNo: string;
  date: string;
  item: string;
  grossWeight: number;
  netWeight: number;
  purity: Purity;
  rate: number;
  making: number;
  other: number;
  gst: number;
  total: number;
  paid: number;
  paymentMethod: "Cash" | "UPI" | "Card" | "Bank";
  stockItemId: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  date: string;
  amount: number;
  mode: "Cash" | "UPI" | "Card" | "Bank";
  note: string;
  allocations: { purchaseId: string; amount: number }[];
}

export interface SalesReturn {
  id: string;
  invoiceId: string;
  customerId: string;
  item: string;
  reason: string;
  weight: number;
  purity: Purity;
  goldValue: number;
  makingAdjustment: number;
  gstAdjustment: number;
  refund: number;
  exchangeItem: string;
  status: "Refunded" | "Exchange" | "Pending";
  date: string;
}

export type ExpenseCategory =
  | "Rent"
  | "Salary"
  | "Electricity"
  | "Transport"
  | "Packaging"
  | "Repair"
  | "Marketing"
  | "Office"
  | "Miscellaneous";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: "Cash" | "UPI" | "Card" | "Bank";
  description: string;
  reference: string;
}

export interface DayClose {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  ledgerReceived: number;
  otherReceived: number;
  cashExpenses: number;
  refunds: number;
  expected: number;
  actual: number;
  difference: number;
  reason: string;
  closedBy: string;
  status: "Closed" | "Reopened";
}

export interface Booking {
  id: string;
  customerId: string;
  reference: string;
  item: string;
  category: string;
  purity: Purity;
  goldRate?: number;
  items?: {
    item: string;
    weight: number;
    purity: Purity;
    goldRate: number;
    making: number;
    wastage: number;
    stones: number;
    other: number;
    discount: number;
    gstRate: number;
  }[];
  weight: number;
  estimatedAmount: number;
  advance: number;
  deliveryDate: string;
  notes: string;
  status: "Pending" | "Making" | "Ready" | "Delivered" | "Cancelled";
  invoiceId?: string;
  createdAt?: string;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  module: string;
  reference: string;
  details: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  decisionBy?: string;
  payload?: Record<string, string | number | boolean | null>;
}

export type ApprovalSubmission = Pick<ApprovalRequest, "action" | "module" | "reference" | "details" | "reason"> & { payload?: ApprovalRequest["payload"] };
export const APPROVAL_REQUEST_EVENT = "reinsoft-gold:approval-request";
export const INVOICE_REVERSAL_APPROVAL_DECIDED_EVENT = "reinsoft-gold:invoice-reversal-approval-decided";

export function publishApprovalRequest(request: ApprovalSubmission) {
  if (typeof window === "undefined") throw new Error("Approval requests can only be submitted in the browser.");
  window.dispatchEvent(new CustomEvent<ApprovalSubmission>(APPROVAL_REQUEST_EVENT, { detail: request }));
}

export interface StockAdjustment {
  id: string;
  stockItemId: string;
  tag: string;
  item: string;
  reason: "Damage" | "Lost" | "Testing/Melting" | "Correction" | "Manual adjustment" | "Other";
  systemWeight: number;
  physicalWeight: number;
  difference: number;
  actor: string;
  date: string;
}

export interface OperationsData {
  suppliers: Supplier[];
  purchases: Purchase[];
  supplierPayments: SupplierPayment[];
  returns: SalesReturn[];
  expenses: Expense[];
  dayCloses: DayClose[];
  bookings: Booking[];
  approvals: ApprovalRequest[];
  stockAdjustments: StockAdjustment[];
}

export const emptyOperations: OperationsData = {
  suppliers: [
    { id: "SUP-1001", name: "Shree Ganesh Bullion", phone: "+91 98220 12345", email: "sales@shreeganesh.example", address: "Zaveri Bazaar, Mumbai", gstin: "27AABCS1234F1Z5", pan: "AABCS1234F" },
    { id: "SUP-1002", name: "Lakshmi Jewellers Wholesale", phone: "+91 98760 23456", email: "accounts@lakshmi.example", address: "Johari Bazaar, Jaipur", gstin: "08AAECL5678Q1Z2", pan: "AAECL5678Q" },
  ],
  purchases: [
    { id: "PUR-DEMO-1001", supplierId: "SUP-1001", invoiceNo: "SGB-4862", date: "2026-09-10", item: "Gold Ring", grossWeight: 4.35, netWeight: 4.2, purity: "22K", rate: 7000, making: 450, other: 100, gst: 899, total: 30849, paid: 15000, paymentMethod: "Bank", stockItemId: "st-1" },
    { id: "PUR-DEMO-1002", supplierId: "SUP-1002", invoiceNo: "LJW-2917", date: "2026-09-12", item: "Gold Chain", grossWeight: 13.1, netWeight: 12.8, purity: "22K", rate: 5850, making: 900, other: 150, gst: 2278, total: 78208, paid: 78208, paymentMethod: "UPI", stockItemId: "st-2" },
  ],
  supplierPayments: [
    { id: "SPAY-DEMO-1000", supplierId: "SUP-1001", date: "2026-09-10", amount: 15000, mode: "Bank", note: "Payment with supplier invoice", allocations: [{ purchaseId: "PUR-DEMO-1001", amount: 15000 }] },
    { id: "SPAY-DEMO-1001", supplierId: "SUP-1001", date: "2026-09-15", amount: 10000, mode: "Bank", note: "NEFT settlement", allocations: [{ purchaseId: "PUR-DEMO-1001", amount: 10000 }] },
    { id: "SPAY-DEMO-1002", supplierId: "SUP-1002", date: "2026-09-12", amount: 78208, mode: "UPI", note: "Paid in full", allocations: [{ purchaseId: "PUR-DEMO-1002", amount: 78208 }] },
  ],
  returns: [],
  expenses: [
    { id: "EXP-1001", category: "Rent", amount: 28000, date: "2026-09-01", paymentMethod: "Bank", description: "September showroom rent", reference: "RENT-SEP" },
    { id: "EXP-1002", category: "Electricity", amount: 6840, date: "2026-09-12", paymentMethod: "UPI", description: "Monthly electricity bill", reference: "MSEB-0912" },
  ],
  dayCloses: [],
  bookings: [
    { id: "BK-1001", customerId: "C-1001", reference: "BR-2609-01", item: "Custom bridal necklace", category: "Necklace", purity: "22K", weight: 28, estimatedAmount: 225000, advance: 50000, deliveryDate: "2026-10-12", notes: "Antique finish; customer-provided reference", status: "Making" },
  ],
  approvals: [],
  stockAdjustments: [],
};

export function assertDayIsOpen(date: string) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem("reinsoft-gold-operations-v1");
  if (!raw) return;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    throw new Error("Saved day-close data is unreadable. Ask an Owner to resolve it before recording transactions.");
  }
  if (!saved || typeof saved !== "object" || !("dayCloses" in saved) || !Array.isArray(saved.dayCloses)) {
    throw new Error("Saved day-close data is invalid. Ask an Owner to resolve it before recording transactions.");
  }
  const closed = saved.dayCloses.some((entry) => entry && typeof entry === "object" && "date" in entry && entry.date === date && "status" in entry && entry.status === "Closed");
  if (closed) throw new Error(`The counter for ${date} is closed. An Owner must reopen it before changing transactions.`);
}
