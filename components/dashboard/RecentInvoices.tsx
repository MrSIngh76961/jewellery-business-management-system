"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";

export function RecentInvoices() {
  const { invoices } = useApp();
  return (
    <Card delay={0.15} className="mt-4">
      <CardHead title="Recent Invoices">
        <Link href="/invoices" className={buttonClass("secondary", "sm")}>
          View all →
        </Link>
      </CardHead>
      <InvoiceTable invoices={invoices.slice(0, 5)} />
    </Card>
  );
}
