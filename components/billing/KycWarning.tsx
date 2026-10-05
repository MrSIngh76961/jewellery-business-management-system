"use client";

import { ShieldAlert } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { calcInvoice } from "@/lib/billing";
import { money } from "@/lib/format";
import type { BillForm } from "@/lib/schemas";

export const KYC_LIMIT = 200000;

/** PAN is mandatory for cash-heavy jewellery sales of ₹2 lakh and above. */
export function KycWarning() {
  const { control } = useFormContext<BillForm>();
  const { getCustomer } = useApp();
  const v = useWatch({ control }) as BillForm;
  const grand = calcInvoice(v).grand;
  const customer = getCustomer(v.customerId);
  if (grand < KYC_LIMIT || customer?.pan) return null;
  return (
    <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#e4bf68] bg-[#fff0d1] p-3.5 text-sm text-[#7a5410]">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Bill value {money(grand)} is above ₹2,00,000 — collect the customer&apos;s PAN {customer ? `and add it to ${customer.name}'s profile` : "(select a customer and add PAN in their profile)"}.
      </span>
    </div>
  );
}
