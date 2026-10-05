"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";

/** Renders the invoice for the browser print dialog (also used for "Save as PDF"). */
export function PrintHost() {
  const { printJob, clearPrint, settings } = useApp();

  useEffect(() => {
    if (!printJob) return;
    const title = document.title;
    document.title = printJob.invoice.id;
    const t = setTimeout(() => {
      window.print();
      document.title = title;
      clearPrint();
    }, 150);
    return () => {
      clearTimeout(t);
      document.title = title;
    };
  }, [printJob, clearPrint]);

  if (!printJob) return null;
  return (
    <div className="hidden print:block">
      <InvoicePreview invoice={printJob.invoice} settings={settings} />
    </div>
  );
}
