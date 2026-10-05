"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, CardHead, EmptyState } from "@/components/ui/Card";
import { Input, Select, Textarea, controlClass } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { money, fmtDate, num } from "@/lib/format";
import { invoiceGrand } from "@/lib/selectors";
import { DEMO_TODAY } from "@/lib/config";
import { getSession } from "@/lib/services/auth";
import { calcInvoice, calcItem } from "@/lib/billing";
import { downloadFile, toCsv } from "@/lib/utils";
import type { DayClose, ExpenseCategory, Expense, Supplier } from "@/lib/operations";
import type { Purity } from "@/lib/types";
import { calculateGoldWeightMetrics, goldRateForPurity } from "@/lib/purity";

const categories: ExpenseCategory[] = ["Rent", "Salary", "Electricity", "Transport", "Packaging", "Repair", "Marketing", "Office", "Miscellaneous"];
const actorRole = () => getSession()?.role ?? "Staff";

function SearchBox({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="relative"><Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" /><input aria-label="Search records" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${controlClass} pl-9`} /></div>;
}

function SupplierForm({ initial, onSave, onClose }: { initial?: Supplier; onSave: (value: Omit<Supplier, "id"> & { id?: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "", address: initial?.address ?? "", gstin: initial?.gstin ?? "", pan: initial?.pan ?? "" });
  const [error, setError] = useState("");
  const save = () => {
    if (form.name.trim().length < 2 || form.phone.trim().length < 8) return setError("Enter a supplier name and valid contact number.");
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin)) return setError("GSTIN must contain 15 letters or numbers.");
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) return setError("Enter a valid PAN.");
    onSave({ ...form, name: form.name.trim(), id: initial?.id });
    onClose();
  };
  return <Modal open onClose={onClose} title={initial ? "Edit Supplier" : "Add Supplier"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save supplier</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Supplier name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Contact number" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input label="GSTIN" maxLength={15} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
      <Input label="PAN" maxLength={10} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
      <Input label="Address" wrapperClassName="sm:col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
  </Modal>;
}

