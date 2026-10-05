"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { DEMO_TODAY } from "@/lib/config";
import { balanceAt, karigarActualWastage, karigarDifference, karigarPendingGold, karigarReturnedWeight, type KarigarJob, type MetalTransactionType } from "@/lib/gold-accounting";
import { fmtDate } from "@/lib/format";
import { getSession } from "@/lib/services/auth";
import { useReady } from "@/lib/hooks";

const grams = (value: number) => `${value.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;
const dayBefore = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};
const slugFor = (name: string) => name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MANUAL_TYPES: MetalTransactionType[] = ["Other Gold Received", "Used in Manufacturing", "Gold Loss / Wastage"];
type Period = "Daily" | "Monthly" | "Custom";

function rangeFor(period: Period) {
  return period === "Monthly" ? { from: `${DEMO_TODAY.slice(0, 7)}-01`, to: DEMO_TODAY } : { from: DEMO_TODAY, to: DEMO_TODAY };
}

function currentWeight(job: KarigarJob, transactions: ReturnType<typeof useGoldAccounting>["metalTransactions"], throughDate: string) {
  const returned = transactions
    .filter((transaction) => transaction.jobId === job.id && transaction.type === "Karigar Return" && transaction.date <= throughDate)
    .reduce((sum, transaction) => sum + transaction.weight, 0);
  const issued = transactions.find((transaction) => transaction.id === job.issuedTransactionId);
  if (!issued || issued.date > throughDate) return 0;
  return job.status === "Open" || !jobCompletedBy(job, transactions, throughDate)
    ? Math.max(0, job.issuedWeight - returned)
    : Math.max(0, karigarDifference(job, transactions));
}

function jobCompletedBy(job: KarigarJob, transactions: ReturnType<typeof useGoldAccounting>["metalTransactions"], throughDate: string) {
  return job.status !== "Open" && transactions.some((transaction) => transaction.jobId === job.id && transaction.type === "Karigar Return" && transaction.date <= throughDate);
}

export function GoldAccountingPage() {
  const ready = useReady();
  const toast = useToast();
  const gold = useGoldAccounting();
  const session = getSession();
  const [period, setPeriod] = useState<Period>("Daily");
  const [dates, setDates] = useState(rangeFor("Daily"));
  const [purityFilter, setPurityFilter] = useState("all");
  const [openingOpen, setOpeningOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [purityOpen, setPurityOpen] = useState(false);
  const [opening, setOpening] = useState({ purityId: "22K", date: "2026-09-01", weight: "" });
  const [movement, setMovement] = useState({ date: DEMO_TODAY, reference: "", type: "Other Gold Received" as MetalTransactionType, purityId: "22K", weight: "", notes: "" });
  const [reconciliation, setReconciliation] = useState({ date: DEMO_TODAY, purityId: "22K", physical: "", reason: "" });
  const [error, setError] = useState("");

  if (!ready) return <PageSkeleton />;
  const from = dates.from;
  const to = dates.to;
  const balances = gold.purities.map((purity) => {
    const base = gold.openingBalances.find((openingBalance) => openingBalance.purityId === purity.id);
    const hasOpening = !!base && base.date <= from;
    const openingValue = hasOpening
      ? base.date === from
        ? base.weight
        : balanceAt(base, gold.metalTransactions, purity.id, dayBefore(from))
      : undefined;
    const events = gold.metalTransactions.filter((event) => event.purityId === purity.id && event.date >= from && event.date <= to && (!base || event.date >= base.date));
    const expected = openingValue === undefined ? undefined : openingValue + events.reduce((sum, event) => sum + event.signedWeight, 0);
    const last = gold.reconciliations.find((entry) => entry.purityId === purity.id && entry.date <= to);
    return { purity, openingValue, expected, hasOpening, last, events };
  });
  const reportBalances = purityFilter === "all" ? balances : balances.filter((item) => item.purity.id === purityFilter);
  const periodEvents = reportBalances.flatMap((item) => item.events).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const openingAvailable = reportBalances.length > 0 && reportBalances.every((item) => item.openingValue !== undefined);
  const expectedAvailable = reportBalances.length > 0 && reportBalances.every((item) => item.expected !== undefined);
  const physicalAvailable = reportBalances.length > 0 && reportBalances.every((item) => !!item.last);
  const total = reportBalances.reduce((sum, item) => ({
    opening: sum.opening + (item.openingValue ?? 0),
    purchases: sum.purchases + item.events.filter((event) => event.type === "Purchase").reduce((amount, event) => amount + event.weight, 0),
    oldGold: sum.oldGold + item.events.filter((event) => event.type === "Old Gold Received").reduce((amount, event) => amount + event.weight, 0),
    karigarBalance: sum.karigarBalance + gold.karigarJobs.filter((job) => job.purityId === item.purity.id).reduce((amount, job) => amount + currentWeight(job, gold.metalTransactions, to), 0),
    sales: sum.sales + item.events.filter((event) => event.type === "Sale").reduce((amount, event) => amount + event.weight, 0),
    wastage: sum.wastage + item.events.filter((event) => event.type === "Gold Loss / Wastage").reduce((amount, event) => amount + event.weight, 0) + gold.karigarJobs.filter((job) => job.purityId === item.purity.id && jobCompletedBy(job, gold.metalTransactions, to)).reduce((amount, job) => amount + karigarActualWastage(job, gold.metalTransactions), 0),
    adjustment: sum.adjustment + item.events.filter((event) => event.type === "Adjustment").reduce((amount, event) => amount + event.signedWeight, 0),
    expected: sum.expected + (item.expected ?? 0),
    physical: sum.physical + (item.last?.physicalStock ?? 0),
    difference: sum.difference + (item.last?.difference ?? 0),
  }), { opening: 0, purchases: 0, oldGold: 0, karigarBalance: 0, sales: 0, wastage: 0, adjustment: 0, expected: 0, physical: 0, difference: 0 });
  const visibleEvents = (purityFilter === "all" ? periodEvents : periodEvents.filter((event) => event.purityId === purityFilter));
  const calculatedPhysical = reconciliation.physical === "" ? undefined : Number(reconciliation.physical);
  const reconciliationOpening = gold.openingBalances.find((balance) => balance.purityId === reconciliation.purityId);
  const reconciliationSystem = balanceAt(
    reconciliationOpening,
    gold.metalTransactions,
    reconciliation.purityId,
    reconciliation.date,
  );
  const reconciliationDifference = calculatedPhysical === undefined || !Number.isFinite(calculatedPhysical) ? undefined : calculatedPhysical - reconciliationSystem;

  const changePeriod = (next: Period) => {
    setPeriod(next);
    if (next !== "Custom") setDates(rangeFor(next));
  };
  const submitOpening = () => {
    try {
      gold.setOpeningBalance(opening.purityId, opening.date, Number(opening.weight));
      toast("Opening gold stock saved and audited.");
      setOpeningOpen(false);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Opening stock could not be saved."); }
  };
  const submitMovement = () => {
    try {
      gold.recordMetalMovement({ ...movement, weight: Number(movement.weight) });
      toast("Gold movement recorded.");
      setMovementOpen(false);
      setMovement({ ...movement, reference: "", weight: "", notes: "" });
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gold movement could not be recorded."); }
  };
  const submitReconciliation = () => {
    try {
      const saved = gold.reconcileGold(reconciliation.purityId, reconciliation.date, Number(reconciliation.physical), reconciliation.reason);
      toast(Math.abs(saved.difference) > 0.001 ? `Gold difference ${grams(saved.difference)} recorded as an explicit adjustment.` : "Physical stock reconciled.");
      setReconcileOpen(false);
      setReconciliation({ ...reconciliation, physical: "", reason: "" });
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gold reconciliation failed."); }
  };

  return <>
    <PageHeader title="Gold Metal Accounting" subtitle="Reconcile physical gold movement separately from tagged jewellery inventory.">
      <Link href="/gold-accounting/purity" className="rounded-lg border border-line px-3 py-2 text-sm transition hover:border-gold">Fine-gold converter</Link>
      {session?.role === "Owner" && <Button onClick={() => { setOpeningOpen(true); setError(""); }}>Opening stock</Button>}
      {session?.role !== "Staff" && <Button onClick={() => { setMovementOpen(true); setError(""); }}>Record movement</Button>}
      {session?.role === "Owner" && <Button variant="primary" disabled={!gold.openingBalances.some((balance) => balance.purityId === reconciliation.purityId && balance.date <= reconciliation.date)} onClick={() => { setReconcileOpen(true); setError(""); }}>Reconcile physical gold</Button>}
    </PageHeader>

    <Card className="mb-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Report period" value={period} onChange={(event) => changePeriod(event.target.value as Period)}>
          <option>Daily</option><option>Monthly</option><option>Custom</option>
        </Select>
        <Input label="From" type="date" value={from} onChange={(event) => { setPeriod("Custom"); setDates((current) => ({ ...current, from: event.target.value })); }} />
        <Input label="To" type="date" value={to} onChange={(event) => { setPeriod("Custom"); setDates((current) => ({ ...current, to: event.target.value })); }} />
        <Select label="Purity filter" value={purityFilter} onChange={(event) => setPurityFilter(event.target.value)}>
          <option value="all">All purities</option>
          {gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}
        </Select>
      </div>
      {from > to && <p role="alert" className="mt-2 text-xs text-danger">The report start date must not be after the end date.</p>}
    </Card>

    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {openingAvailable
        ? <StatCard label="Opening Stock" value={total.opening} format={grams} sub={`${from} opening`} />
        : <Card className="border-line"><p className="text-xs text-muted">Opening Stock</p><p className="mt-2 text-sm font-semibold text-ink">Not configured</p><p className="mt-1 text-[11px] text-muted">Set opening stock for each selected purity.</p></Card>}
      <StatCard label="Purchases" value={total.purchases} format={grams} delay={0.03} />
      <StatCard label="Old Gold" value={total.oldGold} format={grams} delay={0.06} />
      <StatCard label="Karigar Balance" value={total.karigarBalance} format={grams} delay={0.09} sub="Gold currently out on open jobs" />
      <StatCard label="Sales" value={total.sales} format={grams} delay={0.12} />
      <StatCard label="Wastage" value={total.wastage} format={grams} delay={0.15} sub="Manual plus completed job actuals" />
      <StatCard label="Adjustments" value={total.adjustment} format={(value) => `${value >= 0 ? "+" : ""}${grams(value)}`} delay={0.18} />
      {expectedAvailable
        ? <StatCard label="Expected Closing" value={total.expected} format={grams} delay={0.21} />
        : <Card className="border-gold/30"><p className="text-xs text-muted">Expected Closing</p><p className="mt-2 text-sm font-semibold text-ink">Opening balance required</p><p className="mt-1 text-[11px] text-muted">Set opening stock for every purity in this report.</p></Card>}
      {physicalAvailable
        ? <StatCard label="Physical Closing" value={total.physical} format={grams} delay={0.24} />
        : <Card className="border-line"><p className="text-xs text-muted">Physical Closing</p><p className="mt-2 text-sm font-semibold text-ink">Not counted</p><p className="mt-1 text-[11px] text-muted">Reconcile each purity for this report.</p></Card>}
      {physicalAvailable
        ? <StatCard label="Last Difference" value={total.difference} format={(value) => `${value >= 0 ? "+" : ""}${grams(value)}`} delay={0.27} trend={Math.abs(total.difference) > 0.001 ? "down" : undefined} />
        : <Card className="border-line"><p className="text-xs text-muted">Last Difference</p><p className="mt-2 text-sm font-semibold text-ink">Not available</p><p className="mt-1 text-[11px] text-muted">No complete purity-wise count.</p></Card>}
    </div>

    <Card className="mb-4">
      <CardHead title="Purity-wise reconciliation" />
      <SimpleTable rows={reportBalances} rowKey={(row) => row.purity.id} minWidth={760} empty="Configure opening stock to begin tracking actual metal balances." columns={[
        { head: "Purity", cell: (row) => <><b>{row.purity.name}</b><span className="block text-xs text-muted">{(row.purity.fineness * 100).toFixed(2)}% fine</span></> },
        { head: "Opening", cell: (row) => row.openingValue === undefined ? <span className="text-muted">Not configured</span> : grams(row.openingValue) },
        { head: "Net Movement", cell: (row) => grams(row.events.reduce((sum, event) => sum + event.signedWeight, 0)) },
        { head: "System Stock", cell: (row) => row.expected === undefined ? <span className="text-muted">Opening required</span> : <b>{grams(row.expected)}</b> },
        { head: "Physical Stock", cell: (row) => row.last ? grams(row.last.physicalStock) : <span className="text-muted">Not counted</span> },
        { head: "Difference", cell: (row) => row.last ? <span className={Math.abs(row.last.difference) > 0.001 ? "font-semibold text-danger" : "text-success"}>{row.last.difference > 0 ? "+" : ""}{grams(row.last.difference)}</span> : "—" },
      ]} />
      {session?.role === "Owner" && <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => { setOpening({ purityId: gold.purities[0]?.id ?? "22K", date: "2026-09-01", weight: "" }); setOpeningOpen(true); }}>Set opening balance</Button>
        <Button size="sm" variant="gold" disabled={!gold.openingBalances.some((balance) => balance.purityId === gold.purities[0]?.id && balance.date <= to)} onClick={() => { setReconciliation({ date: to, purityId: gold.purities[0]?.id ?? "22K", physical: "", reason: "" }); setReconcileOpen(true); }}>Enter physical count</Button>
        <Button size="sm" onClick={() => setPurityOpen(true)}>Configure purity</Button>
      </div>}
      <p className="mt-3 text-xs text-muted">Purchases, invoice sales, old-gold exchange, returns and karigar movements are linked to their source records. Karigar wastage is reported as a classification of the issue/return difference and is not subtracted twice.</p>
    </Card>

    <Card>
      <CardHead title="Gold movement history">
        <span className="text-xs text-muted">{visibleEvents.length} linked and recorded movements</span>
      </CardHead>
      <SimpleTable rows={visibleEvents} rowKey={(event) => event.id} minWidth={980} empty="No gold movements in this report period." columns={[
        { head: "Date", cell: (event) => fmtDate(event.date) },
        { head: "Reference", cell: (event) => <b>{event.reference}</b> },
        { head: "Transaction", cell: (event) => event.type },
        { head: "Purity", cell: (event) => <>{event.purityId}<span className="block text-xs text-muted">{event.fineGoldPercentage === undefined ? "—" : `${event.fineGoldPercentage.toFixed(2)}% fine`}</span></> },
        { head: "Weight", cell: (event) => <span className={event.signedWeight < 0 ? "text-danger" : "text-success"}>{event.signedWeight > 0 ? "+" : ""}{grams(event.signedWeight)}</span> },
        { head: "Fine Gold", cell: (event) => `${event.signedFineGoldWeight > 0 ? "+" : ""}${grams(event.signedFineGoldWeight)}` },
        { head: "22K Equivalent", cell: (event) => `${event.signedWeight < 0 ? "−" : "+"}${grams(event.equivalent22K ?? 0)}` },
        { head: "18K Equivalent", cell: (event) => `${event.signedWeight < 0 ? "−" : "+"}${grams(event.equivalent18K ?? 0)}` },
        { head: "User", cell: (event) => event.actor },
        { head: "Source / Notes", cell: (event) => <>{event.source}<span className="block max-w-48 truncate text-xs text-muted">{event.notes || event.sourceId || "—"}</span></> },
      ]} />
    </Card>

    <Modal open={openingOpen} onClose={() => setOpeningOpen(false)} title="Set opening gold stock" footer={<><Button onClick={() => setOpeningOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitOpening}>Save opening stock</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Purity" value={opening.purityId} onChange={(event) => setOpening({ ...opening, purityId: event.target.value })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select>
        <Input label="Opening date" type="date" value={opening.date} onChange={(event) => setOpening({ ...opening, date: event.target.value })} />
        <Input label="Weight (g)" type="number" min="0" step="0.001" value={opening.weight} onChange={(event) => setOpening({ ...opening, weight: event.target.value })} />
      </div>
      {session?.role !== "Owner" && <p className="mt-2 text-xs text-muted">Only the Owner can change the opening balance.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </Modal>

    <Modal open={movementOpen} onClose={() => setMovementOpen(false)} title="Record gold movement" footer={<><Button onClick={() => setMovementOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitMovement}>Record movement</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date" type="date" value={movement.date} onChange={(event) => setMovement({ ...movement, date: event.target.value })} />
        <Input label="Reference" value={movement.reference} onChange={(event) => setMovement({ ...movement, reference: event.target.value })} />
        <Select label="Movement type" value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value as MetalTransactionType })}>{MANUAL_TYPES.map((type) => <option key={type}>{type}</option>)}</Select>
        <Select label="Purity" value={movement.purityId} onChange={(event) => setMovement({ ...movement, purityId: event.target.value })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select>
        <Input label="Weight (g)" type="number" min="0.001" step="0.001" value={movement.weight} onChange={(event) => setMovement({ ...movement, weight: event.target.value })} />
        <Textarea label="Notes" value={movement.notes} onChange={(event) => setMovement({ ...movement, notes: event.target.value })} />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </Modal>

    <Modal open={reconcileOpen} onClose={() => setReconcileOpen(false)} title="Reconcile physical gold" footer={<><Button onClick={() => setReconcileOpen(false)}>Cancel</Button><Button variant="primary" disabled={!reconciliationOpening || reconciliationOpening.date > reconciliation.date} onClick={submitReconciliation}>Save reconciliation</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Purity" value={reconciliation.purityId} onChange={(event) => setReconciliation({ ...reconciliation, purityId: event.target.value })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select>
        <Input label="Count date" type="date" value={reconciliation.date} onChange={(event) => setReconciliation({ ...reconciliation, date: event.target.value })} />
        <Input label="System stock (g)" value={reconciliationSystem.toFixed(3)} readOnly />
        <Input label="Physical stock (g)" type="number" min="0" step="0.001" value={reconciliation.physical} onChange={(event) => setReconciliation({ ...reconciliation, physical: event.target.value })} />
      </div>
      {reconciliationDifference !== undefined && reconciliationOpening && reconciliationOpening.date <= reconciliation.date && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${Math.abs(reconciliationDifference) > 0.001 ? "bg-danger/10 text-danger" : "bg-cream text-ink"}`}>
        Difference: <b>{reconciliationDifference > 0 ? "+" : ""}{grams(reconciliationDifference)}</b>
      </p>}
      {reconciliationDifference !== undefined && reconciliationOpening && reconciliationOpening.date <= reconciliation.date && Math.abs(reconciliationDifference) > 0.001 && <Textarea label="Adjustment reason (required)" value={reconciliation.reason} onChange={(event) => setReconciliation({ ...reconciliation, reason: event.target.value })} />}
      <p className="mt-2 text-xs text-muted">A non-zero difference is saved as an explicit, audited gold adjustment. Physical counts never silently overwrite the ledger.</p>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </Modal>

    <PurityModal open={purityOpen} onClose={() => setPurityOpen(false)} />
  </>;
}

function PurityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const gold = useGoldAccounting();
  const toast = useToast();
  const [name, setName] = useState("");
  const [fineness, setFineness] = useState("");
  const [error, setError] = useState("");
  return <Modal open={open} onClose={onClose} title="Configure gold purity" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
    try {
      const item = gold.addPurity(name, Number(fineness) / 100);
      toast(`${item.name} purity added.`);
      setName(""); setFineness(""); setError(""); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Purity could not be added."); }
  }}>Add purity</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Purity name" placeholder="e.g. 14K" value={name} onChange={(event) => setName(event.target.value)} /><Input label="Fine gold (%)" type="number" min="0.01" max="100" step="0.01" value={fineness} onChange={(event) => setFineness(event.target.value)} /></div>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </Modal>;
}

export function KarigarsPage() {
  const ready = useReady();
  const canIssue = getSession()?.role !== "Accountant";
  const { orders } = useShop();
  const { karigarJobs, metalTransactions } = useGoldAccounting();
  const [issueOpen, setIssueOpen] = useState(false);
  const [karigar, setKarigar] = useState("");
  if (!ready) return <PageSkeleton />;
  const names = [...new Set([...orders.map((order) => order.karigar), ...karigarJobs.map((job) => job.karigar)])];
  const rows = names.map((name) => {
    const id = slugFor(name);
    const jobs = karigarJobs.filter((job) => job.karigarId === id);
    const issued = jobs.reduce((sum, job) => sum + job.issuedWeight, 0);
    const returned = jobs.reduce((sum, job) => sum + karigarReturnedWeight(job.id, metalTransactions), 0);
    const pending = jobs.reduce((sum, job) => sum + karigarPendingGold(job, metalTransactions), 0);
    const wastage = jobs.filter((job) => job.status !== "Open").reduce((sum, job) => sum + karigarActualWastage(job, metalTransactions), 0);
    const difference = jobs.filter((job) => job.status !== "Open").reduce((sum, job) => sum + karigarDifference(job, metalTransactions), 0);
    return { id, name, jobs, issued, returned, pending, wastage, difference, open: jobs.filter((job) => job.status === "Open").length };
  });
  return <>
    <PageHeader title="Karigar Metal Ledger" subtitle="Track gold issued, returned, expected wastage and open weight by karigar.">
      {canIssue && <Button variant="primary" onClick={() => { setKarigar(""); setIssueOpen(true); }}>Issue gold</Button>}
    </PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Karigars" value={rows.length} sub="With orders or gold jobs" />
      <StatCard label="Gold Issued" value={rows.reduce((sum, row) => sum + row.issued, 0)} format={grams} delay={0.05} />
      <StatCard label="Gold Returned" value={rows.reduce((sum, row) => sum + row.returned, 0)} format={grams} delay={0.1} />
      <StatCard label="Current Gold With Karigars" value={rows.reduce((sum, row) => sum + row.pending, 0)} format={grams} delay={0.15} sub="Open jobs plus review variances" />
    </div>
    <Card>
      <SimpleTable rows={rows} rowKey={(row) => row.id} minWidth={920} empty="No karigar orders or metal jobs are recorded." columns={[
        { head: "Karigar", cell: (row) => <Link className="font-semibold text-brand hover:underline" href={`/karigars/${row.id}`}>{row.name}</Link> },
        { head: "Gold Issued", cell: (row) => grams(row.issued) },
        { head: "Gold Returned", cell: (row) => grams(row.returned) },
        { head: "Current Gold / Difference", cell: (row) => <span className={row.pending > 0.001 || Math.abs(row.difference) > 0.001 ? "font-semibold text-danger" : ""}>{grams(row.pending)}{row.difference ? ` · variance ${row.difference > 0 ? "+" : ""}${grams(row.difference)}` : ""}</span> },
        { head: "Actual Wastage", cell: (row) => grams(row.wastage) },
        { head: "Pending Jobs", cell: (row) => <Badge tone={row.open ? "Partial" : "neutral"}>{row.open}</Badge> },
        { head: "Action", cell: (row) => canIssue ? <Button size="sm" onClick={() => { setKarigar(row.name); setIssueOpen(true); }}>Issue Gold</Button> : "Read only" },
      ]} />
    </Card>
    <IssueGoldModal key={`${issueOpen}-${karigar}`} open={issueOpen} karigar={karigar} onClose={() => setIssueOpen(false)} />
  </>;
}

