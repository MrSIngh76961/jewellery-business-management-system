"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowRight, Check, FlaskConical, Gem, Plus, RotateCcw, ShieldAlert, Sparkles, TrendingUp, X } from "lucide-react";
import { useAdvancedModules } from "@/components/providers/AdvancedModulesProvider";
import { useApp } from "@/components/providers/AppProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHead, EmptyState } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { calculateGoldWeightMetrics, convertGoldWeight, goldRateForPurity, goldRateFrom22K } from "@/lib/purity";
import { calculateStockScenario, quotationTotal } from "@/lib/advanced-modules";
import { invoiceBalance } from "@/lib/selectors";
import { invoiceTotals } from "@/lib/billing";
import { DEMO_TODAY } from "@/lib/config";
import { money, num } from "@/lib/format";
import type { QuotationLine } from "@/lib/advanced-modules";
import type { AssayLinkType, TestingMethod } from "@/lib/advanced-modules";
function StatusTag({ status }: { status: string }) {
  const tone = ["Paid", "Completed", "Approved", "Valid", "Resolved", "Accepted", "In Stock"].includes(status)
    ? "Paid"
    : ["Pending", "Partial", "Processing", "Tested", "Material Issued", "In Production", "Quality Check", "Acknowledged"].includes(status)
      ? "Partial"
      : ["Cancelled", "Rejected", "Critical", "High", "Unpaid"].includes(status)
        ? "Unpaid"
        : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

function useActionFeedback() {
  const toast = useToast();
  return (run: () => void, message: string) => {
    try {
      run();
      toast(message);
    } catch (error) {
      toast(error instanceof Error ? error.message : "The action could not be completed.", "error");
    }
  };
}

function Fieldset({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function MoneyStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-muted">{detail}</p>}
    </Card>
  );
}

export function PurityConversionPage() {
  const gold = useGoldAccounting();
  const act = useActionFeedback();
  const [gross, setGross] = useState("100");
  const [net, setNet] = useState("100");
  const [purity, setPurity] = useState("22K");
  const [customName, setCustomName] = useState("");
  const [customPercent, setCustomPercent] = useState("");
  const metrics = useMemo(() => {
    try {
      return calculateGoldWeightMetrics({ grossWeight: Number(gross), netWeight: Number(net), purity, configured: gold.purities });
    } catch {
      return null;
    }
  }, [gold.purities, gross, net, purity]);
  return (
    <>
      <PageHeader title="Fine Gold & Purity Conversion" subtitle="Centralized fine-gold weight and karat-equivalent calculator." />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="min-w-0">
          <CardHead title="Gold weight conversion" />
          <Fieldset>
            <Input label="Gross weight (g)" type="number" min="0" step="0.001" value={gross} onChange={(event) => setGross(event.target.value)} />
            <Input label="Net weight (g)" type="number" min="0" step="0.001" value={net} onChange={(event) => setNet(event.target.value)} />
            <Select label="Purity" value={purity} onChange={(event) => setPurity(event.target.value)}>
              {gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name} · {(item.fineness * 100).toFixed(2)}%</option>)}
            </Select>
          </Fieldset>
          {metrics ? (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MoneyStat label="Fine gold" value={`${num(metrics.fineGoldWeight)} g`} />
              <MoneyStat label="Fine gold %" value={`${metrics.fineGoldPercentage.toFixed(3)}%`} />
              <MoneyStat label="22K equivalent" value={`${num(metrics.equivalent22K)} g`} />
              <MoneyStat label="18K equivalent" value={`${num(metrics.equivalent18K)} g`} />
            </div>
          ) : <p role="alert" className="mt-4 text-sm text-danger">Enter valid non-negative weights, with net weight not exceeding gross weight.</p>}
          <p className="mt-4 rounded-lg bg-cream px-3 py-2.5 text-xs text-muted">Fine-gold weight uses the configured fineness for each purity. Example: 100 g × 22K = 91.667 g fine gold.</p>
        </Card>
        <Card className="min-w-0">
          <CardHead title="Configured purities" />
          <SimpleTable
            columns={[
              { head: "Purity", cell: (row) => row.name },
              { head: "Fineness", cell: (row) => `${(row.fineness * 100).toFixed(3)}%` },
              { head: "22K equivalent", cell: (row) => `${num(convertGoldWeight(100, row.id, "22K", gold.purities))} g / 100 g` },
            ]}
            rows={gold.purities}
            rowKey={(row) => row.id}
            minWidth={400}
          />
          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => {
            event.preventDefault();
            act(() => {
              const value = Number(customPercent);
              if (!Number.isFinite(value) || value <= 0 || value > 100) throw new Error("Fineness must be from above 0% to 100%.");
              gold.addPurity(customName, value / 100);
              setCustomName("");
              setCustomPercent("");
            }, "Purity added");
          }}>
            <Input label="New purity label" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="e.g. 20K" required />
            <Input label="Fineness (%)" type="number" min="0.01" max="100" step="0.001" value={customPercent} onChange={(event) => setCustomPercent(event.target.value)} required />
            <div className="flex items-end"><Button variant="primary" type="submit"><Plus className="h-4 w-4" /> Add purity</Button></div>
          </form>
          <p className="mt-3 text-[11px] text-muted">Only an Owner can add purity definitions. Conversion formulas are shared with metal accounting.</p>
        </Card>
      </div>
    </>
  );
}

