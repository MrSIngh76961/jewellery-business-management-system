import { fmtDate, money } from "./format";
import { invoiceTotals } from "./billing";
import type { Invoice, Settings } from "./types";

export function buildWhatsappMessage(inv: Invoice, settings: Settings) {
  const t = invoiceTotals(inv);
  return settings.whatsappTemplate
    .replaceAll("{customer}", inv.customerName)
    .replaceAll("{invoice}", inv.id)
    .replaceAll("{date}", fmtDate(inv.date))
    .replaceAll("{total}", money(t.grand))
    .replaceAll("{balance}", money(t.balance))
    .replaceAll("{shop}", settings.businessName);
}

export function buildWhatsappUrl(inv: Invoice, settings: Settings) {
  const digits = inv.customerMobile.replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(buildWhatsappMessage(inv, settings));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
