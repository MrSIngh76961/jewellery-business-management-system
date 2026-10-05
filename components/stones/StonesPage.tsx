"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useStones } from "@/components/providers/StonesProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { getSession } from "@/lib/services/auth";
import { DEFAULT_STONE_TYPES, STONE_STATUSES, type StoneItem, type StoneStatus } from "@/lib/stones";
import { downloadFile, toCsv } from "@/lib/utils";

const blank = (): Omit<StoneItem, "id"> => ({
  stoneId: "",
  type: "Diamond",
  shape: "",
  cut: "",
  carat: 0,
  color: "",
  clarity: "",
  certificateNumber: "",
  certificateProvider: "",
  purchaseCost: 0,
  sellingValue: 0,
  supplierId: "",
  status: "Available",
  photoUrl: "",
  notes: "",
  purchaseDate: DEMO_TODAY,
  linkedStockItemId: "",
  linkedStockTag: "",
});

const tone = (status: StoneStatus) => status === "Available" ? "Paid" : status === "Sold" ? "neutral" : status === "Returned" ? "Unpaid" : "Partial";

export function StonesPage() {
  const ready = useReady();
  const toast = useToast();
  const { stones, movements, saveStone, setStoneStatus } = useStones();
  const { stock } = useShop();
  const { suppliers } = useOperations();
  const canEdit = getSession()?.role !== "Staff";
  const [editing, setEditing] = useState<StoneItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blank());
  const [typeCustom, setTypeCustom] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ type: "all", color: "all", clarity: "all", status: "all", supplier: "all", minCarat: "", maxCarat: "" });
  const [statusTarget, setStatusTarget] = useState<StoneItem | null>(null);
  const [statusForm, setStatusForm] = useState({ status: "Available" as StoneStatus, reference: "" });
  const [statusError, setStatusError] = useState("");
  const [historyStone, setHistoryStone] = useState<StoneItem | null>(null);

  if (!ready) return <PageSkeleton />;
  const colors = [...new Set(stones.map((stone) => stone.color).filter(Boolean))].sort();
  const clarities = [...new Set(stones.map((stone) => stone.clarity).filter(Boolean))].sort();
  const types = [...new Set([...DEFAULT_STONE_TYPES, ...stones.map((stone) => stone.type)])];
  const visible = stones.filter((stone) =>
    (filters.type === "all" || stone.type === filters.type) &&
    (filters.color === "all" || stone.color === filters.color) &&
    (filters.clarity === "all" || stone.clarity === filters.clarity) &&
    (filters.status === "all" || stone.status === filters.status) &&
    (filters.supplier === "all" || stone.supplierId === filters.supplier) &&
    (!filters.minCarat || stone.carat >= Number(filters.minCarat)) &&
    (!filters.maxCarat || stone.carat <= Number(filters.maxCarat)),
  );
  const stats = {
    count: visible.length,
    carat: visible.filter((stone) => stone.status !== "Sold").reduce((sum, stone) => sum + stone.carat, 0),
    cost: visible.filter((stone) => stone.status !== "Sold").reduce((sum, stone) => sum + stone.purchaseCost, 0),
    value: visible.filter((stone) => stone.status !== "Sold").reduce((sum, stone) => sum + stone.sellingValue, 0),
  };
  const openNew = () => { setEditing(null); setForm(blank()); setTypeCustom(false); setError(""); setFormOpen(true); };
  const openEdit = (stone: StoneItem) => { setEditing(stone); setForm({ ...stone }); setTypeCustom(!DEFAULT_STONE_TYPES.includes(stone.type as (typeof DEFAULT_STONE_TYPES)[number])); setError(""); setFormOpen(true); };
  const save = () => {
    try {
      const linked = stock.find((item) => item.id === form.linkedStockItemId);
      const status: StoneStatus = linked?.status === "Sold" ? "Sold" : linked ? "Assigned" : editing?.status === "Sold" ? "Sold" : form.status;
      saveStone({ ...form, id: editing?.id, carat: Number(form.carat), purchaseCost: Number(form.purchaseCost), sellingValue: Number(form.sellingValue), status, linkedStockTag: linked?.tag ?? "" });
      toast(editing ? "Stone updated and audit logged." : "Stone purchase recorded in inventory.");
      setEditing(null);
      setFormOpen(false);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Stone record could not be saved."); }
  };
  const saveStatus = () => {
    if (!statusTarget) return;
    try {
      setStoneStatus(statusTarget.id, statusForm.status, statusForm.reference);
      toast(`Stone status changed to ${statusForm.status}.`);
      setStatusTarget(null);
      setStatusError("");
    } catch (cause) { setStatusError(cause instanceof Error ? cause.message : "Stone status could not be changed."); }
  };
  const report = () => downloadFile("reinsoft-gold-stone-inventory.csv", toCsv(visible, [
    { header: "Stone ID", value: (stone) => stone.stoneId },
    { header: "Type", value: (stone) => stone.type },
    { header: "Carat", value: (stone) => stone.carat },
    { header: "Color", value: (stone) => stone.color },
    { header: "Clarity", value: (stone) => stone.clarity },
    { header: "Purchase Cost (INR)", value: (stone) => stone.purchaseCost },
    { header: "Selling Value (INR)", value: (stone) => stone.sellingValue },
    { header: "Supplier", value: (stone) => suppliers.find((supplier) => supplier.id === stone.supplierId)?.name ?? "" },
    { header: "Status", value: (stone) => stone.status },
    { header: "Jewellery Tag", value: (stone) => stone.linkedStockTag },
  ]));

  return <>
    <PageHeader title="Diamond & Stone Inventory" subtitle="Track certified stones, purchase cost, valuation and movement against jewellery stock.">
      <Button onClick={report}>Export stone report</Button>
      {canEdit && <Button variant="primary" onClick={openNew}>Record stone purchase</Button>}
    </PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Filtered Stones" value={stats.count} sub="Records matching filters" />
      <StatCard label="Available Carat" value={stats.carat} format={(value) => `${value.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ct`} delay={0.05} />
      <StatCard label="Purchase Cost" value={stats.cost} format={money} delay={0.1} />
      <StatCard label="Estimated Selling Value" value={stats.value} format={money} delay={0.15} />
    </div>
    <Card className="mb-4">
      <CardHead title="Inventory filters" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="all">All types</option>{types.map((type) => <option key={type}>{type}</option>)}</Select>
        <Input label="Minimum carat" type="number" min="0" step="0.01" value={filters.minCarat} onChange={(event) => setFilters({ ...filters, minCarat: event.target.value })} />
        <Input label="Maximum carat" type="number" min="0" step="0.01" value={filters.maxCarat} onChange={(event) => setFilters({ ...filters, maxCarat: event.target.value })} />
        <Select label="Color" value={filters.color} onChange={(event) => setFilters({ ...filters, color: event.target.value })}><option value="all">All colors</option>{colors.map((value) => <option key={value}>{value}</option>)}</Select>
        <Select label="Clarity" value={filters.clarity} onChange={(event) => setFilters({ ...filters, clarity: event.target.value })}><option value="all">All clarity</option>{clarities.map((value) => <option key={value}>{value}</option>)}</Select>
        <Select label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All statuses</option>{STONE_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select>
        <Select label="Supplier" value={filters.supplier} onChange={(event) => setFilters({ ...filters, supplier: event.target.value })}><option value="all">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select>
      </div>
    </Card>
    <Card className="mb-4">
      <CardHead title="Stone inventory" />
      <SimpleTable rows={visible} rowKey={(stone) => stone.id} minWidth={1120} empty="No stones match these filters. Record a stone purchase to begin." columns={[
        { head: "Stone ID / Type", cell: (stone) => <><b>{stone.stoneId}</b><span className="block text-xs text-muted">{stone.type} · {stone.shape || "Shape n/a"} · {stone.cut || "Cut n/a"}</span></> },
        { head: "Carat", cell: (stone) => `${stone.carat.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ct` },
        { head: "Color / Clarity", cell: (stone) => `${stone.color || "—"} / ${stone.clarity || "—"}` },
        { head: "Certificate", cell: (stone) => <>{stone.certificateNumber || "—"}<span className="block text-xs text-muted">{stone.certificateProvider}</span></> },
        { head: "Cost / Value", cell: (stone) => <>{money(stone.purchaseCost)}<span className="block text-xs text-muted">{money(stone.sellingValue)} estimated sale</span></> },
        { head: "Supplier", cell: (stone) => suppliers.find((supplier) => supplier.id === stone.supplierId)?.name ?? "—" },
        { head: "Linked item", cell: (stone) => stone.linkedStockTag || "—" },
        { head: "Status", cell: (stone) => <Badge tone={tone(stone.status)}>{stone.status}</Badge> },
        { head: "Actions", cell: (stone) => <div className="flex gap-1">
          {canEdit && <Button size="sm" onClick={() => openEdit(stone)}>Edit</Button>}
          <Button size="sm" variant="ghost" onClick={() => setHistoryStone(stone)}>History</Button>
          {canEdit && <Button size="sm" onClick={() => { setStatusTarget(stone); setStatusForm({ status: stone.status, reference: "" }); setStatusError(""); }}>Status</Button>}
        </div> },
      ]} />
    </Card>
    <Card>
      <CardHead title="Stone movement history">
        <span className="text-xs text-muted">{movements.length} recorded movements</span>
      </CardHead>
      <SimpleTable rows={movements} rowKey={(movement) => movement.id} minWidth={760} empty="Stone purchases and status changes will appear here." columns={[
        { head: "Date", cell: (movement) => fmtDate(movement.date) },
        { head: "Stone ID", cell: (movement) => stones.find((stone) => stone.id === movement.stoneId)?.stoneId ?? movement.stoneId },
        { head: "Movement", cell: (movement) => `${movement.fromStatus} → ${movement.toStatus}` },
        { head: "Reference", cell: (movement) => movement.reference },
        { head: "User", cell: (movement) => movement.actor },
        { head: "Notes", cell: (movement) => movement.notes || "—" },
      ]} />
      <p className="mt-3 text-xs text-muted">Stone value is shown separately from the existing gold invoice calculation. Linking a stone changes its traceability only; it does not silently alter GST or billing totals.</p>
    </Card>

    <Modal open={formOpen} onClose={() => { setEditing(null); setFormOpen(false); }} title={editing ? `Edit stone · ${editing.stoneId}` : "Record stone purchase"} footer={<><Button onClick={() => { setEditing(null); setFormOpen(false); }}>Cancel</Button><Button variant="primary" onClick={save}>{editing ? "Save changes" : "Record purchase"}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Stone ID" value={form.stoneId} onChange={(event) => setForm({ ...form, stoneId: event.target.value })} />
        <Select label="Stone type" value={typeCustom ? "Other" : form.type} onChange={(event) => { setTypeCustom(event.target.value === "Other"); setForm({ ...form, type: event.target.value === "Other" ? "" : event.target.value }); }}>
          {types.map((type) => <option key={type}>{type}</option>)}{!types.includes("Other") && <option>Other</option>}
        </Select>
        {typeCustom && <Input label="Custom stone type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} />}
        <Input label="Shape" value={form.shape} onChange={(event) => setForm({ ...form, shape: event.target.value })} />
        <Input label="Cut" value={form.cut} onChange={(event) => setForm({ ...form, cut: event.target.value })} />
        <Input label="Carat" type="number" min="0.001" step="0.001" value={form.carat || ""} onChange={(event) => setForm({ ...form, carat: Number(event.target.value) })} />
        <Input label="Color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
        <Input label="Clarity" value={form.clarity} onChange={(event) => setForm({ ...form, clarity: event.target.value })} />
        <Input label="Certificate number" value={form.certificateNumber} onChange={(event) => setForm({ ...form, certificateNumber: event.target.value })} />
        <Input label="Certificate provider" value={form.certificateProvider} onChange={(event) => setForm({ ...form, certificateProvider: event.target.value })} />
        <Input label="Purchase cost (₹)" type="number" min="0" step="0.01" value={form.purchaseCost} onChange={(event) => setForm({ ...form, purchaseCost: Number(event.target.value) })} />
        <Input label="Selling value (₹)" type="number" min="0" step="0.01" value={form.sellingValue} onChange={(event) => setForm({ ...form, sellingValue: Number(event.target.value) })} />
        <Select label="Supplier" value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select>
        <Input label="Purchase date" type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} />
        <Select label="Link jewellery item" value={form.linkedStockItemId} onChange={(event) => setForm({ ...form, linkedStockItemId: event.target.value })}><option value="">No linked item</option>{stock.map((item) => <option key={item.id} value={item.id}>{item.tag} · {item.name} · {item.status}</option>)}</Select>
        <Input label="Photo reference URL" type="url" value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} />
        <Select label="Status" value={form.status} disabled={!!form.linkedStockItemId || editing?.status === "Sold"} onChange={(event) => setForm({ ...form, status: event.target.value as StoneStatus })}>{STONE_STATUSES.filter((status) => status !== "Sold" && status !== "Returned").map((status) => <option key={status}>{status}</option>)}</Select>
        <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </div>
      {form.photoUrl && <a className="mt-2 inline-block text-xs text-brand underline" href={form.photoUrl} target="_blank" rel="noreferrer">Open stone photo reference</a>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </Modal>

    <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title={statusTarget ? `Change status · ${statusTarget.stoneId}` : "Change stone status"} footer={<><Button onClick={() => setStatusTarget(null)}>Cancel</Button><Button variant="primary" onClick={saveStatus}>Save status</Button></>}>
      <Select label="Status" value={statusForm.status} onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as StoneStatus })}>{STONE_STATUSES.filter((status) => status !== "Returned").map((status) => <option key={status}>{status}</option>)}</Select>
      {statusForm.status === "Sold" && <Input label="Sale reference" value={statusForm.reference} onChange={(event) => setStatusForm({ ...statusForm, reference: event.target.value })} />}
      <p className="mt-2 text-xs text-muted">Stones linked to jewellery stock are marked Sold by the existing billing flow and restored to Returned when that item is returned.</p>
      {statusError && <p role="alert" className="mt-2 text-xs text-danger">{statusError}</p>}
    </Modal>

    <Modal open={!!historyStone} onClose={() => setHistoryStone(null)} title={historyStone ? `Stone history · ${historyStone.stoneId}` : "Stone history"}>
      {historyStone && <div className="space-y-3">
        <p className="text-sm text-muted">{historyStone.type} · {historyStone.carat} ct · {historyStone.status}</p>
        <SimpleTable rows={movements.filter((movement) => movement.stoneId === historyStone.id)} rowKey={(movement) => movement.id} minWidth={520} empty="No movement history." columns={[
          { head: "Date", cell: (movement) => fmtDate(movement.date) },
          { head: "Change", cell: (movement) => `${movement.fromStatus} → ${movement.toStatus}` },
          { head: "Reference", cell: (movement) => movement.reference },
          { head: "User", cell: (movement) => movement.actor },
        ]} />
      </div>}
    </Modal>
  </>;
}
