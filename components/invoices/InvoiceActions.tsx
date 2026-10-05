"use client";

import { Download, MessageCircle, Pencil, Printer } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Invoice } from "@/lib/types";

/** Edit / Print / PDF / WhatsApp controls. `variant="row"` renders compact icon buttons for tables. */
export function InvoiceActions({ invoice, variant = "full", hideEdit }: { invoice: Invoice; variant?: "full" | "row"; hideEdit?: boolean }) {
  const { editInvoice, printInvoice, downloadPdf, shareWhatsapp } = useApp();

  if (variant === "row") {
    const items = [
      ...(!hideEdit ? [{ label: "Edit", icon: Pencil, run: () => editInvoice(invoice.id) }] : []),
      { label: "Print", icon: Printer, run: () => printInvoice(invoice) },
      { label: "Download PDF", icon: Download, run: () => downloadPdf(invoice) },
      { label: "WhatsApp", icon: MessageCircle, run: () => shareWhatsapp(invoice) },
    ];
    return (
      <>
        {items.map(({ label, icon: Icon, run }) => (
          <Tooltip key={label} label={label}>
            <Button size="icon" aria-label={`${label} ${invoice.id}`} onClick={run}>
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        ))}
      </>
    );
  }

  return (
    <>
      {!hideEdit && (
        <Button onClick={() => editInvoice(invoice.id)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      )}
      <Button onClick={() => downloadPdf(invoice)}>
        <Download className="h-4 w-4" /> Download PDF
      </Button>
      <Button onClick={() => printInvoice(invoice)}>
        <Printer className="h-4 w-4" /> Print
      </Button>
      <Button variant="gold" onClick={() => shareWhatsapp(invoice)}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
    </>
  );
}