export function KarigarDetailPage() {
  const params = useParams<{ id: string }>();
  const ready = useReady();
  const toast = useToast();
  const canIssue = getSession()?.role !== "Accountant";
  const { orders, setOrderStatus } = useShop();
  const { karigarJobs, metalTransactions, returnGold } = useGoldAccounting();
  const [issueOpen, setIssueOpen] = useState(false);
  const [returning, setReturning] = useState<KarigarJob | null>(null);
  const karigarId = decodeURIComponent(params.id);
  if (!ready) return <PageSkeleton />;
  const jobs = karigarJobs.filter((job) => job.karigarId === karigarId);
  const name = jobs[0]?.karigar ?? orders.find((order) => slugFor(order.karigar) === karigarId)?.karigar;
  if (!name) return <PageHeader title="Karigar not found" subtitle="This karigar does not have a linked order or metal ledger." />;
  const linkedOrders = orders.filter((order) => order.karigar.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
  const issued = jobs.reduce((sum, job) => sum + job.issuedWeight, 0);
  const returned = jobs.reduce((sum, job) => sum + karigarReturnedWeight(job.id, metalTransactions), 0);
  const pending = jobs.reduce((sum, job) => sum + karigarPendingGold(job, metalTransactions), 0);
  const wastage = jobs.filter((job) => job.status !== "Open").reduce((sum, job) => sum + karigarActualWastage(job, metalTransactions), 0);
  const difference = jobs.filter((job) => job.status !== "Open").reduce((sum, job) => sum + karigarDifference(job, metalTransactions), 0);
  const onReturn = (job: KarigarJob) => setReturning(job);
  return <>
    <PageHeader title={name} subtitle="Karigar gold ledger and linked jewellery orders.">
      <Link className="rounded-lg border border-line px-3 py-2 text-sm hover:border-gold" href="/karigars">Back to karigars</Link>
      {canIssue && <Button variant="primary" onClick={() => setIssueOpen(true)}>Issue gold</Button>}
    </PageHeader>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Total Gold Issued" value={issued} format={grams} />
      <StatCard label="Total Gold Returned" value={returned} format={grams} delay={0.04} />
      <StatCard label="Current Gold With Karigar" value={pending} format={grams} delay={0.08} />
      <StatCard label="Total Wastage" value={wastage} format={grams} delay={0.12} />
      <StatCard label="Difference" value={difference} format={grams} delay={0.16} trend={Math.abs(difference) > 0.001 ? "down" : undefined} />
    </div>
    <Card className="mb-4">
      <CardHead title="Metal jobs" />
      <SimpleTable rows={jobs} rowKey={(job) => job.id} minWidth={1000} empty="No gold issued to this karigar yet." columns={[
        { head: "Job / Order", cell: (job) => <><b>{job.jobNumber}</b><span className="block text-xs text-muted">{job.orderId || job.reference}</span></> },
        { head: "Purity", cell: (job) => job.purityId },
        { head: "Issued", cell: (job) => grams(job.issuedWeight) },
        { head: "Expected Return", cell: (job) => grams(job.issuedWeight - job.allowedWastage) },
        { head: "Actual Return", cell: (job) => grams(karigarReturnedWeight(job.id, metalTransactions)) },
        { head: "Allowed / Actual Wastage", cell: (job) => `${grams(job.allowedWastage)} / ${grams(karigarActualWastage(job, metalTransactions))}` },
        { head: "Difference / Pending", cell: (job) => {
          const delta = karigarDifference(job, metalTransactions);
          return <span className={Math.abs(delta) > 0.001 ? "font-semibold text-danger" : ""}>{delta > 0 ? "+" : ""}{grams(delta)} · {grams(karigarPendingGold(job, metalTransactions))}</span>;
        } },
        { head: "Return by", cell: (job) => fmtDate(job.expectedReturnDate) },
        { head: "Status", cell: (job) => <Badge tone={job.status === "Review" ? "Unpaid" : job.status === "Returned" ? "Paid" : "Partial"}>{job.status}</Badge> },
        { head: "Action", cell: (job) => canIssue && job.status === "Open" ? <Button size="sm" onClick={() => onReturn(job)}>Record return</Button> : "—" },
      ]} />
    </Card>
    <Card>
      <CardHead title="Linked karigar orders" />
      <SimpleTable rows={linkedOrders} rowKey={(order) => order.id} minWidth={680} empty="No existing orders are linked." columns={[
        { head: "Order", cell: (order) => <b>{order.id}</b> },
        { head: "Customer", cell: (order) => order.customerName },
        { head: "Description", cell: (order) => order.description },
        { head: "Status", cell: (order) => order.status },
        { head: "Due", cell: (order) => fmtDate(order.dueDate) },
        { head: "Action", cell: (order) => canIssue && order.status === "Making" ? <Button size="sm" onClick={() => { setOrderStatus(order.id, "Ready"); toast(`Order ${order.id} marked ready.`); }}>Mark Ready</Button> : "—" },
      ]} />
    </Card>
    <IssueGoldModal key={`${issueOpen}-${name}`} open={issueOpen} karigar={name} onClose={() => setIssueOpen(false)} />
    <ReturnGoldModal job={returning} onClose={() => setReturning(null)} onSave={(input) => {
      try { returnGold(input); toast("Karigar gold return recorded in both ledgers."); setReturning(null); }
      catch (cause) { toast(cause instanceof Error ? cause.message : "Gold return could not be recorded.", "error"); }
    }} />
  </>;
}

function IssueGoldModal({ open, karigar, onClose }: { open: boolean; karigar: string; onClose: () => void }) {
  const toast = useToast();
  const gold = useGoldAccounting();
  const { orders } = useShop();
  const [form, setForm] = useState({ jobNumber: "", karigar, orderId: "", reference: "", purityId: "22K", issuedWeight: "", allowedWastage: "", date: DEMO_TODAY, expectedReturnDate: DEMO_TODAY, notes: "" });
  const [error, setError] = useState("");
  const linked = form.orderId ? orders.find((order) => order.id === form.orderId) : undefined;
  const save = () => {
    try {
      gold.issueGold({ ...form, karigar: linked?.karigar ?? form.karigar, issuedWeight: Number(form.issuedWeight), allowedWastage: Number(form.allowedWastage), reference: form.reference || form.orderId });
      toast("Gold issue recorded in the karigar and metal ledgers.");
      setError(""); onClose();
      setForm({ ...form, jobNumber: "", orderId: "", reference: "", issuedWeight: "", allowedWastage: "", notes: "" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gold could not be issued."); }
  };
  return <Modal open={open} onClose={onClose} title="Issue gold to karigar" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Issue gold</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Job number" value={form.jobNumber} placeholder="e.g. KJ-2609-01" onChange={(event) => setForm({ ...form, jobNumber: event.target.value })} />
      <Input label="Karigar" value={linked?.karigar ?? form.karigar} readOnly={!!linked} onChange={(event) => setForm({ ...form, karigar: event.target.value })} />
      <Select label="Link existing order" value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value, reference: event.target.value || form.reference })}>
        <option value="">No linked order</option>{orders.filter((order) => order.status !== "Delivered").map((order) => <option key={order.id} value={order.id}>{order.id} · {order.karigar} · {order.description}</option>)}
      </Select>
      <Input label="Order / job reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
      <Select label="Purity" value={form.purityId} onChange={(event) => setForm({ ...form, purityId: event.target.value })}>{gold.purities.map((purity) => <option key={purity.id} value={purity.id}>{purity.name}</option>)}</Select>
      <Input label="Gold issued (g)" type="number" min="0.001" step="0.001" value={form.issuedWeight} onChange={(event) => setForm({ ...form, issuedWeight: event.target.value })} />
      <Input label="Allowed wastage (g)" type="number" min="0" step="0.001" value={form.allowedWastage} onChange={(event) => setForm({ ...form, allowedWastage: event.target.value })} />
      <Input label="Issue date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
      <Input label="Expected return" type="date" value={form.expectedReturnDate} onChange={(event) => setForm({ ...form, expectedReturnDate: event.target.value })} />
      <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
    </div>
    {form.issuedWeight && form.allowedWastage && Number(form.issuedWeight) > Number(form.allowedWastage) && <p className="mt-2 text-xs text-muted">Expected gold return: <b>{grams(Number(form.issuedWeight) - Number(form.allowedWastage))}</b></p>}
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </Modal>;
}

function ReturnGoldModal({ job, onClose, onSave }: { job: KarigarJob | null; onClose: () => void; onSave: (input: { jobId: string; weight: number; date: string; notes: string; final: boolean; differenceReason: string }) => void }) {
  const gold = useGoldAccounting();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [notes, setNotes] = useState("");
  const [final, setFinal] = useState(true);
  const [differenceReason, setDifferenceReason] = useState("");
  if (!job) return null;
  const returned = karigarReturnedWeight(job.id, gold.metalTransactions);
  const finalWastage = job.issuedWeight - returned - Number(weight || 0);
  const difference = finalWastage - job.allowedWastage;
  return <Modal open onClose={onClose} title={`Record gold return · ${job.jobNumber}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave({ jobId: job.id, weight: Number(weight), date, notes, final, differenceReason })}>Record return</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Purity" value={job.purityId} readOnly />
      <Input label="Gold issued (g)" value={grams(job.issuedWeight)} readOnly />
      <Input label="Previously returned (g)" value={grams(returned)} readOnly />
      <Input label="Returned now (g)" type="number" min="0.001" max={job.issuedWeight - returned} step="0.001" value={weight} onChange={(event) => setWeight(event.target.value)} />
      <Input label="Return date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <Input label="Allowed wastage (g)" value={grams(job.allowedWastage)} readOnly />
    </div>
    <div className="mt-3 rounded-lg bg-cream p-3 text-xs text-muted">Estimated final wastage: <b>{grams(finalWastage)}</b> · Variance to allowance: <b className={Math.abs(difference) > 0.001 ? "text-danger" : "text-ink"}>{difference > 0 ? "+" : ""}{grams(difference)}</b></div>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={final} onChange={(event) => setFinal(event.target.checked)} />This is the final return for the job</label>
    {final && Math.abs(difference) > 0.001 && <Textarea label="Reason for wastage difference (required)" value={differenceReason} onChange={(event) => setDifferenceReason(event.target.value)} />}
    <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
  </Modal>;
}
