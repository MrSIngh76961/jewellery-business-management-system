"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void } | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++counter;
      setItems((s) => [...s.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:right-6 sm:bottom-6 print:hidden">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                role={t.kind === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={cn(
                  "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[10px] bg-forest px-4 py-3 text-[13px] text-white shadow-xl",
                  t.kind === "error" && "bg-danger",
                )}
              >
                <I className={cn("h-4 w-4 shrink-0", t.kind === "success" && "text-gold-2")} />
                <span>{t.message}</span>
                <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="ml-1 cursor-pointer opacity-70 hover:opacity-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
