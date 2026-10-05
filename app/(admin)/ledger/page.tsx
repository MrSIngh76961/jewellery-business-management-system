"use client";

import { MessageCircle, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useWhatsApp } from "@/components/providers/WhatsAppProvider";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { useI18n } from "@/lib/prefs";
import { invoiceBalance } from "@/lib/selectors";
import type { PayMode } from "@/lib/types";

const TABS = ["Outstanding", "Payments"] as const;

export default function LedgerPage() {
  const { customers, invoices, settings, logAudit } = useApp();
  const { payments, receivePayment } = useShop();
  const whatsapp = useWhatsApp();
  const { t } = useI18n();
  const toast = useToast();
  const ready = useReady(250);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Outstanding");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PayMode>("Cash");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const dues = useMemo(
    () =>
      customers
        .map((c) => {
          const open = invoices.filter((i) => i.customerId === c.id && invoiceBalance(i) > 0);
          return { c, open, due: open.reduce((s, i) => s + invoiceBalance(i), 0), oldest: open.map((i) => i.date).sort()[0] };
        })
        .filter((d) => d.due > 0)
        .sort((a, b) => b.due - a.due),
    [customers, invoices],
  );

  if (!ready) return <PageSkeleton />;
  const total = dues.reduce((s, d) => s + d.due, 0);
  const todayCollected = payments.filter((p) => p.date === DEMO_TODAY).reduce((s, p) => s + p.amount, 0);
  const target = dues.find((d) => d.c.id === payFor);

  const openPay = (id: string) => {
    const d = dues.find((x) => x.c.id === id);
    setPayFor(id);
    setAmount(String(d?.due ?? ""));
    setNote("");
    setErr("");
  };

  const submit = () => {
    const n = Number(amount);
    if (!target) return;
    if (!(n > 0)) return setErr("Enter an amount greater than 0");
    if (n > target.due) return setErr(`Amount cannot exceed the outstanding ${money(target.due)}`);
    const applied = receivePayment(target.c.id, n, mode, note);
    toast(`${money(applied)} received from ${target.c.name}`);
    setPayFor(null);
  };

  const remind = (name: string, mobile: string, due: number) => {
    const digits = mobile.replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const text = `Dear ${name}, a gentle reminder of your pending balance of ${money(due)} at ${settings.businessName}. Thank you.`;
    const customer = customers.find((item) => item.name === name && item.mobile === mobile);
    if (customer) {
      try {
        whatsapp.queueMessage("ledger-reminder", {
          type: "ledger_reminder",
          customerName: customer.name,
          mobile: customer.mobile,
          variables: { balance: Math.round(due).toLocaleString("en-IN"), shop_name: settings.businessName },
        });
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : "Ledger reminder could not be queued.", "error");
      }
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    toast(`Click-to-chat opened for ${name}; WhatsApp delivery is not confirmed.`);
    logAudit(`Opened payment reminder click-to-chat for ${name}`);
  };

  return (
    <>
      <PageHeader title="Udhaar Ledger" subtitle="Customer-wise outstanding balances and payments received." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Outstanding" value={total} format={money} sub="Across all customers" />
        <StatCard label="Customers with Dues" value={dues.length} sub="Open accounts" delay={0.05} />
        <StatCard label="Received Today" value={todayCollected} format={money} sub="Payments recorded" delay={0.1} />
        <StatCard label="Payments Logged" value={payments.length} sub="All time (demo)" delay={0.15} />
      </div>

      <Card>
        <Tabs tabs={TABS} value={tab} onChange={setTab} label="Ledger" />
        <div className="pt-4">
          {tab === "Outstanding" ? (
            <SimpleTable
              rows={dues}
              rowKey={(r) => r.c.id}
              empty="No outstanding balances — all accounts are clear."
              columns={[
                { head: "Customer", cell: (r) => <><b className="block">{r.c.name}</b><span className="text-xs text-muted">{r.c.mobile}</span></> },
                { head: "Open Invoices", cell: (r) => r.open.length },
                { head: "Oldest Due", cell: (r) => fmtDate(r.oldest) },
                { head: "Outstanding", cell: (r) => <b className="text-danger">{money(r.due)}</b> },
                {
                  head: "Actions",
                  cell: (r) => (
                    <span className="flex gap-1.5">
                      <Button size="sm" variant="primary" onClick={() => openPay(r.c.id)}>
                        <Wallet className="h-3.5 w-3.5" /> {t("Receive Payment")}
                      </Button>
                      <Button size="sm" onClick={() => remind(r.c.name, r.c.mobile, r.due)}>
                        <MessageCircle className="h-3.5 w-3.5" /> Remind
                      </Button>
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            <SimpleTable
              rows={payments}
              rowKey={(r) => r.id}
              empty="No payments recorded yet."
              columns={[
                { head: "Date", cell: (r) => fmtDate(r.date) },
                { head: "Customer", cell: (r) => customers.find((c) => c.id === r.customerId)?.name ?? r.customerId },
                { head: "Amount", cell: (r) => <b>{money(r.amount)}</b> },
                { head: "Mode", cell: (r) => <Badge>{r.mode}</Badge> },
                { head: "Invoices", cell: (r) => r.invoices.join(", ") || "—" },
                { head: "Note", cell: (r) => r.note || "—" },
              ]}
            />
          )}
        </div>
      </Card>

      <Modal
        open={!!target}
        onClose={() => setPayFor(null)}
        title={target ? `Receive Payment — ${target.c.name}` : "Receive Payment"}
        footer={
          <>
            <Button onClick={() => setPayFor(null)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>
              Save Payment
            </Button>
          </>
        }
      >
        {target && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <p className="text-sm text-muted sm:col-span-2">
              Outstanding <b className="text-danger">{money(target.due)}</b> across {target.open.length} invoice(s). Payment is applied to the oldest invoice first.
            </p>
            <Input label="Amount (₹)" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} error={err} />
            <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank</option>
            </Select>
            <Input label="Note (optional)" wrapperClassName="sm:col-span-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
      </Modal>
    </>
  );
}
