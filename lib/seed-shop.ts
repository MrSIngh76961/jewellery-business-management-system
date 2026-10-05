import type { AppUser, Customer, KarigarOrder, Loan, Payment, StockItem } from "./types";

const EXTRAS: Record<string, Pick<Customer, "birthday" | "anniversary" | "pan" | "kycVerified">> = {
  "C-1001": { birthday: "1984-09-20", anniversary: "2010-02-14", pan: "ABCPK1234F", kycVerified: true },
  "C-1002": { birthday: "1990-09-18", pan: "BCDPS2345G", kycVerified: true },
  "C-1003": { birthday: "1988-11-03", anniversary: "2015-09-25" },
  "C-1005": { birthday: "1979-09-29", pan: "CDEPD3456H", kycVerified: true },
  "C-1007": { birthday: "1986-12-12" },
  "C-1009": { birthday: "1981-09-21", anniversary: "2008-12-02", pan: "DEFPP4567J", kycVerified: false },
};

export const withExtras = (list: Customer[]): Customer[] => list.map((c) => ({ ...c, ...EXTRAS[c.id] }));

const stock = (n: number, name: string, purity: "22K" | "18K", weight: number, making: number): StockItem => ({
  id: `st-${n}`,
  tag: `RG-T${String(1000 + n)}`,
  name,
  purity,
  weight,
  making,
  status: "In Stock",
  addedOn: "2026-09-10",
});

export const seedStock: StockItem[] = [
  stock(1, "Gold Ring (Plain)", "22K", 4.2, 450),
  stock(2, "Gold Chain 20in", "22K", 12.8, 900),
  stock(3, "Jhumka Earrings", "22K", 6.4, 700),
  stock(4, "Bangles Pair", "22K", 28.5, 1500),
  stock(5, "Mangalsutra", "22K", 15.1, 1100),
  stock(6, "Pendant Set", "18K", 7.3, 800),
  stock(7, "Diamond-cut Chain", "18K", 9.6, 950),
  stock(8, "Nose Pin", "22K", 0.9, 250),
  stock(9, "Gold Coin 10g", "22K", 10, 300),
  { ...stock(10, "Kada (Gents)", "22K", 32.4, 1800), status: "Sold" },
];

export const seedPayments: Payment[] = [
  { id: "pay-1", customerId: "C-1002", date: "2026-09-16", amount: 20000, mode: "UPI", note: "Part payment", invoices: ["RG-2026-0047"] },
];

export const seedOrders: KarigarOrder[] = [
  { id: "ORD-101", customerId: "C-1001", customerName: "Ramesh Kumar", description: "Custom haar set with jhumka", karigar: "Mahesh Soni", estimate: 185000, advance: 50000, dueDate: "2026-09-28", status: "Making" },
  { id: "ORD-102", customerId: "C-1005", customerName: "Suresh Das", description: "Gents kada 40g", karigar: "Ravi Verma", estimate: 295000, advance: 100000, dueDate: "2026-09-20", status: "Ready" },
  { id: "ORD-103", customerId: "C-1008", customerName: "Anjali Mehta", description: "Wedding mangalsutra", karigar: "Mahesh Soni", estimate: 98000, advance: 20000, dueDate: "2026-10-05", status: "Ordered" },
  { id: "ORD-100", customerId: "C-1003", customerName: "Amit Verma", description: "Gold chain 18in", karigar: "Ravi Verma", estimate: 72000, advance: 72000, dueDate: "2026-09-10", status: "Delivered" },
];

export const seedLoans: Loan[] = [
  { id: "GL-201", customerId: "C-1004", customerName: "Neha Gupta", item: "Gold necklace", weight: 24, purity: "22K", principal: 120000, rate: 1.5, startDate: "2026-06-17", status: "Active", paidInterest: 0 },
  { id: "GL-202", customerId: "C-1010", customerName: "Kavita Joshi", item: "Bangles pair", weight: 30, purity: "22K", principal: 150000, rate: 1.25, startDate: "2026-08-02", status: "Active", paidInterest: 3750 },
  { id: "GL-200", customerId: "C-1011", customerName: "Manoj Tiwari", item: "Gold chain", weight: 12, purity: "22K", principal: 60000, rate: 2, startDate: "2026-03-10", status: "Released", releasedOn: "2026-08-10", paidInterest: 6000 },
];

export const seedUsers: AppUser[] = [
  { id: "u-1", name: "Admin", username: "admin", role: "Owner", active: true },
  { id: "u-2", name: "Rohit (Counter Staff)", username: "staff", role: "Staff", active: true },
  { id: "u-3", name: "Meena (Accounts)", username: "accounts", role: "Accountant", active: true },
];

/** Months elapsed (min 1, part month counts as a full month). */
export function loanMonths(startDate: string, until: string) {
  const a = new Date(startDate);
  const b = new Date(until);
  const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() > a.getDate() ? 1 : 0);
  return Math.max(1, m);
}

export function loanInterest(l: Loan, until: string) {
  const end = l.status === "Released" && l.releasedOn ? l.releasedOn : until;
  return Math.round((l.principal * l.rate * loanMonths(l.startDate, end)) / 100);
}

/** 1 point per ₹100 spent. */
export const loyaltyPoints = (total: number) => Math.floor(total / 100);
export const loyaltyTier = (pts: number) => (pts >= 5000 ? "Gold" : pts >= 2500 ? "Silver" : "Bronze");