export function SuppliersPage() {
  const { suppliers, purchases, saveSupplier } = useOperations();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Supplier | undefined>();
  const [adding, setAdding] = useState(false);
  const rows = suppliers.filter((supplier) => `${supplier.name} ${supplier.phone} ${supplier.gstin}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeader title="Suppliers" subtitle="Manage supplier contacts, tax details and purchase relationships."><Button variant="primary" onClick={() => { setEditing(undefined); setAdding(true); }}><Plus className="h-4 w-4" /> Add Supplier</Button></PageHeader>
    <Card><div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Search supplier, phone or GSTIN..." /></div>
      <SimpleTable rows={rows} rowKey={(row) => row.id} columns={[
        { head: "Supplier", cell: (row) => <Link href={`/suppliers/${row.id}`} className="font-semibold text-brand hover:underline">{row.name}</Link> },
        { head: "Contact", cell: (row) => <span>{row.phone}<span className="block text-xs text-muted">{row.email || "No email"}</span></span> },
        { head: "GSTIN / PAN", cell: (row) => <span>{row.gstin || "—"}<span className="block text-xs text-muted">{row.pan || "PAN not provided"}</span></span> },
        { head: "Purchases", cell: (row) => purchases.filter((purchase) => purchase.supplierId === row.id).length },
        { head: "Actions", cell: (row) => <Button size="sm" onClick={() => { setEditing(row); setAdding(true); }}>Edit</Button> },
      ]} empty="No suppliers match your search." />
    </Card>
    {adding && <SupplierForm initial={editing} onSave={saveSupplier} onClose={() => setAdding(false)} />}
  </>;
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { suppliers, purchases, supplierPayments, recordSupplierPayment } = useOperations();
  const toast = useToast();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card" | "Bank">("Bank");
  const [paymentNote, setPaymentNote] = useState("");
  const supplier = suppliers.find((item) => item.id === id);
  const records = purchases.filter((item) => item.supplierId === id);
  if (!supplier) return <EmptyState>Supplier not found. <Link href="/suppliers" className="text-brand underline">Return to suppliers</Link></EmptyState>;
  const total = records.reduce((sum, item) => sum + item.total, 0);
  const outstanding = records.reduce((sum, item) => sum + item.total - item.paid, 0);
  return <>
    <PageHeader title={supplier.name} subtitle="Supplier profile and transaction history."><Link href="/suppliers" className={buttonClass()}>Back to suppliers</Link><Link href="/purchases/new" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Record Purchase</Link></PageHeader>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Purchase invoices" value={records.length} sub="Recorded transactions" /><StatCard label="Purchase value" value={total} format={money} sub="Gross value" /><StatCard label="Outstanding" value={outstanding} format={money} sub="Supplier payable" /><StatCard label="Supplier ID" value={supplier.id} sub={supplier.gstin || "GSTIN not provided"} /></div>
    <Card className="mt-4"><CardHead title="Contact & tax details" /><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted">Phone / email</dt><dd className="font-medium">{supplier.phone} · {supplier.email || "—"}</dd></div><div><dt className="text-muted">GSTIN / PAN</dt><dd className="font-medium">{supplier.gstin || "—"} · {supplier.pan || "—"}</dd></div><div className="sm:col-span-2"><dt className="text-muted">Address</dt><dd className="font-medium">{supplier.address || "—"}</dd></div></dl></Card>
    <Card className="mt-4"><CardHead title="Purchase history" /><SimpleTable rows={records} rowKey={(row) => row.id} empty="No purchases recorded for this supplier." columns={[
      { head: "Invoice", cell: (row) => <span className="font-semibold">{row.invoiceNo}</span> },
      { head: "Date", cell: (row) => fmtDate(row.date) }, { head: "Item", cell: (row) => row.item },
      { head: "Net weight", cell: (row) => `${num(row.netWeight)} g` }, { head: "Total", cell: (row) => money(row.total) },
      { head: "Balance", cell: (row) => money(row.total - row.paid) },
    ]} /></Card>
    {outstanding > 0 && <Card className="mt-4"><CardHead title="Record supplier payment" /><div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"><Input label="Payment amount (₹)" type="number" min="1" max={outstanding} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /><Select label="Payment method" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank</option></Select><Input label="Reference / note" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} /><Button variant="primary" onClick={() => { try { const applied = recordSupplierPayment(supplier.id, Number(paymentAmount), paymentMode, paymentNote); if (applied <= 0) return toast("No outstanding supplier balance to pay.", "error"); toast(`${money(applied)} applied to oldest outstanding purchase invoices.`); setPaymentAmount(""); setPaymentNote(""); } catch (cause) { toast(cause instanceof Error ? cause.message : "Payment could not be recorded.", "error"); } }}>Record payment</Button></div><p className="mt-2 text-xs text-muted">Oldest unpaid purchase invoices are paid first. Outstanding: {money(outstanding)}</p></Card>}
    <Card className="mt-4"><CardHead title="Supplier payments" /><SimpleTable rows={supplierPayments.filter((payment) => payment.supplierId === supplier.id)} rowKey={(row) => row.id} empty="No payments recorded." columns={[
      { head: "Date / reference", cell: (row) => <span>{fmtDate(row.date)}<small className="block text-muted">{row.id}</small></span> }, { head: "Amount", cell: (row) => <b>{money(row.amount)}</b> }, { head: "Method / note", cell: (row) => `${row.mode} · ${row.note || "—"}` }, { head: "Allocation", cell: (row) => row.allocations.map((allocation) => `${records.find((purchase) => purchase.id === allocation.purchaseId)?.invoiceNo ?? allocation.purchaseId}: ${money(allocation.amount)}`).join(" · ") },
    ]} /></Card>
  </>;
}

export function PurchasesPage() {
  const { purchases, suppliers } = useOperations();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const rows = purchases.filter((purchase) => {
    const paidStatus = purchase.paid >= purchase.total ? "Paid" : purchase.paid > 0 ? "Partial" : "Unpaid";
    return (status === "All" || status === paidStatus) && `${purchase.invoiceNo} ${purchase.item} ${suppliers.find((supplier) => supplier.id === purchase.supplierId)?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());
  });
  return <>
    <PageHeader title="Purchases" subtitle="Supplier invoices and received gold stock."><Link href="/suppliers" className={buttonClass()}>Suppliers</Link><Link href="/purchases/new" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Record Purchase</Link></PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3"><StatCard label="Purchase records" value={purchases.length} sub="All suppliers" /><StatCard label="Supplier outstanding" value={purchases.reduce((sum, item) => sum + item.total - item.paid, 0)} format={money} sub="Unpaid purchase value" /></div>
    <Card><div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]"><SearchBox value={query} onChange={setQuery} placeholder="Search invoice, supplier or item..." /><Select label="Payment status" value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Paid</option><option>Partial</option><option>Unpaid</option></Select></div><SimpleTable rows={rows} rowKey={(row) => row.id} empty="No purchases recorded yet." columns={[
      { head: "Purchase invoice", cell: (row) => <Link href={`/purchases/${row.id}`} className="font-semibold text-brand underline">{row.invoiceNo}</Link> }, { head: "Supplier", cell: (row) => suppliers.find((s) => s.id === row.supplierId)?.name ?? "Supplier removed" },
      { head: "Date", cell: (row) => fmtDate(row.date) }, { head: "Item / purity", cell: (row) => `${row.item} · ${row.purity}` },
      { head: "Net weight", cell: (row) => `${num(row.netWeight)} g` }, { head: "Total / balance", cell: (row) => <span>{money(row.total)}<small className="block text-muted">Due {money(row.total - row.paid)}</small></span> },
      { head: "Payment", cell: (row) => <Badge tone={row.paid >= row.total ? "Paid" : row.paid > 0 ? "Partial" : "Unpaid"}>{row.paid >= row.total ? "Paid" : row.paid > 0 ? "Partial" : "Unpaid"}</Badge> },
    ]} /></Card>
  </>;
}

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { purchases, suppliers, supplierPayments } = useOperations();
  const gold = useGoldAccounting();
  const purchase = purchases.find((item) => item.id === id);
  if (!purchase) return <EmptyState>Purchase record not found. <Link href="/purchases" className="text-brand underline">Back to purchases</Link></EmptyState>;
  const supplier = suppliers.find((item) => item.id === purchase.supplierId);
  const paymentStatus = purchase.paid >= purchase.total ? "Paid" : purchase.paid > 0 ? "Partial" : "Unpaid";
  const payments = supplierPayments.filter((payment) => payment.supplierId === purchase.supplierId && payment.allocations.some((allocation) => allocation.purchaseId === purchase.id));
  const weightMetrics = calculateGoldWeightMetrics({ grossWeight: purchase.grossWeight, netWeight: purchase.netWeight, purity: purchase.purity, configured: gold.purities });
  return <>
    <PageHeader title={`Purchase ${purchase.invoiceNo}`} subtitle="Supplier invoice, gold details, tax and payment reconciliation."><Link href="/purchases" className={buttonClass()}>Back to purchases</Link>{supplier && <Link href={`/suppliers/${supplier.id}`} className={buttonClass()}>Supplier history</Link>}</PageHeader>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Purchase value" value={purchase.total} format={money} sub="GST inclusive" /><StatCard label="Paid" value={purchase.paid} format={money} sub="Supplier payments" /><StatCard label="Outstanding" value={purchase.total - purchase.paid} format={money} sub="Balance payable" /><StatCard label="Payment status" value={paymentStatus} sub={fmtDate(purchase.date)} /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card><CardHead title="Supplier" /><p className="font-semibold">{supplier?.name ?? "Supplier record unavailable"}</p><p className="mt-1 text-sm text-muted">{supplier?.phone} · {supplier?.gstin || "GSTIN not provided"}</p></Card><Card><CardHead title="Gold / item details" /><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-muted">Item / purity</dt><dd>{purchase.item} · {purchase.purity}</dd><dt className="text-muted">Gross / net weight</dt><dd>{num(purchase.grossWeight)} g / {num(purchase.netWeight)} g</dd><dt className="text-muted">Fine gold</dt><dd>{num(weightMetrics.fineGoldWeight)} g · {weightMetrics.fineGoldPercentage.toFixed(2)}%</dd><dt className="text-muted">22K / 18K equivalent</dt><dd>{num(weightMetrics.equivalent22K)} g / {num(weightMetrics.equivalent18K)} g</dd><dt className="text-muted">Gold rate</dt><dd>{money(purchase.rate)} / g</dd><dt className="text-muted">Making / other charges</dt><dd>{money(purchase.making)} / {money(purchase.other)}</dd><dt className="text-muted">GST</dt><dd>{money(purchase.gst)}</dd><dt className="text-muted">Received stock item</dt><dd>{purchase.stockItemId}</dd></dl></Card></div>
    <Card className="mt-4"><CardHead title="Payment transactions" /><SimpleTable rows={payments.flatMap((payment) => payment.allocations.filter((allocation) => allocation.purchaseId === purchase.id).map((allocation) => ({ payment, allocation })))} rowKey={(row) => `${row.payment.id}-${purchase.id}`} empty="No settlement payments recorded." columns={[
      { head: "Date", cell: (row) => fmtDate(row.payment.date) }, { head: "Payment reference", cell: (row) => row.payment.id }, { head: "Method / note", cell: (row) => `${row.payment.mode} · ${row.payment.note || "—"}` }, { head: "Allocated", cell: (row) => money(row.allocation.amount) },
    ]} /></Card>
  </>;
}