export function MeltingPage() {
  const gold = useGoldAccounting();
  const advanced = useAdvancedModules();
  const act = useActionFeedback();
  const [form, setForm] = useState({ batchNumber: "", inputReference: "", inputGrossWeight: "", inputNetWeight: "", inputPurity: "22K", finalPurity: "22K", refinery: "", operator: "", date: DEMO_TODAY, notes: "", attachment: "" });
  const [actual, setActual] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("All");
  const batches = advanced.meltingBatches.filter((batch) => filter === "All" || batch.status === filter);
  const nextBatch = (id: string, status: "Processing" | "Tested" | "Completed" | "Cancelled") => act(() => {
    const batch = advanced.meltingBatches.find((item) => item.id === id);
    if (!batch) throw new Error("Batch not found.");
    advanced.updateMeltingStatus(id, status, status === "Tested" ? Number(actual[id]) : undefined);
  }, `Melting batch ${status.toLowerCase()}`);
  return (
    <>
      <PageHeader title="Melting & Refining" subtitle="Track scrap intake, assay, refining loss and returned fine gold." />
      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHead title="Create melting batch"><StatusTag status="Draft" /></CardHead>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            act(() => {
              advanced.addMeltingBatch({
                ...form,
                inputGrossWeight: Number(form.inputGrossWeight),
                inputNetWeight: Number(form.inputNetWeight),
              });
              setForm({ batchNumber: "", inputReference: "", inputGrossWeight: "", inputNetWeight: "", inputPurity: "22K", finalPurity: "22K", refinery: "", operator: "", date: DEMO_TODAY, notes: "", attachment: "" });
            }, "Draft batch created. Stock and gold accounting have not been changed.");
          }}>
            <Fieldset>
              <Input label="Batch number" value={form.batchNumber} onChange={(event) => setForm({ ...form, batchNumber: event.target.value })} required />
              <Input label="Input item / reference" value={form.inputReference} onChange={(event) => setForm({ ...form, inputReference: event.target.value })} required />
              <Input label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              <Input label="Gross weight (g)" type="number" min="0.001" step="0.001" value={form.inputGrossWeight} onChange={(event) => setForm({ ...form, inputGrossWeight: event.target.value })} required />
              <Input label="Net weight (g)" type="number" min="0.001" step="0.001" value={form.inputNetWeight} onChange={(event) => setForm({ ...form, inputNetWeight: event.target.value })} required />
              <Select label="Input purity" value={form.inputPurity} onChange={(event) => setForm({ ...form, inputPurity: event.target.value })}>{gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Select label="Expected final purity" value={form.finalPurity} onChange={(event) => setForm({ ...form, finalPurity: event.target.value })}>{gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Input label="Refinery / vendor" value={form.refinery} onChange={(event) => setForm({ ...form, refinery: event.target.value })} required />
              <Input label="Operator" value={form.operator} onChange={(event) => setForm({ ...form, operator: event.target.value })} required />
              <Input label="Document reference" value={form.attachment} onChange={(event) => setForm({ ...form, attachment: event.target.value })} placeholder="Document ID or secure file reference" />
            </Fieldset>
            <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <Button variant="primary" type="submit"><Plus className="h-4 w-4" /> Save draft</Button>
          </form>
        </Card>
        <Card>
          <CardHead title="Batch reconciliation">
            <Select aria-label="Status filter" label="Status" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-w-36">
              {["All", "Draft", "Processing", "Tested", "Completed", "Cancelled"].map((status) => <option key={status}>{status}</option>)}
            </Select>
          </CardHead>
          {!batches.length ? <EmptyState>No melting batches match this filter.</EmptyState> : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <article key={batch.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold">{batch.batchNumber} <span className="font-normal text-muted">· {batch.inputReference}</span></p><p className="mt-1 text-xs text-muted">{batch.refinery} · {batch.operator} · {batch.date}</p></div>
                    <StatusTag status={batch.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <p>Input <b>{num(batch.inputNetWeight)} g</b></p><p>Expected fine <b>{num(batch.expectedFineGold)} g</b></p>
                    <p>Actual fine <b>{batch.actualFineGold === undefined ? "—" : `${num(batch.actualFineGold)} g`}</b></p>
                    <p>Loss <b>{batch.meltingLoss === undefined ? "—" : `${num(batch.meltingLoss)} g fine`}</b></p>
                  </div>
                  {batch.status === "Processing" && <div className="mt-3 flex flex-wrap gap-2">
                    <Input label={`Actual fine gold for ${batch.batchNumber}`} srOnlyLabel type="number" min="0" step="0.001" value={actual[batch.id] ?? ""} onChange={(event) => setActual({ ...actual, [batch.id]: event.target.value })} placeholder="Assay result (g)" />
                    <Button size="sm" variant="gold" onClick={() => nextBatch(batch.id, "Tested")}>Save assay result</Button>
                  </div>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {batch.status === "Draft" && <Button size="sm" onClick={() => nextBatch(batch.id, "Processing")}>Start processing</Button>}
                    {batch.status === "Tested" && <Button size="sm" variant="primary" onClick={() => nextBatch(batch.id, "Completed")}>Complete & post gold</Button>}
                    {(batch.status === "Draft" || batch.status === "Processing" || batch.status === "Tested") && <Button size="sm" variant="danger" onClick={() => nextBatch(batch.id, "Cancelled")}>Cancel batch</Button>}
                  </div>
                  {batch.status === "Completed" && <p className="mt-2 rounded-lg bg-cream p-2 text-xs text-muted">Final gold: {num(batch.finalWeight ?? 0)} g · Gold movements: {batch.goldMovementIds.length} · Stock item: {batch.finishedStockId ?? "not recorded"}. Accounting and stock post only on completion.</p>}
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export function AssayPage() {
  const advanced = useAdvancedModules();
  const gold = useGoldAccounting();
  const { stock } = useShop();
  const act = useActionFeedback();
  const [form, setForm] = useState<{ linkType: AssayLinkType; reference: string; inputWeight: string; testedPurity: string; method: TestingMethod; testedBy: string; date: string; result: string; notes: string; attachment: string; applyToStock: boolean }>({ linkType: "Old Gold", reference: "", inputWeight: "", testedPurity: "22K", method: "XRF", testedBy: "", date: DEMO_TODAY, result: "", notes: "", attachment: "", applyToStock: false });
  return (
    <>
      <PageHeader title="Gold Assay & Testing" subtitle="Record traceable purity results against stock, purchases, returns and refining." />
      <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <CardHead title="Record assay"><FlaskConical className="h-4 w-4 text-gold" /></CardHead>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            act(() => {
              advanced.addAssay({ ...form, inputWeight: Number(form.inputWeight) });
              setForm({ ...form, reference: "", inputWeight: "", result: "", notes: "", attachment: "", applyToStock: false });
            }, "Assay recorded and audit logged");
          }}>
            <Fieldset>
              <Select label="Link type" value={form.linkType} onChange={(event) => setForm({ ...form, linkType: event.target.value as typeof form.linkType, reference: "" })}>{["Old Gold", "Melting Batch", "Stock Item", "Purchase", "Karigar Return"].map((value) => <option key={value}>{value}</option>)}</Select>
              {form.linkType === "Stock Item" ? <Select label="Stock item" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })}><option value="">Select stock item</option>{stock.map((item) => <option key={item.id} value={item.id}>{item.tag} · {item.name}</option>)}</Select> : <Input label="Reference ID" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} required />}
              <Input label="Input weight (g)" type="number" min="0.001" step="0.001" value={form.inputWeight} onChange={(event) => setForm({ ...form, inputWeight: event.target.value })} required />
              <Select label="Tested purity" value={form.testedPurity} onChange={(event) => setForm({ ...form, testedPurity: event.target.value })}>{gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Select label="Testing method" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as TestingMethod })}>{["XRF", "Touchstone", "Fire Assay", "Other"].map((value) => <option key={value}>{value}</option>)}</Select>
              <Input label="Tested by" value={form.testedBy} onChange={(event) => setForm({ ...form, testedBy: event.target.value })} required />
              <Input label="Test date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              <Input label="Assay result" value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} placeholder="e.g. 91.65% Au" required />
              <Input label="Report reference" value={form.attachment} onChange={(event) => setForm({ ...form, attachment: event.target.value })} placeholder="Secure document reference" />
            </Fieldset>
            {form.linkType === "Stock Item" && <label className="flex items-start gap-2 rounded-lg bg-cream p-3 text-xs text-ink"><input type="checkbox" checked={form.applyToStock} onChange={(event) => setForm({ ...form, applyToStock: event.target.checked })} /><span><b>Apply tested purity to stock</b><br /><span className="text-muted">Owner permission required; previous and new values are audit logged.</span></span></label>}
            <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <Button variant="primary" type="submit"><Plus className="h-4 w-4" /> Save assay</Button>
          </form>
        </Card>
        <Card>
          <CardHead title="Assay history" />
          <SimpleTable columns={[
            { head: "Test", cell: (row) => <><b>{row.testId}</b><small className="block text-muted">{row.reference}</small></> },
            { head: "Method / Date", cell: (row) => `${row.method} · ${row.date}` },
            { head: "Weight / Purity", cell: (row) => `${num(row.inputWeight)} g · ${row.testedPurity}` },
            { head: "Result", cell: (row) => <>{row.result}{row.applied && <small className="block text-brand">Applied to stock</small>}</> },
            { head: "Tester", cell: (row) => row.testedBy },
          ]} rows={advanced.assays} rowKey={(row) => row.id} minWidth={700} empty="No assay results recorded." />
        </Card>
      </div>
    </>
  );
}

