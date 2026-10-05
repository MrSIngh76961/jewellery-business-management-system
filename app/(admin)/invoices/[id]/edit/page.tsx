"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { BillingForm } from "@/components/billing/BillingForm";
import { EmptyState } from "@/components/ui/Card";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { getInvoice } = useApp();
  const invoice = getInvoice(decodeURIComponent(id));
  if (!invoice)
    return (
      <EmptyState>
        Invoice not found.{" "}
        <Link href="/invoices" className="font-medium text-brand underline">
          Back to invoices
        </Link>
      </EmptyState>
    );
  return <BillingForm key={invoice.id} invoice={invoice} />;
}
