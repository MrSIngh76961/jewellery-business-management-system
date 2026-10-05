import { fmtDate, money, num } from "@/lib/format";
import { calcItem, invoiceTotals } from "@/lib/billing";
import type { Invoice, Settings } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import { BrandMark } from "@/components/layout/BrandMark";
import { QrCode } from "@/components/ui/Codes";

/** A4-style printable invoice. Fluid on screens, fixed A4 proportions in print. */
export function InvoicePreview({ invoice, settings }: { invoice: Invoice; settings: Settings }) {
  const t = invoiceTotals(invoice);
  return (
    <article
      aria-label={`Invoice ${invoice.id}`}
      className="mx-auto w-full paper max-w-[794px] rounded-xl border border-line bg-white p-4 text-[13px] text-ink sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-gold pb-5">
        <div className="flex items-center gap-3">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <BrandMark className="bg-forest" />
          )}
          <div>
            <h2 className="text-xl font-extrabold tracking-wide uppercase">{settings.businessName}</h2>
            <p className="text-xs text-muted">Gold &amp; Jewellery Billing</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{settings.address}</p>
          <p>
            {settings.phone} · {settings.email}
          </p>
          <p>GSTIN: {settings.gstin}</p>
        </div>
        {invoice.verificationId && <a href={`/verify/${encodeURIComponent(invoice.verificationId)}`} className="text-center text-[9px] text-brand"><QrCode value={`/verify/${encodeURIComponent(invoice.verificationId)}`} size={64} /><span className="mt-1 block">Verify invoice</span></a>}
      </header>

      {invoice.cancelledAt && <p className="mt-4 rounded bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">Cancelled by reversal {invoice.reversalId ? `· ${invoice.reversalId}` : ""}</p>}

      <section className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4">
        <Meta label="Invoice No." value={invoice.id} />
        <Meta label="Date" value={fmtDate(invoice.date)} />
        <Meta label="Customer" value={invoice.customerName} sub={invoice.customerMobile || undefined} />
        <div>
          <p className="text-xs text-muted">{invoice.cancelledAt ? "Transaction Status" : "Payment Status"}</p>
          <div className="mt-1">
            {invoice.cancelledAt ? <span className="inline-flex rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-bold text-danger">Cancelled</span> : <StatusBadge status={invoice.status} />}
          </div>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-cream text-left text-[10px] tracking-wider text-[#7a807a] uppercase">
              {["#", "Item", "Purity", "Weight", "Rate/g", "Wastage", "Making", "Other", "Total"].map((h, i) => (
                <th key={h} className={`px-2 py-2 font-semibold ${i >= 3 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => {
              const c = calcItem(it);
              return (
                <tr key={it.id} className="border-b border-[#eee9de]">
                  <td className="px-2 py-2.5 text-muted">{i + 1}</td>
                  <td className="px-2 py-2.5 font-medium">{it.name}</td>
                  <td className="px-2 py-2.5">{it.purity}</td>
                  <td className="px-2 py-2.5 text-right">{num(it.weight)} g</td>
                  <td className="px-2 py-2.5 text-right">{money(it.rate)}</td>
                  <td className="px-2 py-2.5 text-right">
                    {it.wastage}% <span className="text-muted">({money(c.wastageAmount)})</span>
                  </td>
                  <td className="px-2 py-2.5 text-right">{money(it.making)}</td>
                  <td className="px-2 py-2.5 text-right">{money(it.other)}</td>
                  <td className="px-2 py-2.5 text-right font-bold">{money(c.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-5 flex flex-col-reverse gap-5 sm:flex-row sm:justify-between">
        <div className="max-w-xs text-xs text-muted">
          <p className="mb-2">
            <b className="text-ink">HSN/SAC:</b> {settings.hsnCode} | GST {invoice.taxRate}% on gold, {invoice.makingTaxRate ?? invoice.taxRate}% on making
          </p>
          {invoice.oldGold && (
            <p className="mb-2">
              <b className="text-ink">Old gold exchanged:</b> {invoice.oldGold.description}, {num(invoice.oldGold.weight)} g {invoice.oldGold.purity} @ {money(invoice.oldGold.rate)}/g, less {invoice.oldGold.deduction}% melting
            </p>
          )}
          {invoice.notes && (
            <p className="mb-2">
              <b className="text-ink">Note:</b> {invoice.notes}
            </p>
          )}
        </div>
        <dl className="w-full space-y-1.5 sm:w-72">
          <Row k="Subtotal" v={money(t.subtotal)} />
          <Row k="Discount" v={`− ${money(t.discount)}`} />
          <Row k="CGST" v={money(t.cgst)} />
          <Row k="SGST" v={money(t.sgst)} />
          {t.oldGold > 0 && <Row k="Old Gold Credit" v={`- ${money(t.oldGold)}`} />}
          <div className="flex justify-between border-t border-line pt-2.5 text-lg font-extrabold">
            <dt>Grand Total</dt>
            <dd>{money(t.grand)}</dd>
          </div>
          <Row k="Amount Paid" v={money(t.paid)} />
          <div className="flex justify-between font-bold text-danger">
            <dt>Balance Due</dt>
            <dd>{money(t.balance)}</dd>
          </div>
        </dl>
      </section>

      <footer className="mt-10 flex items-end justify-between gap-4 border-t border-line pt-4 text-[11px] text-muted">
        <p className="max-w-md">{settings.invoiceFooter}</p>
        <p className="shrink-0 border-t border-ink/40 pt-1 text-center text-ink">Authorised Signatory</p>
      </footer>
    </article>
  );
}

const Meta = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-xs text-muted">{label}</p>
    <p className="mt-0.5 font-bold">{value}</p>
    {sub && <p className="text-xs text-muted">{sub}</p>}
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between">
    <dt className="text-muted">{k}</dt>
    <dd className="font-semibold">{v}</dd>
  </div>
);
