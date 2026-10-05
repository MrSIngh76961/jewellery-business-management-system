"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { fmtDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";

function RateTile({ label, value, prev }: { label: string; value: number; prev?: number }) {
  const diff = prev ? value - prev : 0;
  const up = diff >= 0;
  return (
    <div className="rounded-xl border border-line bg-cream/50 p-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight">
        {money(value)}
        <span className="text-xs font-medium text-muted"> /g</span>
      </div>
      {prev ? (
        <div className={cn("mt-0.5 flex items-center gap-1 text-[11px]", up ? "text-[#3d805d]" : "text-danger")}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : "−"}
          {money(Math.abs(diff))} vs previous
        </div>
      ) : null}
    </div>
  );
}

export function GoldRateCard() {
  const { rates, settings, updateGoldRates } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [r22, setR22] = useState("");
  const [r18, setR18] = useState("");
  const [err, setErr] = useState("");

  const last = rates[rates.length - 1];
  const prev = rates[rates.length - 2];
  const data = rates.map((r) => ({ label: fmtDate(r.date).slice(0, 6), "22K": r.rate22, "18K": r.rate18 }));

  const show = () => {
    setR22(String(settings.rate22));
    setR18(String(settings.rate18));
    setErr("");
    setOpen(true);
  };
  const save = () => {
    const a = Number(r22);
    const b = Number(r18);
    if (!(a > 0) || !(b > 0)) return setErr("Enter a rate above ₹0 for both purities");
    if (b >= a) return setErr("18K rate should be lower than 22K rate");
    updateGoldRates(a, b);
    setOpen(false);
    toast("Gold rates updated. New bills will use these rates.");
  };

  return (
    <Card delay={0.1} className="mt-4">
      <CardHead title="Today's Gold Rate">
        <Button size="sm" variant="primary" onClick={show}>
          Update Rate
        </Button>
      </CardHead>
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-3">
          <RateTile label="22K Gold" value={last.rate22} prev={prev?.rate22} />
          <RateTile label="18K Gold" value={last.rate18} prev={prev?.rate18} />
        </div>
        <div className="h-[110px]" role="img" aria-label="Gold rate trend for the last days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--c-muted)" }} />
              <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip formatter={(v, n) => [money(Number(v)), String(n)]} contentStyle={{ borderRadius: 10, border: "1px solid var(--c-line)", background: "var(--c-card)", fontSize: 12 }} />
              <Area type="monotone" dataKey="22K" stroke="#a9822c" strokeWidth={2} fill="#c99a2e" fillOpacity={0.15} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Update Gold Rate"
        size="sm"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save Rates
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5">
          <Input label="22K Rate per gram (₹)" type="number" inputMode="decimal" value={r22} onChange={(e) => setR22(e.target.value)} />
          <Input label="18K Rate per gram (₹)" type="number" inputMode="decimal" value={r18} onChange={(e) => setR18(e.target.value)} error={err || undefined} />
        </div>
      </Modal>
    </Card>
  );
}