export function ProductionPage() {
  const advanced = useAdvancedModules();
  const gold = useGoldAccounting();
  const act = useActionFeedback();
  const [form, setForm] = useState({ product: "", sku: "", category: "", goldRequired: "", purity: "22K", stonesRequired: "", otherMaterials: "", labourCost: "", stoneCost: "", otherCost: "", expectedWeight: "", expectedWastage: "", karigar: "" });
  const [completion, setCompletion] = useState<Record<string, { weight: string; wastage: string }>>({});
  return (
    <>
      <PageHeader title="Manufacturing & Production" subtitle="Issue material to a tracked karigar job and post finished jewellery into stock after quality check." />
      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHead title="New production order" />
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            act(() => {
              advanced.addProductionOrder({
                ...form,
                goldRequired: Number(form.goldRequired),
                labourCost: Number(form.labourCost),
                stoneCost: Number(form.stoneCost),
                otherCost: Number(form.otherCost),
                expectedWeight: Number(form.expectedWeight),
                expectedWastage: Number(form.expectedWastage),
              });
              setForm({ product: "", sku: "", category: "", goldRequired: "", purity: "22K", stonesRequired: "", otherMaterials: "", labourCost: "", stoneCost: "", otherCost: "", expectedWeight: "", expectedWastage: "", karigar: "" });
            }, "Production order created");
          }}>
            <Fieldset>
              <Input label="Product" value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} required />
              <Input label="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required />
              <Input label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
              <Input label="Gold required (g)" type="number" min="0.001" step="0.001" value={form.goldRequired} onChange={(event) => setForm({ ...form, goldRequired: event.target.value })} required />
              <Select label="Gold purity" value={form.purity} onChange={(event) => setForm({ ...form, purity: event.target.value })}>{gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Input label="Expected finished weight (g)" type="number" min="0.001" step="0.001" value={form.expectedWeight} onChange={(event) => setForm({ ...form, expectedWeight: event.target.value })} required />
              <Input label="Expected wastage (g)" type="number" min="0" step="0.001" value={form.expectedWastage} onChange={(event) => setForm({ ...form, expectedWastage: event.target.value })} required />
              <Input label="Karigar" value={form.karigar} onChange={(event) => setForm({ ...form, karigar: event.target.value })} required />
              <Input label="Stones required" value={form.stonesRequired} onChange={(event) => setForm({ ...form, stonesRequired: event.target.value })} />
              <Input label="Other materials" value={form.otherMaterials} onChange={(event) => setForm({ ...form, otherMaterials: event.target.value })} />
              <Input label="Stone cost (₹)" type="number" min="0" value={form.stoneCost} onChange={(event) => setForm({ ...form, stoneCost: event.target.value })} />
              <Input label="Other material cost (₹)" type="number" min="0" value={form.otherCost} onChange={(event) => setForm({ ...form, otherCost: event.target.value })} />
              <Input label="Labour / making cost (₹)" type="number" min="0" value={form.labourCost} onChange={(event) => setForm({ ...form, labourCost: event.target.value })} />
            </Fieldset>
            <Button variant="primary" type="submit"><Plus className="h-4 w-4" /> Create order</Button>
          </form>
        </Card>
        <Card>
          <CardHead title="Production workboard" />
          {!advanced.productionOrders.length ? <EmptyState>No production orders have been created.</EmptyState> : <div className="space-y-3">
            {advanced.productionOrders.map((order) => {
              const values = completion[order.id] ?? { weight: String(order.expectedWeight), wastage: String(order.expectedWastage) };
              const cost = order.goldCost + order.stoneCost + order.labourCost + order.otherCost;
              return <article key={order.id} className="rounded-xl border border-line p-3.5">
                <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{order.orderNumber} · {order.product}</p><p className="mt-1 text-xs text-muted">{order.sku} · {order.category} · {order.karigar}</p></div><StatusTag status={order.status} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><p>Gold <b>{num(order.goldRequired)} g {order.purity}</b></p><p>Expected weight <b>{num(order.expectedWeight)} g</b></p><p>Gold cost <b>{money(order.goldCost)}</b></p><p>Total cost <b>{money(cost)}</b></p></div>
                {order.status === "Quality Check" && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input label="Actual finished weight" type="number" min="0.001" step="0.001" value={values.weight} onChange={(event) => setCompletion({ ...completion, [order.id]: { ...values, weight: event.target.value } })} />
                  <Input label="Actual wastage (g)" type="number" min="0" step="0.001" value={values.wastage} onChange={(event) => setCompletion({ ...completion, [order.id]: { ...values, wastage: event.target.value } })} />
                  <div className="flex items-end"><Button size="sm" variant="primary" onClick={() => act(() => advanced.advanceProduction(order.id, Number(values.weight), Number(values.wastage)), "Quality check completed; finished stock created")}>Complete & stock</Button></div>
                </div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Draft", "Material Issued", "In Production"].includes(order.status) && <Button size="sm" onClick={() => act(() => advanced.advanceProduction(order.id), "Production stage updated")}>{order.status === "Draft" ? "Issue gold & start" : order.status === "Material Issued" ? "Start manufacturing" : "Send to quality check"}</Button>}
                  {order.status === "Draft" && <Button size="sm" variant="danger" onClick={() => act(() => advanced.cancelProduction(order.id, window.prompt("Reason for cancellation?") ?? ""), "Draft production order cancelled")}>Cancel draft</Button>}
                  {order.finishedStockId && <Link className="text-xs font-semibold text-brand underline" href="/stock">Finished stock added →</Link>}
                </div>
              </article>;
            })}
          </div>}
        </Card>
      </div>
    </>
  );
}

