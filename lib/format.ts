import { format, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹1,25,000 */
export const money = (n: number) => inr.format(Math.round(n || 0));
export const num = (n: number) => plain.format(n || 0);

export function moneyCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return money(n);
}

export const fmtDate = (iso: string) => format(parseISO(iso), "dd MMM yyyy");
export const fmtDateTime = (iso: string) => format(parseISO(iso), "dd MMM yyyy · hh:mm a");
