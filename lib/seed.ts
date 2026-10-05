import { calcInvoice } from "./billing";
import type { AuditLog, BackupRecord, Customer, GoldItem, GoldRateEntry, Invoice, PaymentStatus, Purity, Settings } from "./types";
import { goldRateForPurity } from "./purity";

export const defaultSettings: Settings = {
  businessName: "ReinSoft Gold",
  phone: "+91 98765 00000",
  email: "billing@reinsoft.gold",
  address: "Main Market, India",
  gstin: "27ABCDE1234F1Z5",
  logo: "",
  invoicePrefix: "RG",
  includeYear: true,
  numberPadding: 4,
  defaultTax: 3,
  defaultMakingTax: 5,
  hsnCode: "7113",
  oldGoldDeduction: 4,
  currency: "INR",
  invoiceFooter: "Thank you for choosing us. Goods once sold will be exchanged as per shop policy. Subject to local jurisdiction.",
  rate22: 7350,
  making22: 650,
  wastage22: 2,
  rate18: 6050,
  making18: 950,
  wastage18: 1.5,
  whatsappProvider: "Click-to-chat (wa.me)",
  whatsappSender: "+91 98765 00000",
  whatsappTemplate:
    "Hello {customer}, thank you for shopping at {shop}.\nInvoice {invoice} dated {date}\nTotal: {total} | Balance due: {balance}",
  sessionTimeout: 30,
  auditEnabled: true,
  approvalDiscountPercent: 10,
  approvalRefundLimit: 10000,
  approvalRequireRefund: true,
  approvalRequireStockAdjustment: true,
  approvalRequireInvoiceCancellation: true,
  approvalRequireRateOverride: true,
  approvalRequireLedgerWriteOff: true,
  approvalRequireLoanRelease: true,
  approvalRequireSensitiveDataChange: true,
  autoBackup: true,
  backupTime: "02:00",
  retentionDays: 30,
};

export function defaultItem(s: Settings, purity: Purity = "22K", name = "Gold Ring", configured: Array<{ id: string; fineness: number }> = []) {
  const is18K = purity === "18K";
  return {
    name,
    weight: 0,
    purity,
    rate: goldRateForPurity(s.rate22, s.rate18, purity, configured),
    making: is18K ? s.making18 : s.making22,
    wastage: is18K ? s.wastage18 : s.wastage22,
    other: 0,
  };
}

export const emptyOldGold = (s: Settings) => ({ description: "Old gold ornaments", weight: 0, purity: "22K" as Purity, rate: s.rate22, deduction: s.oldGoldDeduction });

const c = (id: string, name: string, mobile: string, priorPurchases: number, priorTotal: number, address: string): Customer => ({
  id,
  name,
  mobile,
  address,
  priorPurchases,
  priorTotal,
  createdAt: "2025-04-12",
});

export const seedCustomers: Customer[] = [
  c("C-1001", "Ramesh Kumar", "+91 98765 43210", 8, 482600, "12, Gandhi Nagar, Pune"),
  c("C-1002", "Priya Sharma", "+91 98123 45678", 4, 216450, "45, Lake View Colony, Indore"),
  c("C-1003", "Amit Verma", "+91 98987 11223", 6, 374900, "7, Civil Lines, Lucknow"),
  c("C-1004", "Neha Gupta", "+91 97654 22110", 3, 148300, "21, Sector 14, Noida"),
  c("C-1005", "Suresh Das", "+91 98221 33445", 10, 625750, "88, Park Street, Kolkata"),
  c("C-1006", "Sunita Devi", "+91 99112 20045", 5, 262800, "3, Ashok Vihar, Delhi"),
  c("C-1007", "Vikram Singh", "+91 98100 77621", 7, 418250, "19, Model Town, Jaipur"),
  c("C-1008", "Anjali Mehta", "+91 98330 18842", 2, 96400, "56, Marine Drive, Mumbai"),
  c("C-1009", "Rajesh Patel", "+91 97250 66310", 9, 553900, "14, Navrangpura, Ahmedabad"),
  c("C-1010", "Kavita Joshi", "+91 98765 90871", 3, 171200, "30, Shivaji Road, Nashik"),
  c("C-1011", "Manoj Tiwari", "+91 99887 45120", 4, 233500, "9, Station Road, Varanasi"),
  c("C-1012", "Deepak Rao", "+91 98450 31276", 6, 347650, "62, Jayanagar, Bengaluru"),
];

type Tpl = Omit<GoldItem, "id">;
const TPL: Record<string, Tpl> = {
  ring: { name: "Gold Ring", weight: 8.25, purity: "22K", rate: 7350, making: 650, wastage: 2, other: 0 },
  chain: { name: "Gold Chain", weight: 12.5, purity: "18K", rate: 6050, making: 950, wastage: 1.5, other: 120 },
  necklace: { name: "Necklace Set", weight: 24.8, purity: "22K", rate: 7350, making: 2400, wastage: 3, other: 250 },
  bangles: { name: "Gold Bangles (Pair)", weight: 32, purity: "22K", rate: 7350, making: 3200, wastage: 2.5, other: 0 },
  earrings: { name: "Jhumka Earrings", weight: 5.4, purity: "22K", rate: 7350, making: 850, wastage: 2, other: 60 },
  pendant: { name: "Diamond Pendant", weight: 3.2, purity: "18K", rate: 6050, making: 1800, wastage: 1.5, other: 1500 },
  coin: { name: "Gold Coin", weight: 10, purity: "22K", rate: 7350, making: 300, wastage: 0, other: 0 },
  mangalsutra: { name: "Mangalsutra", weight: 18.6, purity: "22K", rate: 7350, making: 1900, wastage: 2.5, other: 150 },
};

