"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { calcInvoice } from "@/lib/billing";
import { money } from "@/lib/format";
import type { BillForm } from "@/lib/schemas";

export function useBillCalc() {
  const { control } = useFormContext<BillForm>();
  const v = useWatch({ control });
  return calcInvoice({
    items: v.items ?? [],
    discount: v.discount,
    taxRate: v.taxRate,
    makingTaxRate: v.makingTaxRate,
    oldGold: v.oldGold,
    status: v.status ?? "Paid",
    amountPaid: v.amountPaid,
  });
}

function Row({ k, v, grand }: { k: string; v: string; grand?: boolean }) {
  return (
    <div className={grand ? "mt-1 flex justify-between border-t border-line pt-3 text-[19px] font-extrabold" : "flex justify-between py-2 text-[13px]"}>
      <span>{k}</span>
      <b data-testid={`sum-${k.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{v}</b>
    </div>
  );
}

export function BillingSummary() {
  const c = useBillCalc();
  return (
    <div className="mt-5 ml-auto w-full sm:w-[340px]" aria-live="polite">
      <Row k="Subtotal" v={money(c.subtotal)} />
      <Row k="Discount" v={`- ${money(c.discount)}`} />
      <Row k="CGST" v={money(c.cgst)} />
      <Row k="SGST" v={money(c.sgst)} />
      {c.oldGold > 0 && <Row k="Old Gold Credit" v={`- ${money(c.oldGold)}`} />}
      <Row k="Grand Total" v={money(c.grand)} grand />
      <Row k="Amount Paid" v={money(c.paid)} />
      <Row k="Balance Due" v={money(c.balance)} />
    </div>
  );
}