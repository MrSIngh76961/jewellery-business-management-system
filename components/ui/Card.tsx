"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Card({ className, children, delay = 0, hover = false, ...rest }: { className?: string; children: React.ReactNode; delay?: number; hover?: boolean } & Omit<React.ComponentProps<"div">, "children" | "className">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={cn(
        "rounded-[15px] border border-line bg-card p-5 shadow-card",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_16px_40px_rgba(35,42,34,.12)]",
        className,
      )}
      {...(rest as object)}
    >
      {children}
    </motion.div>
  );
}

export function CardHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={cn(
            "relative cursor-pointer px-3.5 py-2.5 text-sm transition-colors",
            value === t ? "font-semibold text-brand" : "text-muted hover:text-ink",
          )}
        >
          {t}
          {value === t && <motion.span layoutId={`tab-${label}`} className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="p-12 text-center text-sm text-muted">{children}</div>;
}
