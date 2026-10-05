"use client";

import { X } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Tooltip } from "@/components/ui/Tooltip";
import { calcItem } from "@/lib/billing";
import { money } from "@/lib/format";
import { goldRateForPurity } from "@/lib/purity";
import type { BillForm } from "@/lib/schemas";

export const ROW_GRID =
  "grid grid-cols-2 gap-3 lg:grid-cols-[1.7fr_.8fr_.8fr_1fr_1fr_.8fr_.9fr_1fr_36px] lg:items-start lg:gap-2";

export function GoldItemRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { settings } = useApp();
  const gold = useGoldAccounting();
  const { register, control, setValue, formState } = useFormContext<BillForm>();
  const item = useWatch({ control, name: `items.${index}` });
  const err = formState.errors.items?.[index];
  const n = { valueAsNumber: true } as const;
  const total = calcItem(item ?? {}).total;

  return (
    <div className={`${ROW_GRID} rounded-xl border border-line bg-white/60 p-3 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0 lg:py-2.5`} data-testid="gold-item-row">
      <Input wrapperClassName="col-span-2 lg:col-span-1" label="Item" srOnlyLabel placeholder="e.g. Gold Ring" error={err?.name?.message} {...register(`items.${index}.name`)} />
      <Input label="Weight (g)" srOnlyLabel type="number" step="0.01" inputMode="decimal" error={err?.weight?.message} {...register(`items.${index}.weight`, n)} />
      <Select
        label="Purity"
        srOnlyLabel
        {...register(`items.${index}.purity`, {
          onChange: (e) => {
            const is18K = e.target.value === "18K";
            setValue(`items.${index}.rate`, goldRateForPurity(settings.rate22, settings.rate18, e.target.value, gold.purities));
            setValue(`items.${index}.making`, is18K ? settings.making18 : settings.making22);
            setValue(`items.${index}.wastage`, is18K ? settings.wastage18 : settings.wastage22);
          },
        })}
      >
        {gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}
      </Select>
      <Input label="Rate/g (₹)" srOnlyLabel type="number" step="0.01" inputMode="decimal" error={err?.rate?.message} {...register(`items.${index}.rate`, n)} />
      <Input label="Making (₹)" srOnlyLabel type="number" step="0.01" inputMode="decimal" error={err?.making?.message} {...register(`items.${index}.making`, n)} />
      <Input label="Wastage %" srOnlyLabel type="number" step="0.01" inputMode="decimal" error={err?.wastage?.message} {...register(`items.${index}.wastage`, n)} />
      <Input label="Other (₹)" srOnlyLabel type="number" step="0.01" inputMode="decimal" error={err?.other?.message} {...register(`items.${index}.other`, n)} />
      <div className="flex items-center justify-between lg:block lg:pt-2.5">
        <span className="text-[11px] font-semibold text-[#69716b] lg:hidden">Item total</span>
        <b className="text-sm" data-testid="row-total">
          {money(total)}
        </b>
      </div>
      <div className="flex justify-end lg:pt-1">
        <Tooltip label="Remove item">
          <Button size="icon" variant="danger" aria-label={`Remove item ${index + 1}`} onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
