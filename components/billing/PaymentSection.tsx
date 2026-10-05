"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { money } from "@/lib/format";
import type { BillForm } from "@/lib/schemas";
import { useBillCalc } from "./BillingSummary";

export function PaymentSection() {
  const { register, control, formState } = useFormContext<BillForm>();
  const status = useWatch({ control, name: "status" });
  const calc = useBillCalc();
  const e = formState.errors;
  const n = { valueAsNumber: true } as const;
  const partial = status === "Partial";

  return (
    <Card delay={0.1} className="mt-4">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Discount (₹)" type="number" step="0.01" inputMode="decimal" error={e.discount?.message} {...register("discount", n)} />
        <Input label="GST on Gold (%)" type="number" step="0.01" inputMode="decimal" error={e.taxRate?.message} {...register("taxRate", n)} />
        <Input label="GST on Making (%)" type="number" step="0.01" inputMode="decimal" error={e.makingTaxRate?.message} {...register("makingTaxRate", n)} />
        <Input
          label="Amount Paid (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          readOnly={!partial}
          tabIndex={partial ? 0 : -1}
          hint={partial ? undefined : status === "Paid" ? `Paid in full: ${money(calc.paid)}` : "Nothing paid yet"}
          error={e.amountPaid?.message}
          {...register("amountPaid", n)}
        />
        <Input label="Notes" placeholder="Optional invoice note" error={e.notes?.message} {...register("notes")} />
      </div>
    </Card>
  );
}
