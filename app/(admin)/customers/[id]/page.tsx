"use client";

import { ArrowLeft, Download, FilePlus2, MessageCircle, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { publishWhatsAppEvent } from "@/lib/whatsapp-automation";
import { useShop } from "@/components/providers/ShopProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerProfile } from "@/components/customers/CustomerProfile";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Card";
import { Button, buttonClass } from "@/components/ui/Button";
import { calcInvoice } from "@/lib/billing";
import { DEMO_TODAY } from "@/lib/config";
import { money } from "@/lib/format";
import { invoiceBalance } from "@/lib/selectors";
import { downloadFile, toCsv } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getCustomer, invoices } = useApp();
  const { payments } = useShop();
  const { returns, bookings } = useOperations();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const customer = getCustomer(id);

  if (!customer)
    return (
      <EmptyState>
        Customer not found.{" "}
        <Link href="/customers" className="font-medium text-brand underline">
          Back to customers
        </Link>
      </EmptyState>
    );

  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id);
  const customerPayments = payments.filter((payment) => payment.customerId === customer.id);
  const customerReturns = returns.filter((record) => record.customerId === customer.id);
  const statementRows = [
    ...customerInvoices.flatMap((invoice) => {
      const totals = calcInvoice(invoice);
      return [
        { date: invoice.date, type: "Purchase", reference: invoice.id, debit: totals.grand + totals.oldGold, credit: 0, note: `${invoice.items.map((item) => item.name).join(", ")} · ${invoice.status}` },
        ...(totals.oldGold > 0 ? [{ date: invoice.date, type: "Old Gold Exchange", reference: invoice.id, debit: 0, credit: totals.oldGold, note: invoice.oldGold?.description ?? "Old gold credit" }] : []),
      ];
    }),
    ...customerPayments.map((payment) => ({ date: payment.date, type: "Payment", reference: payment.id, debit: 0, credit: payment.amount, note: `${payment.mode} · ${payment.note}` })),
    ...customerReturns.map((record) => ({ date: record.date, type: record.status === "Exchange" ? "Return / Exchange" : "Return", reference: record.id, debit: 0, credit: record.status === "Exchange" ? 0 : record.refund || record.goldValue + record.makingAdjustment + record.gstAdjustment, note: `${record.item} · ${record.reason}` })),
    ...bookings.filter((booking) => booking.customerId === customer.id && booking.advance > 0).map((booking) => ({ date: booking.createdAt ?? booking.deliveryDate, type: "Booking Advance", reference: booking.reference, debit: 0, credit: booking.advance, note: `${booking.item} · booking balance ${money(booking.estimatedAmount - booking.advance)}` })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const currentOutstanding = customerInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const exportStatement = () => {
    downloadFile(`customer-statement-${customer.id}.csv`, toCsv(statementRows, [
      { header: "Date", value: (row) => row.date }, { header: "Transaction", value: (row) => row.type }, { header: "Reference", value: (row) => row.reference }, { header: "Debit (INR)", value: (row) => row.debit }, { header: "Credit (INR)", value: (row) => row.credit }, { header: "Details", value: (row) => row.note },
    ]));
  };
  const printStatement = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      toast("Allow pop-ups to print or save this statement as PDF.", "error");
      return;
    }
    popup.opener = null;
    const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
    const body = statementRows.map((row) => `<tr><td>${escape(row.date)}</td><td>${escape(row.type)}</td><td>${escape(row.reference)}</td><td>${escape(row.note)}</td><td>${row.debit ? money(row.debit) : "—"}</td><td>${row.credit ? money(row.credit) : "—"}</td></tr>`).join("");
    popup.document.write(`<title>Statement · ${escape(customer.name)}</title><style>body{font:14px Arial,sans-serif;padding:28px;color:#17352a}h1{margin:0 0 8px}p{color:#59645c}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{border-bottom:1px solid #ddd;padding:9px;text-align:left}th{background:#f4efe4}footer{margin-top:18px;font-weight:bold}</style><h1>ReinSoft Gold · Customer Statement</h1><p>${escape(customer.name)} · ${escape(customer.mobile)} · ${escape(customer.address ?? "")}</p><p>Opening balance: Not available in legacy records · Current outstanding: ${money(currentOutstanding)}</p><table><thead><tr><th>Date</th><th>Transaction</th><th>Reference</th><th>Details</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${body}</tbody></table><footer>Current outstanding: ${money(currentOutstanding)}</footer>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };
  const shareStatement = () => {
    const text = `ReinSoft Gold customer statement for ${customer.name}. Current outstanding: ${money(currentOutstanding)}. Statement activity: ${statementRows.length} transactions.`;
    publishWhatsAppEvent({
      id: `customer-statement-${customer.id}-${DEMO_TODAY}`,
      type: "customer_statement",
      customerName: customer.name,
      mobile: customer.mobile,
      variables: { balance: Math.round(currentOutstanding).toLocaleString("en-IN") },
    });
    window.open(`https://wa.me/${customer.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader title={customer.name} subtitle="Customer profile and purchase history.">
        <Link href="/customers" className={buttonClass()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Link href={`/billing/new?customer=${customer.id}`} className={buttonClass("primary")}>
          <FilePlus2 className="h-4 w-4" /> Create New Bill
        </Link>
        <Button onClick={exportStatement}><Download className="h-4 w-4" /> Download Statement</Button>
        <Button onClick={printStatement}><Printer className="h-4 w-4" /> Print / PDF</Button>
        <Button onClick={shareStatement}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
      </PageHeader>
      <CustomerProfile customer={customer} invoices={invoices} />
      <div className="mt-4 rounded-xl border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">Customer Statement</h2>
        <p className="mt-1 text-xs text-muted">Opening balance: not available in legacy records · Current outstanding: <b className="text-ink">{money(currentOutstanding)}</b>. Print / PDF opens the browser print dialog. Credits show recorded payments, old-gold exchange and return adjustments.</p>
      </div>
      <CustomerModal open={editing} customer={customer} onClose={() => setEditing(false)} />
    </>
  );
}
