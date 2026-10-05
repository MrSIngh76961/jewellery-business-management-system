"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { InvoiceReversalAction } from "@/components/advanced/AdvancedPages";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getInvoice, settings } = useApp();
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
  return (
    <>
      <PageHeader title={`Invoice ${invoice.id}`} subtitle="Printable A4 invoice preview.">
        <Link href="/invoices" className={buttonClass()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <InvoiceActions invoice={invoice} />
      </PageHeader>
      <InvoicePreview invoice={invoice} settings={settings} />
      {!invoice.cancelledAt && <InvoiceReversalAction invoiceId={invoice.id} />}
    </>
  );
}
