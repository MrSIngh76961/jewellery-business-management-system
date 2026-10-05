"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  format?: (n: number) => string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  href?: string;
  delay?: number;
}

export function StatCard({ label, value, format, sub, trend = "flat", href, delay = 0 }: StatCardProps) {
  const body = (
    <>
      <div className="text-xs text-muted">{label}</div>
      <div className="my-1.5 text-2xl font-bold tracking-tight">
        {typeof value === "number" ? <AnimatedNumber value={value} format={format ?? ((n) => Math.round(n).toLocaleString("en-IN"))} /> : value}
      </div>
      <div className={cn("text-[11px]", trend === "up" ? "text-[#3d805d]" : trend === "down" ? "text-danger" : "text-muted")}>{sub}</div>
    </>
  );
  const cls =
    "block rounded-[15px] border border-line bg-card p-[19px] shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_16px_40px_rgba(35,42,34,.12)] focus-visible:outline-2 focus-visible:outline-gold";
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </motion.div>
  );
}
