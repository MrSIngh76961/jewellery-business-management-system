"use client";

import { AlertTriangle, Plus, Printer, QrCode as QrIcon, Receipt, Search, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrintLabels, TagLabel } from "@/components/stock/TagLabel";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, controlClass } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { fmtDate, money, num } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { useI18n } from "@/lib/prefs";
import type { Purity, StockItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/services/auth";
import { DEMO_TODAY } from "@/lib/config";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { goldRateForPurity } from "@/lib/purity";

export default function StockPage() {
  const { settings } = useApp();
  const gold = useGoldAccounting();
  const { stock, addStock } = useShop();
  const { stockAdjustments, adjustStock, requestApproval } = useOperations();
  const { t } = useI18n();
  const toast = useToast();
  const ready = useReady(250);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState<StockItem | null>(null);
  const [printing, setPrinting] = useState<StockItem[] | null>(null);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [physicalWeight, setPhysicalWeight] = useState("");
  const [adjustReason, setAdjustReason] = useState<"Damage" | "Lost" | "Testing/Melting" | "Correction" | "Manual adjustment" | "Other">("Correction");
  const [form, setForm] = useState({ name: "", purity: "22K" as Purity, weight: "", making: "" });
  const [err, setErr] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return stock.filter((s) => (status === "All" || s.status === status) && `${s.tag} ${s.name}`.toLowerCase().includes(term));
  }, [stock, q, status]);
  const ageDays = (date: string) => Math.max(0, Math.floor((new Date(`${DEMO_TODAY}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000));
  const inStockItems = stock.filter((item) => item.status === "In Stock");
  const aging = [
    { label: "0–30 days", count: inStockItems.filter((item) => ageDays(item.addedOn) <= 30).length },
    { label: "31–90 days", count: inStockItems.filter((item) => ageDays(item.addedOn) > 30 && ageDays(item.addedOn) <= 90).length },
    { label: "91–180 days", count: inStockItems.filter((item) => ageDays(item.addedOn) > 90 && ageDays(item.addedOn) <= 180).length },
    { label: "180+ days", count: inStockItems.filter((item) => ageDays(item.addedOn) > 180).length },
  ];

  if (!ready) return <PageSkeleton />;
  const inStock = inStockItems;
  const weight = inStock.reduce((s, x) => s + x.weight, 0);
  const value = inStock.reduce((s, x) => s + x.weight * goldRateForPurity(settings.rate22, settings.rate18, x.purity, gold.purities), 0);

  const save = () => {
    const w = Number(form.weight);
    const m = Number(form.making || 0);
    if (form.name.trim().length < 2) return setErr("Enter the item name");
    if (!(w > 0)) return setErr("Weight must be greater than 0");
    if (m < 0) return setErr("Making charge cannot be negative");
    try {
      const item = addStock({ name: form.name.trim(), purity: form.purity, weight: w, making: m });
      toast(`Stock added · tag ${item.tag}`);
      setAdding(false);
      setErr("");
      setForm({ name: "", purity: "22K", weight: "", making: "" });
    } catch (cause) { toast(cause instanceof Error ? cause.message : "Stock could not be added.", "error"); }
  };
  const saveAdjustment = () => {
    const physical = Number(physicalWeight);
    if (!adjusting || !Number.isFinite(physical) || physical < 0) return toast("Enter a valid non-negative physical weight.", "error");
    try {
      if (getSession()?.role === "Owner" || !settings.approvalRequireStockAdjustment) {
        const adjustment = adjustStock(adjusting.id, physical, adjustReason);
        toast(`Stock adjusted · ${adjustment.difference >= 0 ? "+" : ""}${num(adjustment.difference)} g`);
      } else {
        requestApproval({ action: "Stock adjustment", module: "Stock", reference: adjusting.tag, details: `${adjusting.name}: ${adjusting.weight} g → ${physical} g · ${adjustReason}`, reason: "Physical stock reconciliation", payload: { stockItemId: adjusting.id, physicalWeight: physical, reason: adjustReason } });
        toast("Adjustment submitted for Owner approval.", "info");
      }
      setAdjusting(null);
    } catch (cause) { toast(cause instanceof Error ? cause.message : "Could not adjust stock.", "error"); }
  };

  return (
    <>
      <PageHeader title="Stock" subtitle="Tagged jewellery inventory with barcode / QR labels.">
        <Button onClick={() => setPrinting(rows.filter((r) => r.status === "In Stock"))}>
          <Printer className="h-4 w-4" /> {t("Print Tags")}
        </Button>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t("Add Stock")}
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Items In Stock" value={inStock.length} sub="Available pieces" />
        <StatCard label="Stock Weight" value={`${num(Math.round(weight * 100) / 100)} g`} sub="Gross weight" delay={0.05} />
        <StatCard label="Stock Value" value={value} format={money} sub="At today's rate" delay={0.1} />
        <StatCard label="Sold Items" value={stock.length - inStock.length} sub="Tagged & sold" delay={0.15} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {aging.map((bucket) => <Card key={bucket.label} className="p-4"><span className="text-xs text-muted">{bucket.label}</span><b className="mt-1 block text-lg">{bucket.count}</b><small className="text-muted">unsold item(s)</small></Card>)}
      </div>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input aria-label="Search stock" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag or item…" className={cn(controlClass, "pl-9")} />
          </div>
          <Select label="Status" srOnlyLabel value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All status</option>
            <option value="In Stock">In Stock</option>
            <option value="Sold">Sold</option>
          </Select>
        </div>
        <SimpleTable
          rows={rows}
          rowKey={(r) => r.id}
          empty="No stock items match your search."
          columns={[
            { head: "Tag", cell: (r) => <b>{r.tag}</b> },
            { head: "Item", cell: (r) => r.name },
            { head: "Purity", cell: (r) => r.purity },
            { head: "Weight", cell: (r) => `${r.weight} g` },
            { head: "Making", cell: (r) => money(r.making) },
            { head: "Age", cell: (r) => `${ageDays(r.addedOn)} days` },
            { head: "Status", cell: (r) => <Badge tone={r.status === "In Stock" ? "Paid" : "neutral"}>{r.status}</Badge> },
            {
              head: "Actions",
              cell: (r) => (
                <span className="flex gap-1.5">
                  <Button size="sm" onClick={() => setLabel(r)}>
                    <QrIcon className="h-3.5 w-3.5" /> Label
                  </Button>
                  {r.status === "In Stock" && (
                    <>
                      <Button size="sm" onClick={() => { setAdjusting(r); setPhysicalWeight(String(r.weight)); }}><Scale className="h-3.5 w-3.5" /> Adjust</Button>
                      <Link href={`/billing/new?stock=${r.id}`} className={buttonClass("gold", "sm")}>
                        <Receipt className="h-3.5 w-3.5" /> Sell
                      </Link>
                    </>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gold-deep" /><h2 className="text-sm font-semibold">Aging / dead stock · over 90 days</h2></div>
        <SimpleTable rows={inStockItems.filter((item) => ageDays(item.addedOn) > 90)} rowKey={(item) => item.id} empty="No unsold stock older than 90 days." columns={[
          { head: "Tag", cell: (item) => <b>{item.tag}</b> }, { head: "Item", cell: (item) => item.name }, { head: "Weight", cell: (item) => `${num(item.weight)} g` }, { head: "Added", cell: (item) => fmtDate(item.addedOn) }, { head: "Age", cell: (item) => <b>{ageDays(item.addedOn)} days</b> },
        ]} />
      </Card>
      <Card className="mt-4"><h2 className="mb-3 text-sm font-semibold">Recent stock adjustments</h2><SimpleTable rows={stockAdjustments} rowKey={(item) => item.id} empty="No stock adjustments recorded." columns={[
        { head: "Date", cell: (item) => new Date(item.date).toLocaleString() }, { head: "Tag / item", cell: (item) => <span>{item.tag}<small className="block text-muted">{item.item}</small></span> },
        { head: "Reason", cell: (item) => item.reason }, { head: "System → physical", cell: (item) => `${num(item.systemWeight)} g → ${num(item.physicalWeight)} g` }, { head: "Difference", cell: (item) => <b>{item.difference > 0 ? "+" : ""}{num(item.difference)} g</b> }, { head: "User", cell: (item) => item.actor },
      ]} /></Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Stock Item"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save Item
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label="Item name" placeholder="e.g. Gold Ring" wrapperClassName="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Purity" value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value as Purity })}>
            {gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}
          </Select>
          <Input label="Weight (g)" type="number" step="0.01" min="0" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <Input label="Making charge (₹)" type="number" min="0" value={form.making} onChange={(e) => setForm({ ...form, making: e.target.value })} />
        </div>
        {err && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {err}
          </p>
        )}
      </Modal>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Physical stock adjustment${adjusting ? ` · ${adjusting.tag}` : ""}`} footer={<><Button onClick={() => setAdjusting(null)}>Cancel</Button><Button variant="primary" onClick={saveAdjustment}>Submit adjustment</Button></>}>
        {adjusting && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-cream p-3 text-sm"><span className="block text-muted">System weight</span><b>{num(adjusting.weight)} g · {adjusting.name}</b></div><Input label="Physical weight (g)" type="number" min="0" step="0.01" value={physicalWeight} onChange={(e) => setPhysicalWeight(e.target.value)} /><Select label="Adjustment reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value as typeof adjustReason)}><option>Damage</option><option>Lost</option><option>Testing/Melting</option><option>Correction</option><option>Manual adjustment</option><option>Other</option></Select><p className="self-end text-sm text-muted">Difference: <b className="text-ink">{num(Number(physicalWeight || 0) - adjusting.weight)} g</b>{getSession()?.role !== "Owner" && <span className="block text-xs">An Owner must approve this adjustment before stock changes.</span>}</p></div>}
      </Modal>

      <Modal
        open={!!label}
        onClose={() => setLabel(null)}
        title="Barcode / QR Label"
        footer={
          <>
            <Button onClick={() => setLabel(null)}>Close</Button>
            <Button variant="primary" onClick={() => label && setPrinting([label])}>
              <Printer className="h-4 w-4" /> Print Label
            </Button>
          </>
        }
      >
        <div className="flex justify-center">{label && <TagLabel item={label} />}</div>
      </Modal>

      {printing && <PrintLabels items={printing} onDone={() => setPrinting(null)} />}
    </>
  );
}
