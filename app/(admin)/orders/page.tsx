"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Tabs } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { useI18n } from "@/lib/prefs";
import type { OrderStatus } from "@/lib/types";

const FLOW: OrderStatus[] = ["Ordered", "Making", "Ready", "Delivered"];
const TABS = ["All", ...FLOW] as const;
const tone = (s: OrderStatus) => (s === "Delivered" ? "Paid" : s === "Ready" ? "Partial" : s === "Making" ? "neutral" : "neutral");

export default function OrdersPage() {
  const { customers } = useApp();
  const { orders, addOrder, setOrderStatus } = useShop();
  const { t } = useI18n();
  const toast = useToast();
  const ready = useReady(250);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ customerId: "", description: "", karigar: "", estimate: "", advance: "", dueDate: "" });
  const [err, setErr] = useState("");

  if (!ready) return <PageSkeleton />;
  const rows = tab === "All" ? orders : orders.filter((o) => o.status === tab);
  const open = orders.filter((o) => o.status !== "Delivered");

  const save = () => {
    const est = Number(f.estimate);
    const adv = Number(f.advance || 0);
    if (!f.customerId) return setErr("Select a customer");
    if (f.description.trim().length < 3) return setErr("Describe the order");
    if (!f.karigar.trim()) return setErr("Enter the karigar name");
    if (!(est > 0)) return setErr("Enter the estimated amount");
    if (adv < 0 || adv > est) return setErr("Advance must be between 0 and the estimate");
    if (!f.dueDate) return setErr("Choose a due date");
    addOrder({ customerId: f.customerId, description: f.description.trim(), karigar: f.karigar.trim(), estimate: est, advance: adv, dueDate: f.dueDate });
    toast("Karigar order created");
    setAdding(false);
    setErr("");
    setF({ customerId: "", description: "", karigar: "", estimate: "", advance: "", dueDate: "" });
  };

  const advance = (id: string, s: OrderStatus) => {
    const next = FLOW[FLOW.indexOf(s) + 1];
    if (next) {
      setOrderStatus(id, next);
      toast(`${id} → ${next}`);
    }
  };

  return (
    <>
      <PageHeader title="Karigar Orders" subtitle="Custom jewellery orders sent to karigars, tracked until delivery.">
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t("New Order")}
        </Button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Open Orders" value={open.length} sub="Not yet delivered" />
        <StatCard label="Ready for Delivery" value={orders.filter((o) => o.status === "Ready").length} sub="Call the customer" delay={0.05} />
        <StatCard label="Advance Held" value={open.reduce((s, o) => s + o.advance, 0)} format={money} sub="On open orders" delay={0.1} />
        <StatCard label="Overdue" value={open.filter((o) => o.dueDate < DEMO_TODAY).length} sub="Past due date" delay={0.15} />
      </div>
      <Card>
        <Tabs tabs={TABS} value={tab} onChange={setTab} label="Order status" />
        <div className="pt-4">
          <SimpleTable
            rows={rows}
            rowKey={(r) => r.id}
            empty="No orders in this stage."
            minWidth={820}
            columns={[
              { head: "Order", cell: (r) => <b>{r.id}</b> },
              { head: "Customer", cell: (r) => r.customerName },
              { head: "Description", cell: (r) => r.description },
              { head: "Karigar", cell: (r) => r.karigar },
              { head: "Estimate", cell: (r) => <>{money(r.estimate)}<span className="block text-xs text-muted">Adv {money(r.advance)}</span></> },
              { head: "Due", cell: (r) => <span className={r.status !== "Delivered" && r.dueDate < DEMO_TODAY ? "font-semibold text-danger" : ""}>{fmtDate(r.dueDate)}</span> },
              { head: "Status", cell: (r) => <Badge tone={tone(r.status)}>{t(r.status)}</Badge> },
              {
                head: "Actions",
                cell: (r) =>
                  r.status === "Delivered" ? (
                    <span className="text-xs text-muted">Completed</span>
                  ) : (
                    <Button size="sm" variant="gold" onClick={() => advance(r.id, r.status)}>
                      Mark {FLOW[FLOW.indexOf(r.status) + 1]}
                    </Button>
                  ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New Karigar Order"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Create Order
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select label="Customer" wrapperClassName="sm:col-span-2" value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })}>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.mobile}
              </option>
            ))}
          </Select>
          <Input label="Order description" wrapperClassName="sm:col-span-2" placeholder="e.g. Haar set, 22K, ~40 g" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input label="Karigar" value={f.karigar} onChange={(e) => setF({ ...f, karigar: e.target.value })} />
          <Input label="Due date" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          <Input label="Estimate (₹)" type="number" min="0" value={f.estimate} onChange={(e) => setF({ ...f, estimate: e.target.value })} />
          <Input label="Advance (₹)" type="number" min="0" value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} />
        </div>
        {err && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {err}
          </p>
        )}
      </Modal>
    </>
  );
}
