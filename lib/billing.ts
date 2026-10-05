import type { GoldItem, PaymentStatus } from "./types";

/** Coerces any user-entered value to a finite number (NaN / empty → 0). */
export const toNum = (v: unknown): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
};

export interface ItemInput {
  weight?: unknown;
  rate?: unknown;
  wastage?: unknown;
  making?: unknown;
  other?: unknown;
}

export interface ItemCalc {
  goldValue: number;
  wastageAmount: number;
  total: number;
}

export function calcItem(item: ItemInput): ItemCalc {
  const goldValue = toNum(item.weight) * toNum(item.rate);
  const wastageAmount = (goldValue * toNum(item.wastage)) / 100;
  const total = Math.round(goldValue + wastageAmount + toNum(item.making) + toNum(item.other));
  return { goldValue, wastageAmount, total };
}

export interface OldGoldInput {
  weight?: unknown;
  rate?: unknown;
  deduction?: unknown;
}

/** Value credited for exchanged old gold after the melting deduction. */
export const calcOldGold = (g?: OldGoldInput | null) => {
  if (!g) return 0;
  const gross = toNum(g.weight) * toNum(g.rate);
  const ded = Math.min(Math.max(0, toNum(g.deduction)), 100);
  return Math.round(gross * (1 - ded / 100));
};

export interface InvoiceCalcInput {
  items: ItemInput[];
  discount: unknown;
  taxRate: unknown;
  /** GST % on making + other charges. Defaults to taxRate when omitted. */
  makingTaxRate?: unknown;
  oldGold?: OldGoldInput | null;
  status: PaymentStatus;
  amountPaid: unknown;
}

export interface InvoiceCalc {
  itemTotals: number[];
  subtotal: number;
  discount: number;
  taxable: number;
  goldTax: number;
  makingTax: number;
  tax: number;
  cgst: number;
  sgst: number;
  oldGold: number;
  grand: number;
  paid: number;
  balance: number;
}

export function calcInvoice(input: InvoiceCalcInput): InvoiceCalc {
  const calcs = input.items.map(calcItem);
  const itemTotals = calcs.map((c) => c.total);
  const subtotal = itemTotals.reduce((a, b) => a + b, 0);
  const discount = Math.min(Math.max(0, toNum(input.discount)), subtotal);
  const taxable = subtotal - discount;

  const goldRate = Math.max(0, toNum(input.taxRate));
  const makingRate = input.makingTaxRate == null ? goldRate : Math.max(0, toNum(input.makingTaxRate));
  const goldPart = Math.min(calcs.reduce((s, c) => s + c.goldValue + c.wastageAmount, 0), subtotal);
  const makingPart = subtotal - goldPart;
  // The discount is spread proportionally across the gold and making portions.
  const scale = subtotal > 0 ? taxable / subtotal : 0;
  const goldTax = Math.round((goldPart * scale * goldRate) / 100);
  const makingTax = Math.round((makingPart * scale * makingRate) / 100);
  const tax = goldTax + makingTax;
  const cgst = Math.round(tax / 2);
  const sgst = tax - cgst;

  const gross = taxable + tax;
  const oldGold = Math.min(calcOldGold(input.oldGold), gross);
  const grand = gross - oldGold;
  const paid =
    input.status === "Paid"
      ? grand
      : input.status === "Unpaid"
        ? 0
        : Math.min(Math.max(0, toNum(input.amountPaid)), grand);
  return { itemTotals, subtotal, discount, taxable, goldTax, makingTax, tax, cgst, sgst, oldGold, grand, paid, balance: grand - paid };
}

export const invoiceTotals = (inv: {
  items: GoldItem[];
  discount: number;
  taxRate: number;
  makingTaxRate?: number;
  oldGold?: OldGoldInput | null;
  status: PaymentStatus;
  amountPaid: number;
}) => calcInvoice(inv);