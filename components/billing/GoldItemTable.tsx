"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { defaultItem } from "@/lib/seed";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import type { BillForm } from "@/lib/schemas";
import { GoldItemRow, ROW_GRID } from "./GoldItemRow";

export function GoldItemTable({ children }: { children?: React.ReactNode }) {
  const { settings } = useApp();
  const gold = useGoldAccounting();
  const { control, formState } = useFormContext<BillForm>();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const rootError = formState.errors.items?.root?.message ?? formState.errors.items?.message;

  return (
    <Card delay={0.05} className="mt-4">
      <CardHead title="Gold Items">
        <Button variant="gold" onClick={() => append(defaultItem(settings, "22K", "", gold.purities))}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </CardHead>

      <div className={`${ROW_GRID} hidden border-b border-line pb-2 text-[11px] font-semibold tracking-wider text-[#7a807a] uppercase lg:grid`} aria-hidden>
        <span>Item</span>
        <span>Weight g</span>
        <span>Purity</span>
        <span>Rate/g</span>
        <span>Making</span>
        <span>Wastage %</span>
        <span>Other</span>
        <span>Total</span>
        <span />
      </div>

      <div className="space-y-3 pt-3 lg:space-y-0 lg:pt-0">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden lg:overflow-visible">
              <GoldItemRow index={i} onRemove={() => remove(i)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {!fields.length && <p className="py-8 text-center text-sm text-muted">No items yet — use “Add Item” to start this bill.</p>}
      </div>
      {rootError && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {rootError}
        </p>
      )}
      {children}
    </Card>
  );
}
