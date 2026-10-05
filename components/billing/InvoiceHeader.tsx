"use client";

import { useFormContext } from "react-hook-form";
import { Input, Select } from "@/components/ui/Input";
import type { BillForm } from "@/lib/schemas";

export function InvoiceHeader({ invoiceNumber }: { invoiceNumber: string }) {
  const { register, formState } = useFormContext<BillForm>();
  return (
    <div className="mt-3.5 grid gap-3.5 sm:grid-cols-3">
      <Input label="Invoice Number" value={invoiceNumber} readOnly />
      <Input label="Invoice Date" type="date" error={formState.errors.date?.message} {...register("date")} />
      <Select label="Payment Status" {...register("status")}>
        <option>Paid</option>
        <option>Partial</option>
        <option>Unpaid</option>
      </Select>
    </div>
  );
}