const emptyLine: QuotationLine = { item: "", weight: 0, purity: "22K", goldRate: 0, making: 0, wastage: 0, stones: 0, other: 0, discount: 0, gstRate: 3 };

export function QuotationsPage() {
  const advanced = useAdvancedModules();
  const { customers, settings } = useApp();
  const gold = useGoldAccounting();
  const act = useActionFeedback();
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [validUntil, setValidUntil] = useState(DEMO_TODAY);
  const [lockedRate, setLockedRate] = useState(true);
  const [advance, setAdvance] = useState("0");
  const [lines, setLines] = useState<QuotationLine[]>([{ ...emptyLine, goldRate: settings.rate22 }]);
  const customerName = (id: string) => customers.find((item) => item.id === id)?.name ?? "Customer";
  return (
    <>
      <PageHeader title="Quotations & Estimates" subtitle="Preserve quoted item, weight, charges, GST and rate when converted." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHead title="Create estimate" />
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            act(() => {
              advanced.addQuotation({ customerId, date, validUntil, lockedRate, items: lines, advance: Number(advance) });
              setLines([{ ...emptyLine, goldRate: settings.rate22 }]);
              setAdvance("0");
            }, "Quotation saved");
          }}>
            <Fieldset>
              <Select label="Customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select>
              <Input label="Quotation date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              <Input label="Valid until" type="date" min={date} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} required />
              <Input label="Advance (₹)" type="number" min="0" value={advance} onChange={(event) => setAdvance(event.target.value)} />
              <label className="flex items-center gap-2 self-end rounded-lg bg-cream p-3 text-sm"><input type="checkbox" checked={lockedRate} onChange={(event) => setLockedRate(event.target.checked)} /> Lock quoted gold rates</label>
            </Fieldset>
            {lines.map((line, index) => <div key={index} className="rounded-xl border border-line p-3">
              <div className="mb-3 flex items-center justify-between"><b className="text-sm">Item {index + 1}</b>{lines.length > 1 && <Button size="icon" aria-label="Remove item" onClick={() => setLines(lines.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>}</div>
              <Fieldset>
                <Input label="Item / SKU" value={line.item} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, item: event.target.value } : item))} required />
                <Input label="Weight (g)" type="number" min="0.001" step="0.001" value={line.weight || ""} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, weight: Number(event.target.value) } : item))} required />
                <Select label="Purity" value={line.purity} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, purity: event.target.value } : item))}>{gold.purities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
                <Input label="Gold rate / g (₹)" type="number" min="0.01" value={line.goldRate} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, goldRate: Number(event.target.value) } : item))} required />
                <Input label="Making (₹)" type="number" min="0" value={line.making} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, making: Number(event.target.value) } : item))} />
                <Input label="Wastage (%)" type="number" min="0" max="100" step="0.01" value={line.wastage} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, wastage: Number(event.target.value) } : item))} />
                <Input label="Stones (₹)" type="number" min="0" value={line.stones} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, stones: Number(event.target.value) } : item))} />
                <Input label="Other charges (₹)" type="number" min="0" value={line.other} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, other: Number(event.target.value) } : item))} />
                <Input label="Discount (₹)" type="number" min="0" value={line.discount} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, discount: Number(event.target.value) } : item))} />
                <Input label="GST %" type="number" min="0" max="100" step="0.01" value={line.gstRate} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, gstRate: Number(event.target.value) } : item))} />
              </Fieldset>
            </div>)}
            <div className="flex flex-wrap items-center justify-between gap-2"><Button onClick={() => setLines([...lines, { ...emptyLine, goldRate: settings.rate22 }])}><Plus className="h-4 w-4" /> Add item</Button><b>Estimated total: {money(quotationTotal(lines))}</b></div>
            <Button type="submit" variant="primary" disabled={!customerId}>Save quotation</Button>
          </form>
        </Card>
        <Card>
          <CardHead title="Quotation register" />
          <SimpleTable columns={[
            { head: "Estimate", cell: (row) => <><b>{row.quotationNumber}</b><small className="block text-muted">{customerName(row.customerId)} · {row.date}</small></> },
            { head: "Valid / Rate", cell: (row) => <>{row.validUntil}<small className="block text-muted">{row.lockedRate ? "Rate locked" : "Floating rate"}</small></> },
            { head: "Total", cell: (row) => money(row.estimatedTotal) },
            { head: "Status", cell: (row) => <StatusTag status={row.status} /> },
            { head: "Actions", cell: (row) => row.status === "Draft" || row.status === "Sent" ? <div className="flex gap-1"><Button size="sm" onClick={() => act(() => advanced.setQuotationStatus(row.id, "Accepted"), "Quotation accepted")}>Accept</Button><Button size="sm" variant="ghost" onClick={() => act(() => advanced.setQuotationStatus(row.id, "Sent"), "Quotation marked as sent")}>Mark sent</Button></div> : row.status === "Accepted" ? <div className="flex flex-wrap gap-1"><Button size="sm" onClick={() => act(() => advanced.convertQuotationToBooking(row.id), "Converted to booking")}>Booking</Button><Button size="sm" variant="primary" onClick={() => act(() => advanced.convertQuotationToInvoice(row.id), "Converted to invoice")}>Invoice</Button></div> : row.invoiceId || row.bookingId ? <Link className="text-xs font-semibold text-brand underline" href={row.invoiceId ? `/invoices/${encodeURIComponent(row.invoiceId)}` : "/bookings"}>Open converted record</Link> : "—" },
          ]} rows={advanced.quotations} rowKey={(row) => row.id} minWidth={730} empty="No quotations created yet." />
        </Card>
      </div>
    </>
  );
}

