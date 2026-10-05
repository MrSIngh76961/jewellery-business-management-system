"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardHead } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { calcOldGold } from "@/lib/billing";
import { money } from "@/lib/format";
import type { BillForm } from "@/lib/schemas";
import { useApp } from "@/components/providers/AppProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { goldRateForPurity } from "@/lib/purity";

export function OldGoldSection() {
  const { register, control, setValue, formState } = useFormContext<BillForm>();
  const { settings } = useApp();
  const gold = useGoldAccounting();
  const og = useWatch({ control, name: "oldGold" });
  const e = formState.errors.oldGold;
  const n = { valueAsNumber: true } as const;
  const credit = calcOldGold(og);

  return (
    <Card delay={0.08} className="mt-4">
      <CardHead title="Old Gold Exchange">
        <span className="text-xs text-muted">{credit > 0 ? `Credit: ${money(credit)}` : "Optional — leave weight 0 if none"}</span>
      </CardHead>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Description" placeholder="e.g. Old chain" error={e?.description?.message} {...register("oldGold.description")} />
        <Input label="Weight (g)" type="number" step="0.001" inputMode="decimal" error={e?.weight?.message} {...register("oldGold.weight", n)} />
        <Select
          label="Purity"
          error={e?.purity?.message}
          {...register("oldGold.purity", {
            onChange: (ev) => setValue("oldGold.rate", goldRateForPurity(settings.rate22, settings.rate18, ev.target.value, gold.purities), { shouldValidate: true }),
          })}
        >
          {gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}
        </Select>
        <Input label="Rate/g (₹)" type="number" step="0.01" inputMode="decimal" error={e?.rate?.message} {...register("oldGold.rate", n)} />
        <Input label="Melting Deduction (%)" type="number" step="0.01" inputMode="decimal" error={e?.deduction?.message} {...register("oldGold.deduction", n)} />
      </div>
    </Card>
  );
}