export function NewPurchasePage() {
  const { suppliers, recordPurchase } = useOperations();
  const { settings } = useApp();
  const gold = useGoldAccounting();
  const supplierQuery = useSearchParams().get("supplier");
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ supplierId: supplierQuery ?? "", invoiceNo: "", date: DEMO_TODAY, item: "", grossWeight: "", netWeight: "", purity: "22K" as Purity, rate: String(settings.rate22), making: "0", other: "0", gstRate: "3", paid: "0", paymentMethod: "Bank" as "Cash" | "UPI" | "Card" | "Bank" });
  const metrics = Number(form.grossWeight) >= Number(form.netWeight) && Number(form.netWeight) >= 0
    ? calculateGoldWeightMetrics({ grossWeight: Number(form.grossWeight), netWeight: Number(form.netWeight), purity: form.purity, configured: gold.purities })
    : undefined;
  const [error, setError] = useState("");
  const value = Math.max(0, Number(form.netWeight) * Number(form.rate) + Number(form.making) + Number(form.other));
  const gst = Math.round(value * Number(form.gstRate) / 100);
  const total = value + gst;
  const save = () => {
    const gross = Number(form.grossWeight), net = Number(form.netWeight), rate = Number(form.rate), paid = Number(form.paid);
    if (!form.supplierId || !form.invoiceNo.trim() || form.item.trim().length < 2) return setError("Select a supplier and enter the invoice number and item.");
    if (!(gross > 0) || !(net > 0) || net > gross || !(rate > 0)) return setError("Enter valid positive weights and a gold rate. Net weight cannot exceed gross weight.");
    if (paid < 0 || paid > total) return setError("Paid amount must be between zero and the purchase total.");
    try {
      recordPurchase({ supplierId: form.supplierId, invoiceNo: form.invoiceNo.trim(), date: form.date, item: form.item.trim(), grossWeight: gross, netWeight: net, purity: form.purity, rate, making: Number(form.making), other: Number(form.other), gst, total, paid, paymentMethod: form.paymentMethod });
      toast("Purchase recorded and stock updated.");
      router.push("/purchases");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not record purchase."); }
  };
  return <>
    <PageHeader title="Record Purchase" subtitle="Record supplier invoice details; accepted net weight is added to tagged stock." />
    <Card><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Select label="Supplier" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select>
      <Input label="Supplier invoice number" required value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
      <Input label="Purchase date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <Input label="Item / description" required value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
      <Input label="Gross weight (g)" type="number" min="0.01" step="0.01" value={form.grossWeight} onChange={(e) => setForm({ ...form, grossWeight: e.target.value })} />
      <Input label="Net weight (g)" type="number" min="0.01" step="0.01" value={form.netWeight} onChange={(e) => setForm({ ...form, netWeight: e.target.value })} />
      <Select label="Purity" value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value as Purity, rate: String(goldRateForPurity(settings.rate22, settings.rate18, e.target.value, gold.purities)) })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select>
      <Input label="Gold rate / g (₹)" type="number" min="1" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
      <Input label="Making charges (₹)" type="number" min="0" value={form.making} onChange={(e) => setForm({ ...form, making: e.target.value })} />
      <Input label="Other charges (₹)" type="number" min="0" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} />
      <Input label="GST (%)" type="number" min="0" max="100" step="0.1" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })} />
      <Input label="Paid amount (₹)" type="number" min="0" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
      <Select label="Initial payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank</option></Select>
    </div><div className="mt-5 rounded-xl bg-cream/70 p-4 text-sm"><div className="flex justify-between"><span>Taxable value</span><b>{money(value)}</b></div><div className="mt-1 flex justify-between"><span>GST</span><b>{money(gst)}</b></div><div className="mt-2 flex justify-between border-t border-line pt-2 text-base"><span>Total purchase</span><b>{money(total)}</b></div><div className="mt-1 flex justify-between text-muted"><span>Outstanding after payment</span><span>{money(Math.max(0, total - Number(form.paid || 0)))}</span></div>{metrics && <div className="mt-3 border-t border-line pt-2 text-xs text-muted">Fine gold {num(metrics.fineGoldWeight)} g ({metrics.fineGoldPercentage.toFixed(2)}%) · 22K equivalent {num(metrics.equivalent22K)} g · 18K equivalent {num(metrics.equivalent18K)} g</div>}</div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><Link href="/purchases" className={buttonClass()}>Cancel</Link><Button variant="primary" onClick={save}>Save Purchase & Add Stock</Button></div>
    </Card>
  </>;
}