export function GoldRateSimulatorPage() {
  const { settings } = useApp();
  const { stock, orders } = useShop();
  const gold = useGoldAccounting();
  const [scenarioInput, setScenarioInput] = useState("");
  const [scenarios, setScenarios] = useState<number[]>([settings.rate22 * 0.9, settings.rate22, settings.rate22 * 1.1, settings.rate22 * 1.2].map((rate) => Math.round(rate)));
  const base = calculateStockScenario(stock, orders, settings.rate22, settings.rate18, gold.purities);
  return (
    <>
      <PageHeader title="Gold Rate Scenario Simulator" subtitle="SIMULATION / WHAT-IF ANALYSIS · This tool never changes the live gold rate." />
      <Card className="border-gold/40 bg-gold/5">
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-gold/15 p-2 text-gold"><TrendingUp className="h-5 w-5" /></span><div><p className="font-semibold">Simulation only</p><p className="text-xs text-muted">Live rate remains 22K {money(settings.rate22)}/g · 18K {money(settings.rate18)}/g</p></div></div>
      </Card>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyStat label="Current stock value" value={money(base.currentValuation)} detail={`${base.stockItems} items valued at current rate`} />
        <MoneyStat label="Cost data available" value={base.knownCost ? money(base.knownCost) : "Not available"} detail="Sum of recorded stock purchase costs" />
        <MoneyStat label="Estimated current margin" value={base.marginAtCurrentRate === null ? "Not available" : money(base.marginAtCurrentRate)} detail={base.marginAtCurrentRate === null ? "No recorded purchase-cost baseline" : "Indicative metal-only spread; excludes expenses and making"} />
        <MoneyStat label="Open order estimates" value={orders.length ? money(base.openOrderEstimates) : "Not available"} detail={`${orders.length} existing order(s), no item-level rate model`} />
      </div>
      <Card className="mt-4">
        <CardHead title="Compare rate scenarios" />
        <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          const rate = Number(scenarioInput);
          if (!Number.isFinite(rate) || rate <= 0) return;
          setScenarios([...new Set([...scenarios, rate])].sort((a, b) => a - b));
          setScenarioInput("");
        }}>
          <Input label="Hypothetical 22K rate / g" type="number" min="1" step="1" value={scenarioInput} onChange={(event) => setScenarioInput(event.target.value)} placeholder="Enter rate" />
          <Button type="submit"><Plus className="h-4 w-4" /> Add scenario</Button>
        </form>
        <SimpleTable columns={[
          { head: "22K Rate / g", cell: (rate) => <b>{money(rate)}</b> },
          { head: "18K Equivalent / g", cell: (rate) => money(goldRateFrom22K(rate, "18K")) },
          { head: "Projected stock value", cell: (rate) => money(calculateStockScenario(stock, orders, rate, goldRateFrom22K(rate, "18K"), gold.purities).currentValuation) },
          { head: "Change vs current", cell: (rate) => { const change = calculateStockScenario(stock, orders, rate, goldRateFrom22K(rate, "18K"), gold.purities).currentValuation - base.currentValuation; return <span className={change >= 0 ? "text-brand" : "text-danger"}>{change >= 0 ? "+" : ""}{money(change)}</span>; } },
          { head: "Remove", cell: (rate) => <Button size="icon" aria-label={`Remove ${rate} scenario`} onClick={() => setScenarios(scenarios.filter((value) => value !== rate))}><X className="h-4 w-4" /></Button> },
        ]} rows={scenarios} rowKey={(rate) => String(rate)} minWidth={600} empty="Add a rate scenario to see projected stock values." />
        <p className="mt-3 text-xs text-muted">Valuation uses current in-stock item weights and hypothetical purity rates. Potential item-level revenue and margin are not projected when reliable cost data is absent.</p>
      </Card>
    </>
  );
}

