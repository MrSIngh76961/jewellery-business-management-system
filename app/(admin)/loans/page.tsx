"use client";

import { HandCoins, MessageCircle, Plus, Unlock } from "lucide-react";
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
import { useWhatsApp } from "@/components/providers/WhatsAppProvider";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate, money } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { useI18n } from "@/lib/prefs";
import { loanInterest, loanMonths } from "@/lib/seed-shop";
import type { Loan, Purity } from "@/lib/types";

const TABS = ["All", "Active", "Released"] as const;

export default function LoansPage() {
  const { customers } = useApp();
  const { loans, addLoan, payLoanInterest, releaseLoan } = useShop();
  const whatsapp = useWhatsApp();
  const { t } = useI18n();
  const toast = useToast();
  const ready = useReady(250);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [adding, setAdding] = useState(false);
  const [releasing, setReleasing] = useState<Loan | null>(null);
  const [paying, setPaying] = useState<Loan | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [f, setF] = useState({ customerId: "", item: "", weight: "", purity: "22K" as Purity, principal: "", rate: "1.5" });
  const [err, setErr] = useState("");

  if (!ready) return <PageSkeleton />;
  const rows = tab === "All" ? loans : loans.filter((l) => l.status === tab);
  const active = loans.filter((l) => l.status === "Active");
  const interestDue = (l: Loan) => Math.max(0, loanInterest(l, DEMO_TODAY) - l.paidInterest);
  const queueLoanReminder = (loan: Loan) => {
    const customer = customers.find((item) => item.id === loan.customerId);
    if (!customer) return toast("Loan customer was not found.", "error");
    try {
      whatsapp.queueMessage("loan-reminder", {
        type: "loan_reminder",
        customerName: customer.name,
        mobile: customer.mobile,
        variables: {
          invoice_number: loan.id,
          amount: Math.round(loan.principal).toLocaleString("en-IN"),
          balance: Math.round(interestDue(loan)).toLocaleString("en-IN"),
        },
      });
      toast("Loan reminder queued locally. It has not been sent.");
    } catch (cause) { toast(cause instanceof Error ? cause.message : "Loan reminder could not be queued.", "error"); }
  };

  const save = () => {
    const w = Number(f.weight);
    const p = Number(f.principal);
    const r = Number(f.rate);
    if (!f.customerId) return setErr("Select a customer");
    if (f.item.trim().length < 2) return setErr("Describe the pledged item");
    if (!(w > 0)) return setErr("Enter the weight");
    if (!(p > 0)) return setErr("Enter the loan amount");
    if (!(r > 0 && r <= 10)) return setErr("Monthly interest must be between 0 and 10%");
    addLoan({ customerId: f.customerId, item: f.item.trim(), weight: w, purity: f.purity, principal: p, rate: r });
    toast("Girvi entry created");
    setAdding(false);
    setErr("");
    setF({ customerId: "", item: "", weight: "", purity: "22K", principal: "", rate: "1.5" });
  };

  const savePay = () => {
    const n = Number(payAmt);
    if (!paying) return;
    if (!(n > 0) || n > interestDue(paying)) return setErr(`Enter an amount up to ${money(interestDue(paying))}`);
    payLoanInterest(paying.id, n);
    toast(`Interest ${money(n)} received`);
    setPaying(null);
    setErr("");
  };

  return (
    <>
      <PageHeader title="Girvi / Loans" subtitle="Gold pledged against loans, with monthly interest tracking.">
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t("New Loan")}
        </Button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active Loans" value={active.length} sub="Gold held" />
        <StatCard label="Principal Out" value={active.reduce((s, l) => s + l.principal, 0)} format={money} sub="Lent on active loans" delay={0.05} />
        <StatCard label="Interest Due" value={active.reduce((s, l) => s + interestDue(l), 0)} format={money} sub="Accrued, unpaid" delay={0.1} />
        <StatCard label="Gold Held" value={`${active.reduce((s, l) => s + l.weight, 0)} g`} sub="Pledged weight" delay={0.15} />
      </div>
      <Card>
        <Tabs tabs={TABS} value={tab} onChange={setTab} label="Loan status" />
        <div className="pt-4">
          <SimpleTable
            rows={rows}
            rowKey={(r) => r.id}
            empty="No loans in this view."
            minWidth={900}
            columns={[
              { head: "Loan", cell: (r) => <b>{r.id}</b> },
              { head: "Customer", cell: (r) => r.customerName },
              { head: "Pledged", cell: (r) => <>{r.item}<span className="block text-xs text-muted">{r.weight} g · {r.purity}</span></> },
              { head: "Principal", cell: (r) => <>{money(r.principal)}<span className="block text-xs text-muted">{r.rate}% / month</span></> },
              { head: "Since", cell: (r) => <>{fmtDate(r.startDate)}<span className="block text-xs text-muted">{loanMonths(r.startDate, r.releasedOn ?? DEMO_TODAY)} month(s)</span></> },
              { head: "Interest", cell: (r) => <>{money(loanInterest(r, DEMO_TODAY))}<span className="block text-xs text-muted">Paid {money(r.paidInterest)}</span></> },
              { head: "Status", cell: (r) => <Badge tone={r.status === "Active" ? "Partial" : "Paid"}>{t(r.status)}</Badge> },
              {
                head: "Actions",
                cell: (r) =>
                  r.status === "Active" ? (
                    <span className="flex gap-1.5">
                      <Button size="sm" onClick={() => queueLoanReminder(r)}>
                        <MessageCircle className="h-3.5 w-3.5" /> Remind
                      </Button>
                      <Button size="sm" onClick={() => { setPaying(r); setPayAmt(String(interestDue(r))); setErr(""); }}>
                        <HandCoins className="h-3.5 w-3.5" /> Interest
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => setReleasing(r)}>
                        <Unlock className="h-3.5 w-3.5" /> {t("Release")}
                      </Button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Released {r.releasedOn && fmtDate(r.releasedOn)}</span>
                  ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New Girvi / Loan"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Create Loan
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
          <Input label="Pledged item" wrapperClassName="sm:col-span-2" placeholder="e.g. Gold necklace" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} />
          <Input label="Weight (g)" type="number" step="0.01" min="0" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
          <Select label="Purity" value={f.purity} onChange={(e) => setF({ ...f, purity: e.target.value as Purity })}>
            <option>22K</option>
            <option>18K</option>
          </Select>
          <Input label="Loan amount (₹)" type="number" min="0" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} />
          <Input label="Interest % per month" type="number" step="0.05" min="0" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
        </div>
        {err && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {err}
          </p>
        )}
      </Modal>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Interest — ${paying.id}` : "Interest"}
        footer={
          <>
            <Button onClick={() => setPaying(null)}>Cancel</Button>
            <Button variant="primary" onClick={savePay}>
              Receive Interest
            </Button>
          </>
        }
      >
        {paying && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Interest due for {paying.customerName}: <b className="text-danger">{money(interestDue(paying))}</b>
            </p>
            <Input label="Amount (₹)" type="number" min="0" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} error={err} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!releasing}
        onClose={() => setReleasing(null)}
        title="Release pledged gold?"
        size="sm"
        footer={
          <>
            <Button onClick={() => setReleasing(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (releasing) releaseLoan(releasing.id);
                setReleasing(null);
              }}
            >
              Confirm Release
            </Button>
          </>
        }
      >
        {releasing && (
          <p className="text-sm text-muted">
            Customer pays principal <b>{money(releasing.principal)}</b> + outstanding interest <b>{money(interestDue(releasing))}</b> ={" "}
            <b className="text-ink">{money(releasing.principal + interestDue(releasing))}</b>. The {releasing.weight} g {releasing.item} will be returned.
          </p>
        )}
      </Modal>
    </>
  );
}