export function ReturnsPage() {
  const { invoices, customers, settings, addInvoice } = useApp();
  const { recordReturn, requestApproval } = useOperations();
  const gold = useGoldAccounting();
  const toast = useToast();
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [itemId, setItemId] = useState("");
  const [returnWeight, setReturnWeight] = useState("");
  const [reason, setReason] = useState("");
  const [workflow, setWorkflow] = useState<"Refund" | "Exchange">("Refund");
  const [newItem, setNewItem] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");
  const invoice = invoices.find((entry) => entry.id === selectedInvoiceId);
  const item = invoice?.items.find((entry) => entry.id === itemId);
  const candidates = invoices.filter((entry) => !entry.cancelledAt && `${entry.id} ${entry.customerName} ${entry.customerMobile}`.toLowerCase().includes(invoiceQuery.toLowerCase())).slice(0, 8);
  const weightToReturn = Number(returnWeight || item?.weight || 0);
  const returnedShare = item && item.weight > 0 ? Math.min(1, weightToReturn / item.weight) : 0;
  const itemCalc = item ? calcItem(item) : undefined;
  const invoiceCalc = invoice ? calcInvoice(invoice) : undefined;
  const discountShare = itemCalc && invoiceCalc && invoiceCalc.subtotal > 0 ? invoiceCalc.discount * itemCalc.total / invoiceCalc.subtotal : 0;
  const discountFactor = itemCalc && itemCalc.total > 0 ? Math.max(0, (itemCalc.total - discountShare) / itemCalc.total) : 0;
  const goldValue = item && itemCalc ? (itemCalc.goldValue + itemCalc.wastageAmount) * returnedShare : 0;
  const makingAdjustment = item ? (item.making + item.other) * returnedShare : 0;
  const gstAdjustment = item && itemCalc ? Math.round((itemCalc.goldValue + itemCalc.wastageAmount) * returnedShare * discountFactor * invoice!.taxRate / 100) + Math.round((item.making + item.other) * returnedShare * discountFactor * (invoice!.makingTaxRate ?? invoice!.taxRate) / 100) : 0;
  const refund = (goldValue + makingAdjustment) * discountFactor + gstAdjustment;
  const save = () => {
    if (!invoice || !item || reason.trim().length < 3 || !(weightToReturn > 0) || weightToReturn > item.weight) return setError("Choose an invoice and purchased item, enter a valid return weight, and provide a reason.");
    if (workflow === "Exchange" && (!newItem.trim() || !(Number(newWeight) > 0) || !(Number(newValue) > 0))) return setError("Enter the exchange item, weight and value.");
    try {
      let exchangeDue = 0;
      let returnId = "";
      if (workflow === "Exchange") {
        const newRate = goldRateForPurity(settings.rate22, settings.rate18, item.purity, gold.purities);
        const adjustedMaking = Math.max(0, Number(newValue) - Number(newWeight) * newRate);
        const invoiceDraft = {
          customerId: invoice.customerId,
          date: DEMO_TODAY,
          items: [{ name: newItem.trim(), weight: Number(newWeight), purity: item.purity, rate: newRate, making: adjustedMaking, wastage: 0, other: 0 }],
          discount: 0, taxRate: settings.defaultTax, makingTaxRate: settings.defaultMakingTax, status: "Unpaid" as const, amountPaid: 0,
          oldGold: { description: `Sales exchange ${invoice.id} · ${item.name}`, weight: weightToReturn, purity: item.purity, rate: item.rate, deduction: 0 },
          notes: `Exchange against returned item ${item.name} from ${invoice.id}`,
        };
        const exchangeInvoice = addInvoice(invoiceDraft);
        const computed = calcInvoice({ ...invoiceDraft, items: invoiceDraft.items.map((entry, index) => ({ ...entry, id: `${exchangeInvoice.id}-${index + 1}` })) });
        exchangeDue = Math.max(0, computed.grand);
      }
      const returnDraft = { invoiceId: invoice.id, customerId: invoice.customerId, item: item.name, reason: reason.trim(), weight: weightToReturn, purity: item.purity, goldValue, makingAdjustment, gstAdjustment, refund: workflow === "Refund" ? refund : 0, exchangeItem: workflow === "Exchange" ? `${newItem.trim()} · New invoice balance ${money(exchangeDue)}` : "", status: workflow === "Exchange" ? "Exchange" as const : "Refunded" as const };
      if (workflow === "Refund" && getSession()?.role !== "Owner" && settings.approvalRequireRefund && refund >= settings.approvalRefundLimit) {
        requestApproval({ action: "Refund", module: "Returns", reference: invoice.id, details: `${item.name} · ${num(weightToReturn)} g · ${money(refund)}`, reason: reason.trim(), payload: { returnData: JSON.stringify(returnDraft) } });
        toast("Refund submitted for Owner approval. Stock changes after approval.", "info");
      } else {
        const record = recordReturn(returnDraft);
        returnId = record.id;
        toast(workflow === "Exchange" ? `Exchange ${returnId} and invoice recorded.` : `Refund return ${returnId} recorded; returned item added to stock.`);
      }
      setInvoiceQuery(""); setSelectedInvoiceId(""); setItemId(""); setReturnWeight(""); setReason(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not record this return."); }
  };
  return <>
    <PageHeader title="Sales Returns & Exchange" subtitle="Record returns against an original sale; exchanges retain their own return and invoice records." />
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card><CardHead title="Find original invoice" /><SearchBox value={invoiceQuery} onChange={(value) => { setInvoiceQuery(value); setSelectedInvoiceId(""); }} placeholder="Invoice number, customer or mobile..." />
        {invoiceQuery && !invoice && <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-line bg-card">{candidates.map((entry) => <button key={entry.id} onClick={() => { setSelectedInvoiceId(entry.id); setInvoiceQuery(`${entry.id} · ${entry.customerName}`); }} className="block w-full border-b border-line px-3 py-2 text-left text-sm hover:bg-cream">{entry.id} · {entry.customerName} · {money(invoiceGrand(entry))}</button>)}{candidates.length === 0 && <p className="p-3 text-sm text-muted">No matching invoices.</p>}</div>}
        {invoice && <div className="mt-4 rounded-xl bg-cream/70 p-3 text-sm"><b>{invoice.id} · {invoice.customerName}</b><span className="block text-muted">{fmtDate(invoice.date)} · {customers.find((c) => c.id === invoice.customerId)?.mobile}</span></div>}
        {invoice && <div className="mt-4"><Select label="Purchased item to return" value={itemId} onChange={(e) => { setItemId(e.target.value); setReturnWeight(""); }}><option value="">Select invoice item</option>{invoice.items.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {num(entry.weight)} g · {entry.purity}</option>)}</Select></div>}
        {item && <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line p-3 text-sm"><span>Original item</span><b>{item.name}</b><span>Original weight / purity</span><b>{num(item.weight)} g · {item.purity}</b><label htmlFor="return-weight">Return weight (g)</label><input id="return-weight" type="number" min="0.01" max={item.weight} step="0.01" value={returnWeight || item.weight} onChange={(e) => setReturnWeight(e.target.value)} className={controlClass} /><span>Gold / making adjustment</span><b>{money(goldValue)} / {money(makingAdjustment)}</b><span>GST adjustment</span><b>{money(gstAdjustment)}</b><span>Indicative refund</span><b className="text-brand">{money(refund)}</b></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Select label="Workflow" value={workflow} onChange={(e) => setWorkflow(e.target.value as "Refund" | "Exchange")}><option value="Refund">Refund</option><option value="Exchange">Exchange against new item</option></Select><Input label="Return reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Size adjustment" /></div>
        {workflow === "Exchange" && <div className="mt-3 grid gap-3 sm:grid-cols-3"><Input label="New item" value={newItem} onChange={(e) => setNewItem(e.target.value)} /><Input label="New weight (g)" type="number" min="0.01" step="0.01" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} /><Input label="New item value (₹)" type="number" min="1" value={newValue} onChange={(e) => setNewValue(e.target.value)} /></div>}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<div className="mt-4 flex justify-end"><Button variant="primary" disabled={!item} onClick={save}>Record {workflow}</Button></div>
      </Card>
      <Card><CardHead title="Return policy checks" /><ul className="space-y-3 text-sm text-muted"><li>• Verify the original invoice and item before recording.</li><li>• Refund estimates use original item value, making and GST; Owner approval should be used for exceptional refunds.</li><li>• A returned item is added to stock as a separate tagged item.</li><li>• Exchanges create an original return record and a linked new invoice with old-gold value deducted.</li></ul></Card>
    </div>
    <Card className="mt-4"><CardHead title="Return history" /><ReturnHistory /></Card>
  </>;
}

function ReturnHistory() {
  const { returns } = useOperations();
  const { customers } = useApp();
  return <SimpleTable rows={returns} rowKey={(row) => row.id} empty="No returns or exchanges recorded." columns={[
    { head: "Reference", cell: (row) => <b>{row.id}</b> }, { head: "Original invoice", cell: (row) => row.invoiceId },
    { head: "Customer / item", cell: (row) => <span>{customers.find((c) => c.id === row.customerId)?.name ?? "Customer"}<small className="block text-muted">{row.item}</small></span> },
    { head: "Date", cell: (row) => fmtDate(row.date) }, { head: "Reason", cell: (row) => row.reason },
    { head: "Refund", cell: (row) => row.refund ? money(row.refund) : "—" }, { head: "Status", cell: (row) => <Badge tone={row.status === "Refunded" ? "Paid" : row.status === "Exchange" ? "Partial" : "neutral"}>{row.status}</Badge> },
  ]} />;
}

export function ExpensesPage() {
  const { expenses, saveExpense, deleteExpense } = useOperations();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("month");
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const canEdit = actorRole() === "Owner";
  const [form, setForm] = useState({ category: "Rent" as ExpenseCategory, amount: "", date: DEMO_TODAY, paymentMethod: "Bank" as "Cash" | "UPI" | "Card" | "Bank", description: "", reference: "" });
  const visible = expenses.filter((expense) => `${expense.category} ${expense.description} ${expense.reference}`.toLowerCase().includes(query.toLowerCase()));
  const selectedExpenses = expenses.filter((item) => period === "all" || (period === "day" ? item.date === DEMO_TODAY : period === "year" ? item.date.slice(0, 4) === DEMO_TODAY.slice(0, 4) : item.date.slice(0, 7) === DEMO_TODAY.slice(0, 7)));
  const save = () => {
    const amount = Number(form.amount);
    if (!(amount > 0) || !form.description.trim() || !form.date) return toast("Enter a positive amount, date and description.", "error");
    try {
      saveExpense({ ...form, amount, description: form.description.trim(), id: editId });
      toast(editId ? "Expense updated." : "Expense recorded.");
      setEditing(null); setEditId(undefined); setForm({ category: "Rent", amount: "", date: DEMO_TODAY, paymentMethod: "Bank", description: "", reference: "" });
    } catch (cause) { toast(cause instanceof Error ? cause.message : "Expense could not be saved.", "error"); }
  };
  const exportExpenses = () => downloadFile("reinsoft-gold-expenses.csv", toCsv(visible, [
    { header: "Date", value: (row) => row.date }, { header: "Category", value: (row) => row.category }, { header: "Amount INR", value: (row) => row.amount }, { header: "Method", value: (row) => row.paymentMethod }, { header: "Description", value: (row) => row.description }, { header: "Reference", value: (row) => row.reference },
  ]));
  return <>
    <PageHeader title="Expenses" subtitle="Record and review shop operating expenses."><Button onClick={exportExpenses}><Download className="h-4 w-4" /> Export CSV</Button><Button variant="primary" onClick={() => { setEditing("Rent"); setEditId(undefined); }}> <Plus className="h-4 w-4" /> Add Expense</Button></PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Today" value={expenses.filter((e) => e.date === DEMO_TODAY).reduce((sum, e) => sum + e.amount, 0)} format={money} sub="Recorded expenses" /><StatCard label="This month" value={expenses.filter((e) => e.date.slice(0, 7) === DEMO_TODAY.slice(0, 7)).reduce((sum, e) => sum + e.amount, 0)} format={money} sub="Month to date" /><StatCard label="This year" value={expenses.filter((e) => e.date.startsWith(DEMO_TODAY.slice(0, 4))).reduce((sum, e) => sum + e.amount, 0)} format={money} sub="Year to date" /><StatCard label="Entries" value={expenses.length} sub="Expense history" /></div>
    <Card><div className="mb-4 grid gap-3 sm:grid-cols-[1fr_190px]"><SearchBox value={query} onChange={setQuery} placeholder="Search category, description or reference..." /><Select label="Report period" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="day">Today</option><option value="month">This month</option><option value="year">This year</option><option value="all">All time</option></Select></div><p className="mb-3 text-sm text-muted">Selected period total: <b className="text-ink">{money(selectedExpenses.reduce((sum, e) => sum + e.amount, 0))}</b></p>
      <SimpleTable rows={visible} rowKey={(row) => row.id} empty="No expenses match your search." columns={[
        { head: "Date", cell: (row) => fmtDate(row.date) }, { head: "Category", cell: (row) => <Badge>{row.category}</Badge> },
        { head: "Description", cell: (row) => <span>{row.description}<small className="block text-muted">{row.reference || "No reference"}</small></span> },
        { head: "Method", cell: (row) => row.paymentMethod }, { head: "Amount", cell: (row) => <b>{money(row.amount)}</b> },
        { head: "Actions", cell: (row) => canEdit ? <span className="flex gap-1"><Button size="sm" onClick={() => { setEditId(row.id); setForm({ category: row.category, amount: String(row.amount), date: row.date, paymentMethod: row.paymentMethod, description: row.description, reference: row.reference }); setEditing(row.category); }}>Edit</Button><Button size="sm" variant="danger" aria-label={`Delete ${row.id}`} onClick={() => setDeleting(row)}><Trash2 className="h-3.5 w-3.5" /></Button></span> : <span className="text-xs text-muted">Owner only</span> },
      ]} /></Card>
    {editing && <Modal open onClose={() => setEditing(null)} title={editId ? "Edit Expense" : "Add Expense"} footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save expense</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{categories.map((value) => <option key={value}>{value}</option>)}</Select><Input label="Amount (₹)" type="number" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank</option></Select><Input label="Description" wrapperClassName="sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Input label="Attachment / reference" wrapperClassName="sm:col-span-2" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
      {!canEdit && <p className="mt-2 text-xs text-danger">Only an Owner can edit or delete expenses.</p>}
    </Modal>}
    <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete expense?" footer={<><Button onClick={() => setDeleting(null)}>Keep expense</Button><Button variant="danger" onClick={() => { if (!deleting) return; try { deleteExpense(deleting.id); toast("Expense deleted."); setDeleting(null); } catch (cause) { toast(cause instanceof Error ? cause.message : "Expense could not be deleted.", "error"); } }}>Delete expense</Button></>}>
      {deleting && <p className="text-sm text-muted">Delete {deleting.category} expense “{deleting.description}” for {money(deleting.amount)}? This action will be recorded in the audit log.</p>}
    </Modal>
  </>;
}

export function DayClosePage() {
  const { dayCloses, closeDay, reopenDay, expenses } = useOperations();
  const { payments } = useShop();
  const toast = useToast();
  const [form, setForm] = useState({ openingCash: "25000", cashSales: "", ledgerReceived: "", otherReceived: "", cashExpenses: "", refunds: "", actual: "", reason: "" });
  const [error, setError] = useState("");
  const [reopening, setReopening] = useState<DayClose | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  const role = actorRole();
  const todayClosed = dayCloses.some((entry) => entry.date === DEMO_TODAY && entry.status === "Closed");
  const expected = Number(form.openingCash) + Number(form.cashSales || 0) + Number(form.ledgerReceived || 0) + Number(form.otherReceived || 0) - Number(form.cashExpenses || 0) - Number(form.refunds || 0);
  const ledgerToday = payments.filter((payment) => payment.date === DEMO_TODAY && payment.mode === "Cash").reduce((sum, payment) => sum + payment.amount, 0);
  const expenseToday = expenses.filter((expense) => expense.date === DEMO_TODAY && expense.paymentMethod === "Cash").reduce((sum, expense) => sum + expense.amount, 0);
  const submit = () => {
    if (form.reason.trim().length < 2 && Number(form.actual) !== expected) return setError("Explain the cash difference before closing.");
    try {
      const record = closeDay({ date: DEMO_TODAY, openingCash: Number(form.openingCash), cashSales: Number(form.cashSales), ledgerReceived: Number(form.ledgerReceived), otherReceived: Number(form.otherReceived), cashExpenses: Number(form.cashExpenses), refunds: Number(form.refunds), actual: Number(form.actual), reason: form.reason.trim() });
      setError(""); toast(`Day closed · expected ${money(record.expected)} · difference ${money(record.difference)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not close day."); }
  };
  const submitReopen = () => {
    if (!reopening || reopenReason.trim().length < 3) return setReopenError("Enter a reason of at least three characters.");
    try {
      reopenDay(reopening.id, reopenReason);
      toast("Day reopened and audit logged.", "info");
      setReopening(null);
      setReopenReason("");
      setReopenError("");
    } catch (cause) { setReopenError(cause instanceof Error ? cause.message : "Could not reopen this day."); }
  };
  return <>
    <PageHeader title="Day Closing · Cash Counter" subtitle="Reconcile physical cash against all cash movements before confirming the day." />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="Expected cash" value={expected} format={money} sub="Opening + receipts − outflows" /><StatCard label="Actual cash" value={Number(form.actual || 0)} format={money} sub="Enter physical count below" /><StatCard label="Difference" value={Number(form.actual || 0) - expected} format={(n) => money(n)} sub="Actual minus expected" /></div>
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]"><Card><CardHead title="Cash reconciliation" /><div className="mb-4 flex flex-wrap gap-2 text-xs"><Button size="sm" onClick={() => setForm({ ...form, ledgerReceived: String(ledgerToday), cashExpenses: String(expenseToday) })}>Fill ledger receipts & cash expenses</Button><span className="self-center text-muted">Invoice tender methods are not stored by this demo; enter verified cash sales manually.</span></div>
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Opening cash (₹)" type="number" min="0" value={form.openingCash} onChange={(e) => setForm({ ...form, openingCash: e.target.value })} /><Input label="Cash sales (₹)" type="number" min="0" value={form.cashSales} onChange={(e) => setForm({ ...form, cashSales: e.target.value })} /><Input label="Cash received from ledger (₹)" type="number" min="0" value={form.ledgerReceived} onChange={(e) => setForm({ ...form, ledgerReceived: e.target.value })} /><Input label="Other cash received (₹)" type="number" min="0" value={form.otherReceived} onChange={(e) => setForm({ ...form, otherReceived: e.target.value })} /><Input label="Cash expenses (₹)" type="number" min="0" value={form.cashExpenses} onChange={(e) => setForm({ ...form, cashExpenses: e.target.value })} /><Input label="Cash refunds (₹)" type="number" min="0" value={form.refunds} onChange={(e) => setForm({ ...form, refunds: e.target.value })} /><Input label="Actual closing cash (₹)" type="number" min="0" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /><Input label="Difference reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<div className="mt-4 flex justify-end"><Button variant="primary" disabled={todayClosed} onClick={submit}>{todayClosed ? "Today's Counter Closed" : "Confirm Day Closing"}</Button></div>
    </Card><Card><CardHead title="Close control" /><p className="text-sm text-muted">A closing is recorded with expected cash, actual count, difference and the closing user. Only an Owner can reopen a closed counter.</p>{todayClosed && <p className="mt-3 text-sm font-medium text-brand">Today is closed. Normal users should not modify closed transactions.</p>}</Card></div>
    <Card className="mt-4"><CardHead title="Closing history" /><SimpleTable rows={dayCloses} rowKey={(row) => row.id} empty="No days closed yet." columns={[
      { head: "Date", cell: (row) => fmtDate(row.date) }, { head: "Opening", cell: (row) => money(row.openingCash) }, { head: "Expected cash", cell: (row) => <b>{money(row.expected)}</b> },
      { head: "Actual cash", cell: (row) => money(row.actual) }, { head: "Difference", cell: (row) => <span className={row.difference === 0 ? "text-brand" : "text-danger"}>{money(row.difference)}</span> },
      { head: "Closed by / status", cell: (row) => <span>{row.closedBy}<small className="block text-muted">{row.status}</small></span> },
      { head: "Action", cell: (row) => role === "Owner" && row.status === "Closed" ? <Button size="sm" variant="danger" onClick={() => { setReopening(row); setReopenReason(""); setReopenError(""); }}>Reopen</Button> : "—" },
    ]} /></Card>
    <Modal open={!!reopening} onClose={() => setReopening(null)} title="Reopen closed day?" footer={<><Button onClick={() => setReopening(null)}>Keep closed</Button><Button variant="danger" onClick={submitReopen}>Confirm reopen</Button></>}>
      <p className="mb-3 text-sm text-muted">{reopening && `Reopening ${fmtDate(reopening.date)} allows transactions to be changed again. This Owner action is written to the audit log.`}</p>
      <Textarea label="Owner reason" required value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
      {reopenError && <p role="alert" className="mt-2 text-xs text-danger">{reopenError}</p>}
    </Modal>
  </>;
}

export function BookingsPage() {
  const { bookings, saveBooking, convertBooking } = useOperations();
  const { customers, settings } = useApp();
  const gold = useGoldAccounting();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ customerId: "", reference: "", item: "", category: "Jewellery", purity: "22K" as Purity, goldRate: String(settings.rate22), weight: "", estimatedAmount: "", advance: "", deliveryDate: "", notes: "" });
  const [error, setError] = useState("");
  const rows = bookings.filter((item) => `${item.reference} ${item.item} ${customers.find((c) => c.id === item.customerId)?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => {
    if (!form.customerId || form.item.trim().length < 2 || !(Number(form.weight) > 0) || !(Number(form.estimatedAmount) > 0) || !form.deliveryDate) return setError("Customer, item, positive estimated weight and amount, and delivery date are required.");
    if (!(Number(form.goldRate) > 0)) return setError("Enter a valid gold rate for the booking.");
    const advance = Number(form.advance);
    if (advance < 0 || advance > Number(form.estimatedAmount)) return setError("Advance must be between zero and the estimated amount.");
    saveBooking({ ...form, reference: form.reference || `BR-${Date.now().toString().slice(-6)}`, item: form.item.trim(), goldRate: Number(form.goldRate), weight: Number(form.weight || 0), estimatedAmount: Number(form.estimatedAmount), advance, status: "Pending" });
    toast("Booking saved."); setAdding(false); setError(""); setForm({ customerId: "", reference: "", item: "", category: "Jewellery", purity: "22K", goldRate: String(settings.rate22), weight: "", estimatedAmount: "", advance: "", deliveryDate: "", notes: "" });
  };
  return <>
    <PageHeader title="Advance / Bookings" subtitle="Track made-to-order jewellery, advances and delivery dates."><Button variant="primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New Booking</Button></PageHeader>
    <Card><div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Search booking, customer or item..." /></div><SimpleTable rows={rows} rowKey={(row) => row.id} empty="No bookings found." columns={[
      { head: "Reference", cell: (row) => <b>{row.reference}</b> }, { head: "Customer / item", cell: (row) => <span>{customers.find((c) => c.id === row.customerId)?.name ?? "Customer"}<small className="block text-muted">{row.item} · {row.category}</small></span> },
      { head: "Weight", cell: (row) => `${num(row.weight)} g` }, { head: "Amount / advance", cell: (row) => <span>{money(row.estimatedAmount)}<small className="block text-muted">Advance {money(row.advance)} · Balance {money(row.estimatedAmount - row.advance)}</small></span> },
      { head: "Delivery", cell: (row) => fmtDate(row.deliveryDate) }, { head: "Status", cell: (row) => <Select label="Booking status" srOnlyLabel value={row.status} disabled={row.status === "Delivered" || row.status === "Cancelled"} onChange={(e) => saveBooking({ ...row, status: e.target.value as typeof row.status })}><option>Pending</option><option>Making</option><option>Ready</option><option>Cancelled</option>{row.status === "Delivered" && <option>Delivered</option>}</Select> },
      { head: "Final invoice", cell: (row) => row.invoiceId ? <Link className="text-brand underline" href={`/invoices/${encodeURIComponent(row.invoiceId)}`}>{row.invoiceId}</Link> : row.status === "Ready" ? <Button size="sm" variant="primary" onClick={() => { try { const invoice = convertBooking(row.id); toast(`Invoice ${invoice} created from booking.`); } catch (cause) { toast(cause instanceof Error ? cause.message : "Could not convert booking.", "error"); } }}>Convert to bill</Button> : "—" },
    ]} /></Card>
    {adding && <Modal open onClose={() => setAdding(false)} title="New Customer Booking" size="lg" footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save booking</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.mobile}</option>)}</Select><Input label="Reference number" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /><Input label="Item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /><Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Select label="Purity" value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value as Purity, goldRate: String(goldRateForPurity(settings.rate22, settings.rate18, e.target.value, gold.purities)) })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select><Input label="Gold rate / g (₹)" type="number" min="1" value={form.goldRate} onChange={(e) => setForm({ ...form, goldRate: e.target.value })} /><Input label="Estimated weight (g)" type="number" min="0.01" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /><Input label="Estimated amount (₹)" type="number" min="1" value={form.estimatedAmount} onChange={(e) => setForm({ ...form, estimatedAmount: e.target.value })} /><Input label="Advance payment (₹)" type="number" min="0" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} /><Input label="Expected delivery" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} /><Textarea label="Notes" wrapperClassName="sm:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>}
  </>;
}

export function ApprovalsPage() {
  const { approvals, decideApproval, requestApproval } = useOperations();
  const toast = useToast();
  const owner = actorRole() === "Owner";
  const [query, setQuery] = useState("");
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ action: "Invoice cancellation", module: "Invoices", reference: "", details: "", reason: "" });
  const rows = approvals.filter((item) => `${item.action} ${item.module} ${item.reference} ${item.requestedBy}`.toLowerCase().includes(query.toLowerCase()));
  const submitRequest = () => {
    if (!draft.reference.trim() || !draft.details.trim() || draft.reason.trim().length < 3) return toast("Enter a reference, details and a clear reason.", "error");
    requestApproval({ ...draft, reference: draft.reference.trim(), details: draft.details.trim(), reason: draft.reason.trim() });
    toast("Owner approval requested.");
    setCreating(false);
    setDraft({ action: "Invoice cancellation", module: "Invoices", reference: "", details: "", reason: "" });
  };
  return <>
    <PageHeader title="Owner Approvals" subtitle="Review high-risk requests. Every decision is added to the read-only audit history."><Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Request Approval</Button></PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3"><StatCard label="Pending" value={approvals.filter((item) => item.status === "Pending").length} sub="Awaiting owner decision" /><StatCard label="Decided" value={approvals.filter((item) => item.status !== "Pending").length} sub="Approval history" /></div>
    {!owner && <Card className="mb-4"><p className="text-sm text-muted">Requests are visible to authorized staff; only an Owner can approve or reject them.</p></Card>}
    <Card><div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Search approval requests..." /></div><SimpleTable rows={rows} rowKey={(row) => row.id} empty="No approval requests yet." columns={[
      { head: "Request", cell: (row) => <span><b>{row.action}</b><small className="block text-muted">{row.module} · {row.reference}</small></span> },
      { head: "Details", cell: (row) => row.details }, { head: "Requested by", cell: (row) => <span>{row.requestedBy}<small className="block text-muted">{new Date(row.requestedAt).toLocaleString()}</small></span> },
      { head: "Status", cell: (row) => <Badge tone={row.status === "Approved" ? "Paid" : row.status === "Rejected" ? "Unpaid" : "Partial"}>{row.status}</Badge> },
      { head: "Reason / decision", cell: (row) => row.status !== "Pending" ? <span>{row.reason || "—"}<small className="block text-muted">{row.decisionBy}</small></span> : owner ? <div className="min-w-48 space-y-1"><input aria-label={`Reason for ${row.id}`} className={controlClass} placeholder="Decision reason (required)" value={reasonById[row.id] ?? ""} onChange={(e) => setReasonById({ ...reasonById, [row.id]: e.target.value })} /><div className="flex gap-1"><Button size="sm" variant="primary" onClick={() => { try { decideApproval(row.id, "Approved", reasonById[row.id] ?? ""); toast("Approval granted and audited."); } catch (cause) { toast(cause instanceof Error ? cause.message : "Could not approve.", "error"); } }}>Approve</Button><Button size="sm" variant="danger" onClick={() => { try { decideApproval(row.id, "Rejected", reasonById[row.id] ?? ""); toast("Request rejected and audited.", "info"); } catch (cause) { toast(cause instanceof Error ? cause.message : "Could not reject.", "error"); } }}>Reject</Button></div></div> : "Owner decision required" },
    ]} /></Card>
    {creating && <Modal open onClose={() => setCreating(false)} title="Request Owner Approval" footer={<><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={submitRequest}>Submit request</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Sensitive action" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value, module: e.target.value === "Gold rate override" ? "Gold rates" : e.target.value === "Ledger write-off" ? "Ledger" : e.target.value === "Loan release" ? "Loans" : e.target.value === "Sensitive customer data change" ? "Customers" : "Invoices" })}><option>Large discount</option><option>Gold rate override</option><option>Invoice cancellation</option><option>Stock adjustment</option><option>Refund</option><option>Ledger write-off</option><option>Loan release</option><option>Sensitive customer data change</option></Select><Input label="Reference ID" value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} /><Input label="Operation details" wrapperClassName="sm:col-span-2" value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} /><Textarea label="Reason for approval" wrapperClassName="sm:col-span-2" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} /></div>
      <p className="mt-3 text-xs text-muted">Requests from this form document the proposed action; only connected actions such as large-discount invoices, refunds and stock adjustments are executed by approval.</p>
    </Modal>}
  </>;
}