export function RiskCenterPage() {
  const advanced = useAdvancedModules();
  const { invoices } = useApp();
  const act = useActionFeedback();
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <>
      <PageHeader title="Risk & Anomaly Center" subtitle="Deterministic alerts from recorded audit, discount, reversal and reconciliation data." />
      <Card>
        <CardHead title="Invoice reversal requests"><RotateCcw className="h-4 w-4 text-gold" /></CardHead>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select label="Invoice" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)}><option value="">Select invoice</option>{invoices.filter((invoice) => !invoice.cancelledAt).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.id} · {invoice.customerName}</option>)}</Select>
          <Input label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reason for reversal" />
          <div className="flex items-end"><Button variant="danger" disabled={!invoiceId || reason.trim().length < 3} onClick={() => act(() => {
            advanced.requestInvoiceReversal(invoiceId, reason);
            setInvoiceId("");
            setReason("");
          }, "Reversal submitted. Owner approval may be required.")}>Request / reverse</Button></div>
        </div>
        {advanced.reversals.length > 0 && <div className="mt-4"><SimpleTable columns={[
          { head: "Invoice", cell: (row) => <><b>{row.invoiceId}</b><small className="block text-muted">{row.reversalReference}</small></> },
          { head: "Reason / Requester", cell: (row) => <>{row.reason}<small className="block text-muted">{row.requestedBy} · {new Date(row.requestedAt).toLocaleString()}</small></> },
          { head: "Reversal amounts", cell: (row) => <>Paid {money(row.originalPaid)}<small className="block text-muted">Balance {money(row.originalBalance)} · GST {money(row.reversedGst)}</small><small className="block text-muted">Gold {num(row.reversedGoldWeight)} g</small></> },
          { head: "Status", cell: (row) => <StatusTag status={row.status} /> },
          { head: "Decision", cell: (row) => row.status === "Pending Approval" ? <div className="flex flex-wrap gap-1"><Button size="sm" variant="primary" onClick={() => act(() => advanced.decideInvoiceReversal(row.id, "Approved", "Owner approved after review"), "Reversal approved and applied")}>Approve</Button><Button size="sm" variant="danger" onClick={() => act(() => advanced.decideInvoiceReversal(row.id, "Rejected", window.prompt("Reason for rejection?") ?? ""), "Reversal rejected")}>Reject</Button></div> : row.decisionBy ?? "—" },
        ]} rows={advanced.reversals} rowKey={(row) => row.id} minWidth={690} /></div>}
      </Card>
      <Card className="mt-4">
        <CardHead title="Deterministic risk alerts"><ShieldAlert className="h-4 w-4 text-gold" /></CardHead>
        {!advanced.riskAlerts.length ? <EmptyState>No risk alerts meet the configured data thresholds.</EmptyState> : <div className="space-y-3">
          {advanced.riskAlerts.map((alert) => <article key={alert.id} className="rounded-xl border border-line p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 ${alert.level === "Critical" ? "text-danger" : alert.level === "High" ? "text-gold" : "text-muted"}`} /><div><p className="font-semibold">{alert.title}</p><p className="mt-1 text-xs text-muted">{alert.details}</p></div></div><StatusTag status={alert.level} /></div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><p>User: <b>{alert.user}</b></p><p>Reference: <b>{alert.reference}</b></p><p>{alert.module} · {alert.date}</p></div>
            <p className="mt-2 text-xs"><b>Recommended:</b> {alert.recommendedAction}</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Button size="sm" onClick={() => act(() => advanced.updateRisk(alert.id, { state: "Acknowledged" }), "Alert acknowledged")} disabled={alert.state !== "Open"}>Acknowledge</Button>
              <Button size="sm" variant="primary" onClick={() => act(() => advanced.updateRisk(alert.id, { state: "Resolved" }), "Alert resolved")} disabled={alert.state === "Resolved"}><Check className="h-3.5 w-3.5" /> Resolve</Button>
              <Button size="sm" variant="secondary" onClick={() => act(() => advanced.updateRisk(alert.id, { assignedTo: "Owner" }), "Alert assigned to Owner")}>Assign to Owner</Button>
              <Input label="Risk note" srOnlyLabel value={notes[alert.id] ?? ""} onChange={(event) => setNotes({ ...notes, [alert.id]: event.target.value })} placeholder="Add review note" />
              <Button size="sm" onClick={() => act(() => advanced.updateRisk(alert.id, { note: notes[alert.id] }), "Risk note saved")} disabled={!notes[alert.id]?.trim()}>Add note</Button>
              <StatusTag status={alert.state} />
            </div>
          </article>)}
        </div>}
      </Card>
    </>
  );
}