const withIds = (prefix: string, items: Tpl[]): GoldItem[] =>
  items.map((t, i) => ({ ...t, id: `${prefix}-${i + 1}` }));

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildInvoice(
  no: number,
  custIdx: number,
  date: string,
  items: Tpl[],
  status: PaymentStatus,
  partialPaid = 0,
  discount = 0,
): Invoice {
  const cu = seedCustomers[custIdx];
  const id = `RG-2026-${String(no).padStart(4, "0")}`;
  const base = { items: withIds(id, items), discount, taxRate: 3, status, amountPaid: partialPaid };
  const grand = calcInvoice(base).grand;
  return {
    id,
    customerId: cu.id,
    customerName: cu.name,
    customerMobile: cu.mobile,
    date,
    items: base.items,
    discount,
    taxRate: 3,
    status,
    amountPaid: status === "Paid" ? grand : status === "Unpaid" ? 0 : partialPaid,
    notes: "",
  };
}

function generate(): Invoice[] {
  const r = rng(2026);
  const keys = Object.keys(TPL);
  const out: Invoice[] = [];
  for (let no = 13; no <= 43; no++) {
    const day = 1 + Math.floor(((no - 13) / 31) * 15);
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    const count = r() > 0.55 ? 2 : 1;
    const items: Tpl[] = [];
    for (let k = 0; k < count; k++) {
      const t = TPL[keys[Math.floor(r() * keys.length)]];
      items.push({ ...t, weight: Math.round(t.weight * (0.75 + r() * 0.6) * 100) / 100 });
    }
    const roll = r();
    const status: PaymentStatus = roll < 0.68 ? "Paid" : roll < 0.86 ? "Partial" : "Unpaid";
    const tmp = calcInvoice({ items, discount: 0, taxRate: 3, status: "Unpaid", amountPaid: 0 });
    out.push(
      buildInvoice(no, Math.floor(r() * seedCustomers.length), date, items, status, Math.round((tmp.grand * 0.4) / 100) * 100),
    );
  }
  return out;
}

export const seedInvoices: Invoice[] = [
  buildInvoice(48, 0, "2026-09-17", [TPL.ring, { ...TPL.chain, weight: 3.2, other: 120 }], "Paid"),
  buildInvoice(47, 1, "2026-09-17", [TPL.necklace], "Partial", 60000),
  buildInvoice(46, 2, "2026-09-16", [TPL.bangles, TPL.pendant], "Paid", 0, 500),
  buildInvoice(45, 3, "2026-09-16", [TPL.earrings, TPL.coin], "Unpaid"),
  buildInvoice(44, 4, "2026-09-15", [TPL.mangalsutra], "Paid"),
  ...generate().reverse(),
];

export const seedBackups: BackupRecord[] = [
  { id: "bk-1", createdAt: "2026-09-17T02:00:00", type: "Automatic", sizeMb: 84.6, status: "Successful" },
  { id: "bk-2", createdAt: "2026-09-16T02:00:00", type: "Automatic", sizeMb: 82.9, status: "Successful" },
  { id: "bk-3", createdAt: "2026-09-15T14:22:00", type: "Manual", sizeMb: 81.7, status: "Successful" },
  { id: "bk-4", createdAt: "2026-09-15T02:00:00", type: "Automatic", sizeMb: 80.4, status: "Successful" },
  { id: "bk-5", createdAt: "2026-09-14T02:00:00", type: "Automatic", sizeMb: 78.8, status: "Successful" },
];

export const seedAudit: AuditLog[] = [
  { id: "a-1", at: "2026-09-17T09:12:00", actor: "Admin", action: "Signed in" },
  { id: "a-2", at: "2026-09-17T09:40:00", actor: "Admin", action: "Created invoice RG-2026-0047" },
  { id: "a-3", at: "2026-09-16T18:05:00", actor: "Admin", action: "Updated gold rates (22K ₹7,350 / 18K ₹6,050)" },
  { id: "a-4", at: "2026-09-16T11:30:00", actor: "Admin", action: "Exported sales CSV" },
  { id: "a-5", at: "2026-09-15T14:22:00", actor: "Admin", action: "Created manual backup" },
];

/** Archived monthly figures for periods before the live invoice dataset. */
export const MONTH_HISTORY = [
  { label: "Jan", sales: 2142000, invoices: 118, gold: 2910 },
  { label: "Feb", sales: 2478000, invoices: 134, gold: 3260 },
  { label: "Mar", sales: 2615000, invoices: 141, gold: 3390 },
  { label: "Apr", sales: 2310000, invoices: 126, gold: 3020 },
  { label: "May", sales: 2864000, invoices: 152, gold: 3640 },
  { label: "Jun", sales: 2790000, invoices: 149, gold: 3560 },
  { label: "Jul", sales: 3120000, invoices: 168, gold: 3880 },
  { label: "Aug", sales: 2980000, invoices: 161, gold: 3790 },
];

export const YEAR_HISTORY = [
  { label: "2022", sales: 16200000, invoices: 1180, gold: 21400 },
  { label: "2023", sales: 21100000, invoices: 1460, gold: 26800 },
  { label: "2024", sales: 25800000, invoices: 1690, gold: 31200 },
  { label: "2025", sales: 30400000, invoices: 1810, gold: 35900 },
];

export const seedRates: GoldRateEntry[] = [
  ['2026-09-11', 7210, 5935],
  ['2026-09-12', 7240, 5960],
  ['2026-09-13', 7225, 5948],
  ['2026-09-14', 7270, 5985],
  ['2026-09-15', 7300, 6010],
  ['2026-09-16', 7320, 6030],
  ['2026-09-17', 7350, 6050],
].map(([date, rate22, rate18]) => ({ id: `gr-${date}`, date: String(date), rate22: Number(rate22), rate18: Number(rate18) }));
