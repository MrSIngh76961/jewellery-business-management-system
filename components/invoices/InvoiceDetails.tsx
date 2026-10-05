"use client";

import { useApp } from "@/components/providers/AppProvider";
import { Modal } from "@/components/ui/Modal";
import { InvoiceActions } from "./InvoiceActions";
import { InvoicePreview } from "./InvoicePreview";

/** Global invoice detail modal; open from anywhere with `openInvoice(id)`. */
export function InvoiceDetailsModal() {
  const { viewInvoiceId, closeInvoice, getInvoice, settings } = useApp();
  const invoice = viewInvoiceId ? getInvoice(viewInvoiceId) : undefined;
  return (
    <Modal
      open={!!invoice}
      onClose={closeInvoice}
      size="lg"
      title={invoice ? `Invoice ${invoice.id}` : "Invoice"}
      footer={invoice && <InvoiceActions invoice={invoice} />}
    >
      {invoice && <InvoicePreview invoice={invoice} settings={settings} />}
    </Modal>
  );
}