export function ExecutiveDashboardPage() {
  const { invoices, customers, settings } = useApp();
  const operations = useOperations();
  const shop = useShop();
  const gold = useGoldAccounting();
  const advanced = useAdvancedModules();
  const activeInvoices = invoices.filter((invoice) => !invoice.cancelledAt);
  const revenue = activeInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).grand, 0);
  const goldSold = activeInvoices.reduce((sum, invoice) => sum + invoice.items.reduce((line, item) => line + item.weight, 0), 0);
  const goldPurchased = operations.purchases.reduce((sum, purchase) => sum + purchase.netWeight, 0);
  const goldStock = shop.stock.filter((item) => item.status === "In Stock").reduce((sum, item) => sum + item.weight, 0);
  const stockValue = shop.stock.filter((item) => item.status === "In Stock").reduce((sum, item) => sum + item.weight * goldRateForPurity(settings.rate22, settings.rate18, item.purity, gold.purities), 0);
  const outstanding = activeInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const pendingApprovals = operations.approvals.filter((approval) => approval.status === "Pending").length;
  const pendingKarigar = gold.karigarJobs.filter((job) => job.status === "Open").reduce((sum, job) => sum + Math.max(0, job.issuedWeight - gold.metalTransactions.filter((item) => item.jobId === job.id && item.type === "Karigar Return").reduce((total, item) => total + item.weight, 0)), 0);
  const deadStock = shop.stock.filter((item) => item.status === "In Stock" && (new Date(`${DEMO_TODAY}T00:00:00Z`).getTime() - new Date(`${item.addedOn}T00:00:00Z`).getTime()) / 86400000 > 180).length;
  const totalExpenses = operations.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const costByTag = new Map(shop.stock.filter((item) => item.purchaseCost !== undefined).map((item) => [item.tag, item.purchaseCost!]));
  const unknownCostLines = activeInvoices.flatMap((invoice) => invoice.items.filter((item) => !costByTag.has(item.name.match(/RG-T\d+/)?.[0] ?? "")));
  const knownCosts = activeInvoices.flatMap((invoice) => invoice.items.map((item) => {
    const tag = item.name.match(/RG-T\d+/)?.[0];
    return tag ? costByTag.get(tag) : undefined;
  })).filter((cost): cost is number => cost !== undefined);
  const grossProfit = unknownCostLines.length ? null : revenue - knownCosts.reduce((sum, cost) => sum + cost, 0);
  const netProfit = grossProfit === null ? null : grossProfit - totalExpenses;
  const attention = [
    ...(pendingApprovals ? [{ text: `${pendingApprovals} pending approvals`, href: "/approvals" }] : []),
    ...(deadStock ? [{ text: `${deadStock} stock items older than 180 days`, href: "/stock" }] : []),
    ...(Math.abs(gold.reconciliations.at(0)?.difference ?? 0) >= 1 ? [{ text: `${num(gold.reconciliations[0].difference)} g physical gold difference`, href: "/gold-accounting" }] : []),
    ...(gold.karigarJobs.some((job) => job.status === "Open" && job.expectedReturnDate < DEMO_TODAY) ? [{ text: "Overdue karigar gold jobs need review", href: "/karigars" }] : []),
    ...(advanced.riskAlerts.some((alert) => alert.state === "Open") ? [{ text: `${advanced.riskAlerts.filter((alert) => alert.state === "Open").length} open risk alerts`, href: "/risk-center" }] : []),
  ];
  void customers;
  return (
    <>
      <PageHeader title="Owner Executive Dashboard" subtitle="Business overview based on recorded ReinSoft Gold transactions." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Link href="/sales"><MoneyStat label="Revenue · all recorded" value={money(revenue)} detail={`${activeInvoices.length} valid invoices`} /></Link>
        <Link href="/reports/profit"><MoneyStat label="Gross profit" value={grossProfit === null ? "Not available" : money(grossProfit)} detail={grossProfit === null ? `${unknownCostLines.length} sold line(s) without reliable cost` : "Based on recorded item cost"} /></Link>
        <Link href="/reports/profit"><MoneyStat label="Net profit" value={netProfit === null ? "Not available" : money(netProfit)} detail={netProfit === null ? "Cost data is incomplete" : `Includes recorded expenses ${money(totalExpenses)}`} /></Link>
        <Link href="/gold-accounting"><MoneyStat label="Gold sold" value={`${num(goldSold)} g`} /></Link>
        <Link href="/purchases"><MoneyStat label="Gold purchased" value={`${num(goldPurchased)} g`} /></Link>
        <Link href="/stock"><MoneyStat label="Gold stock" value={`${num(goldStock)} g`} detail={`Indicative stock value ${money(stockValue)}`} /></Link>
        <Link href="/ledger"><MoneyStat label="Outstanding" value={money(outstanding)} /></Link>
        <Link href="/approvals"><MoneyStat label="Pending approvals" value={String(pendingApprovals)} /></Link>
        <Link href="/risk-center"><MoneyStat label="Open risk alerts" value={String(advanced.riskAlerts.filter((alert) => alert.state === "Open").length)} /></Link>
        <Link href="/karigars"><MoneyStat label="Karigar gold" value={`${num(pendingKarigar)} g`} /></Link>
        <Link href="/stock"><MoneyStat label="Dead stock · 180+ days" value={String(deadStock)} /></Link>
      </div>
      <Card className="mt-4">
        <CardHead title="What needs my attention today?"><Sparkles className="h-4 w-4 text-gold" /></CardHead>
        {attention.length ? <div className="grid gap-2 sm:grid-cols-2">{attention.map((item) => <Link key={item.href + item.text} href={item.href} className="flex items-center justify-between rounded-lg border border-line px-3 py-3 text-sm transition hover:border-gold/50"><span>{item.text}</span><ArrowRight className="h-4 w-4 shrink-0 text-gold" /></Link>)}</div> : <EmptyState>No pending approvals, stock aging, reconciliation variances, overdue jobs or open risk alerts were found.</EmptyState>}
      </Card>
    </>
  );
}

