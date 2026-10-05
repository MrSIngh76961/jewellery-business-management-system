"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { Card, CardHead } from "@/components/ui/Card";
import { useReady } from "@/lib/hooks";
import { buildBusinessInsights } from "@/lib/business-insights";
import { DEMO_TODAY } from "@/lib/config";

const sourceLink: Record<string, string> = {
  Invoices: "/invoices",
  Stock: "/stock",
  "Gold Accounting": "/gold-accounting",
};

const severityClass: Record<string, string> = {
  Positive: "border-success/25 bg-success/5 text-success",
  Warning: "border-gold/40 bg-gold/10 text-gold-deep",
  Critical: "border-danger/30 bg-danger/5 text-danger",
  Information: "border-line bg-cream/60 text-muted",
};

export function BusinessInsights() {
  const ready = useReady();
  const { invoices } = useApp();
  const { stock } = useShop();
  const { reconciliations, purities } = useGoldAccounting();
  if (!ready) return <Card className="mt-4"><div className="h-24 animate-pulse rounded-lg bg-cream" /></Card>;
  const insights = buildBusinessInsights({ invoices, stock, reconciliations, purities, referenceDate: DEMO_TODAY });
  return <section aria-labelledby="business-insights-title" className="mt-4">
    <Card>
      <CardHead title={<span id="business-insights-title">Business Insights</span>}>
        <span className="text-xs text-muted">Calculated from recorded business data</span>
      </CardHead>
      {insights.length ? <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => <article key={insight.id} className={`rounded-xl border p-4 ${severityClass[insight.severity]}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide">{insight.type} · {insight.severity}</p>
              <h3 className="mt-1 text-sm font-semibold text-ink">{insight.metric}</h3>
              <p className="mt-1 text-xs text-muted">{insight.comparison}</p>
            </div>
            <Link className="shrink-0 text-xs font-semibold text-brand hover:underline" href={sourceLink[insight.source] ?? "/reports"}>{insight.source}</Link>
          </div>
          <p className="mt-3 text-[11px] text-muted">{insight.dateRange} · Source: {insight.source}</p>
        </article>)}
      </div> : <div className="rounded-xl border border-dashed border-line bg-cream/40 px-4 py-5">
        <p className="text-sm font-medium text-ink">No validated insights for the available comparison periods yet.</p>
        <p className="mt-1 text-xs text-muted">Comparisons appear when comparable invoice periods, aged stock or a physical gold reconciliation are recorded. No trend is inferred from incomplete history.</p>
      </div>}
    </Card>
  </section>;
}
