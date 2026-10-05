export type Purity = "22K" | "18K" | "24K" | (string & {});
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";

export interface GoldItem {
  id: string;
  name: string;
  weight: number;
  purity: Purity;
  rate: number;
  making: number;
  wastage: number;
  other: number;
}

export interface OldGold {
  description: string;
  weight: number;
  purity: Purity;
  rate: number;
  /** Melting / refining deduction in percent. */
  deduction: number;
}

export interface GoldRateEntry {
  id: string;
  date: string;
  rate22: number;
  rate18: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  email?: string;
  birthday?: string;
  anniversary?: string;
  pan?: string;
  kycVerified?: boolean;
  /** Lifetime figures from before the invoices held in the current dataset. */
  priorPurchases: number;
  priorTotal: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  date: string;
  items: GoldItem[];
  discount: number;
  /** GST % on gold value + wastage. */
  taxRate: number;
  /** GST % on making and other charges; falls back to taxRate for older invoices. */
  makingTaxRate?: number;
  oldGold?: OldGold;
  status: PaymentStatus;
  amountPaid: number;
  notes: string;
  verificationId?: string;
  cancelledAt?: string;
  reversalId?: string;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  type: "Automatic" | "Manual" | "Pre-restore";
  sizeMb: number;
  status: "Successful" | "Failed";
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  module?: string;
  referenceId?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Settings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  logo: string;
  invoicePrefix: string;
  includeYear: boolean;
  numberPadding: number;
  /** Default GST % on gold. */
  defaultTax: number;
  defaultMakingTax: number;
  hsnCode: string;
  oldGoldDeduction: number;
  currency: "INR";
  invoiceFooter: string;
  rate22: number;
  making22: number;
  wastage22: number;
  rate18: number;
  making18: number;
  wastage18: number;
  whatsappProvider: "Click-to-chat (wa.me)" | "WhatsApp Cloud API" | "Twilio";
  whatsappSender: string;
  whatsappTemplate: string;
  sessionTimeout: number;
  auditEnabled: boolean;
  approvalDiscountPercent: number;
  approvalRefundLimit: number;
  approvalRequireRefund: boolean;
  approvalRequireStockAdjustment: boolean;
  approvalRequireInvoiceCancellation: boolean;
  approvalRequireRateOverride: boolean;
  approvalRequireLedgerWriteOff: boolean;
  approvalRequireLoanRelease: boolean;
  approvalRequireSensitiveDataChange: boolean;
  autoBackup: boolean;
  backupTime: string;
  retentionDays: number;
}

export interface StockItem {
  id: string;
  tag: string;
  name: string;
  purity: Purity;
  weight: number;
  making: number;
  status: "In Stock" | "Sold";
  addedOn: string;
  purchaseCost?: number;
  supplierId?: string;
  purchaseId?: string;
}

export type PayMode = "Cash" | "UPI" | "Card" | "Bank";
export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  mode: PayMode;
  note: string;
  invoices: string[];
}

export type OrderStatus = "Ordered" | "Making" | "Ready" | "Delivered";
export interface KarigarOrder {
  id: string;
  customerId: string;
  customerName: string;
  description: string;
  karigar: string;
  estimate: number;
  advance: number;
  dueDate: string;
  status: OrderStatus;
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  item: string;
  weight: number;
  purity: Purity;
  principal: number;
  /** Monthly interest in percent. */
  rate: number;
  startDate: string;
  status: "Active" | "Released";
  releasedOn?: string;
  paidInterest: number;
}

export type Role = "Owner" | "Staff" | "Accountant";
export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
}