export function InvoiceReversalAction({ invoiceId }: { invoiceId: string }) {
  const advanced = useAdvancedModules();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  return <div className="mt-4 rounded-xl border border-danger/25 bg-danger/5 p-3 print:hidden">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-danger">Transaction reversal</p><p className="mt-1 text-xs text-muted">Original invoice remains in history; reversal is separately logged.</p></div><Button size="sm" variant="danger" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Request reversal"}</Button></div>
    {open && <div className="mt-3 flex flex-wrap items-end gap-2"><Input label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why must this invoice be reversed?" /><Button size="sm" variant="danger" disabled={reason.trim().length < 3} onClick={() => {
      try {
        const record = advanced.requestInvoiceReversal(invoiceId, reason);
        toast(record.status === "Approved" ? "Invoice reversed and linked movements restored" : "Reversal request sent to Owner", "success");
        setOpen(false);
        setReason("");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not request reversal.", "error");
      }
    }}>Submit reversal</Button></div>}
  </div>;
}

function subscribeVerificationStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function verificationStorageSnapshot() {
  return window.localStorage.getItem("reinsoft-gold-app-v1") ?? "null";
}

export function VerificationClient({ verificationId }: { verificationId: string }) {
  const raw = useSyncExternalStore(subscribeVerificationStorage, verificationStorageSnapshot, () => "server");
  let invoice: { id: string; date: string; amount: number; status: "Valid" | "Cancelled" | "Refunded" } | null = null;
  let checked = raw !== "server";
  if (checked && raw !== "null") {
    try {
      const snapshot: unknown = JSON.parse(raw);
      if (snapshot && typeof snapshot === "object" && "invoices" in snapshot && Array.isArray(snapshot.invoices)) {
        const found = snapshot.invoices.find((item) => item && typeof item === "object" && "verificationId" in item && item.verificationId === verificationId);
        if (found && typeof found === "object" && "id" in found && typeof found.id === "string" && "date" in found && typeof found.date === "string") {
          const inv = found as import("@/lib/types").Invoice;
          let refunded = false;
          const operationsRaw = window.localStorage.getItem("reinsoft-gold-operations-v1");
          if (operationsRaw) {
            try {
              const operations: unknown = JSON.parse(operationsRaw);
              if (operations && typeof operations === "object" && "returns" in operations && Array.isArray(operations.returns)) {
                refunded = operations.returns.some((entry) => entry && typeof entry === "object" && "invoiceId" in entry && entry.invoiceId === inv.id && "status" in entry && entry.status === "Refunded");
              }
            } catch {
              refunded = false;
            }
          }
          invoice = { id: inv.id, date: inv.date, amount: invoiceTotals(inv).grand, status: inv.cancelledAt ? "Cancelled" : refunded ? "Refunded" : "Valid" };
        }
      }
    } catch {
      invoice = null;
      checked = true;
    }
  }
  return (
    <main className="min-h-screen bg-cream/50 px-4 py-12 text-ink">
      <Card className="mx-auto max-w-xl border-gold/30 p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-forest p-3 text-gold-2"><Gem className="h-6 w-6" /></span><div><p className="text-xs uppercase tracking-[.18em] text-muted">REINSOFT GOLD</p><h1 className="text-xl font-semibold">Invoice Verification</h1></div></div>
        {!checked ? <p className="text-sm text-muted">Checking verification record…</p> : invoice ? <>
          <div className={`rounded-xl p-4 ${invoice.status === "Valid" ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger"}`}><p className="font-semibold">{invoice.status === "Valid" ? "Valid invoice" : invoice.status === "Cancelled" ? "Cancelled invoice" : "Refunded invoice"}</p><p className="mt-1 text-xs">Verification reference matched</p></div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted">Invoice</dt><dd className="mt-1 font-semibold">{invoice.id}</dd></div><div><dt className="text-xs text-muted">Date</dt><dd className="mt-1 font-semibold">{invoice.date}</dd></div><div className="col-span-2"><dt className="text-xs text-muted">Invoice amount</dt><dd className="mt-1 text-xl font-semibold">{money(invoice.amount)}</dd></div></dl>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">Customer name, phone, PAN, KYC records, payment credentials and internal notes are not disclosed.</p>
        </> : <div className="rounded-xl bg-cream p-4"><p className="font-semibold">Not found</p><p className="mt-1 text-xs text-muted">No matching verification record is available in this browser.</p></div>}
      </Card>
    </main>
  );
}
