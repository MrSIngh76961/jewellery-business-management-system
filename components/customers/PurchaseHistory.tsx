"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import type { Customer, Invoice } from "@/lib/types";

export function PurchaseHistory({ customer, invoices, showCreate }: { customer: Customer; invoices: Invoice[]; showCreate?: boolean }) {
  return (
    <div>
      {invoices.length ? (
        <InvoiceTable invoices={invoices} />
      ) : (
        <EmptyState>No invoices yet for {customer.name}.</EmptyState>
      )}
      {showCreate && (
        <div className="mt-4 flex justify-end">
          <Link href={`/billing/new?customer=${customer.id}`} className={buttonClass("primary")}>
            <Plus className="h-4 w-4" /> Create Bill
          </Link>
        </div>
      )}
    </div>
  );
}
