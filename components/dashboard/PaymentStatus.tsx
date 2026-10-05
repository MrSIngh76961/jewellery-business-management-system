"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import type { Invoice } from "@/lib/types";
import { paymentBreakdown } from "@/lib/selectors";

const BAR: Record<string, string> = { Paid: "bg-[#3f7658]", Partial: "bg-gold", Unpaid: "bg-danger" };

export function PaymentStatus({ invoices }: { invoices: Invoice[] }) {
  const rows = paymentBreakdown(invoices);
  return (
    <Card delay={0.1}>
      <CardHead title="Payment Status">
        <Link href="/invoices" className={buttonClass("secondary", "sm")}>
          View invoices
        </Link>
      </CardHead>
      <div className="text-3xl font-extrabold">{rows[0].pct}%</div>
      <p className="text-xs text-muted">of invoices fully paid</p>
      {rows.map((r, i) => (
        <div key={r.status} className="mt-4 text-[13px]">
          <div className="mb-1.5 flex justify-between">
            <span>{r.status}</span>
            <span className="text-muted">
              {r.count} · {r.pct}%
            </span>
          </div>
          <div className="h-[9px] overflow-hidden rounded-full bg-[#ebe5d9]">
            <motion.div
              className={`h-full rounded-full ${BAR[r.status]}`}
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}
