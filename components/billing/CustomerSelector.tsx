"use client";

import { Plus, Search, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { Button } from "@/components/ui/Button";
import { Field, Input, controlClass } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { BillForm } from "@/lib/schemas";

export const WALK_IN = "walk-in";

export function CustomerSelector() {
  const { customers } = useApp();
  const { control, formState, setValue } = useFormContext<BillForm>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <>
      <Controller
        control={control}
        name="customerId"
        render={({ field }) => {
          const selected = customers.find((c) => c.id === field.value);
          const label = field.value === WALK_IN ? "Walk-in Customer" : selected ? `${selected.name} — ${selected.mobile.replace("+91 ", "")}` : "";
          const term = query.trim().toLowerCase();
          const list = customers.filter((c) => `${c.name} ${c.mobile}`.toLowerCase().includes(term));
          const pick = (id: string) => {
            field.onChange(id);
            setOpen(false);
            setQuery("");
          };
          return (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
              <div ref={boxRef} className="relative">
                <Field label="Customer" error={formState.errors.customerId?.message}>
                  {(id, desc) => (
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        id={id}
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={`${id}-list`}
                        aria-describedby={desc}
                        aria-invalid={!!formState.errors.customerId}
                        autoComplete="off"
                        placeholder="Search customer by name or mobile…"
                        value={open ? query : label}
                        onFocus={() => setOpen(true)}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setOpen(true);
                        }}
                        className={cn(controlClass, "pl-9")}
                      />
                      {open && (
                        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-card p-1 shadow-xl">
                          {list.map((c) => (
                            <li key={c.id}>
                              <button type="button" role="option" aria-selected={c.id === field.value} onClick={() => pick(c.id)} className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-cream">
                                <b>{c.name}</b>
                                <span className="text-xs text-muted">{c.mobile}</span>
                              </button>
                            </li>
                          ))}
                          {(!term || "walk-in customer".includes(term)) && (
                            <li>
                              <button type="button" role="option" aria-selected={field.value === WALK_IN} onClick={() => pick(WALK_IN)} className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-sm hover:bg-cream">
                                Walk-in Customer
                              </button>
                            </li>
                          )}
                          {!list.length && term && <li className="px-2.5 py-2 text-sm text-muted">No customer found</li>}
                        </ul>
                      )}
                    </div>
                  )}
                </Field>
              </div>
              <Input label="Customer Mobile" readOnly tabIndex={-1} value={selected?.mobile ?? (field.value === WALK_IN ? "—" : "")} placeholder="Auto-filled" />
              <div className="flex items-end">
                <Button className="w-full" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> <UserPlus className="hidden h-4 w-4" /> New Customer
                </Button>
              </div>
            </div>
          );
        }}
      />
      <CustomerModal open={adding} onClose={() => setAdding(false)} onSaved={(c) => setValue("customerId", c.id, { shouldValidate: true })} />
    </>
  );
}