export function AuditLogPage() {
  const { auditLogs } = useApp();
  const [query, setQuery] = useState("");
  const rows = auditLogs.filter((entry) => `${entry.actor} ${entry.action} ${entry.module ?? ""} ${entry.referenceId ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const exportCsv = () => downloadFile("reinsoft-gold-audit-log.csv", toCsv(rows, [
    { header: "Date/time", value: (row) => row.at }, { header: "User", value: (row) => row.actor }, { header: "Module", value: (row) => row.module ?? "" }, { header: "Action", value: (row) => row.action }, { header: "Reference", value: (row) => row.referenceId ?? "" }, { header: "Previous value", value: (row) => row.previousValue ?? "" }, { header: "New value", value: (row) => row.newValue ?? "" },
  ]));
  return <>
    <PageHeader title="Audit Log" subtitle="Read-only history of important system and financial actions."><Button onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button></PageHeader>
    <Card><div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Filter by user, module, action or reference..." /></div><SimpleTable rows={rows} rowKey={(row) => row.id} empty="No audit activity matches your search." columns={[
      { head: "Date / time", cell: (row) => new Date(row.at).toLocaleString() }, { head: "User", cell: (row) => <span className="font-medium">{row.actor}</span> }, { head: "Module", cell: (row) => row.module ?? "System" },
      { head: "Action", cell: (row) => row.action }, { head: "Reference", cell: (row) => row.referenceId ?? "—" }, { head: "Change", cell: (row) => <span className="text-xs text-muted">{row.previousValue ? `From: ${row.previousValue}` : ""}{row.previousValue && row.newValue ? " · " : ""}{row.newValue ? `To: ${row.newValue}` : ""}</span> },
    ]} /></Card>
    <p className="mt-3 flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" /> Audit records are read-only and cannot be edited or deleted from this screen.</p>
  </>;
}
