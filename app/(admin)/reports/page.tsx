"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerSalesChart, PaidUnpaidChart, PurityChart, RevenueChart, SalesTrendChart } from "@/components/reports/Charts";
import { REPORT_TABS, ReportFilters, type ReportTab } from "@/components/reports/ReportFilters";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { moneyCompact, num } from "@/lib/format";
import { useReady } from "@/lib/hooks";
import { dailySeries, invoiceBalance, invoiceGrand, monthlySeries, purityMix, topCustomers, yearlySeries } from "@/lib/selectors";
import { downloadFile, toCsv } from "@/lib/utils";

export default function ReportsPage() {
  const { invoices, customers } = useApp();
  const toast = useToast();
  const ready = useReady(250);
  const [tab, setTab] = useState<ReportTab>("Daily");
  const [days, setDays] = useState(7);
  if (!ready) return <PageSkeleton />;

  const daily = dailySeries(invoices, days);
  const monthly = monthlySeries(invoices);
  const yearly = yearlySeries(invoices);
  const year = yearly[yearly.length - 1];
  const todaySales = invoices.filter((i) => i.date === DEMO_TODAY).reduce((s, i) => s + invoiceGrand(i), 0);
  const allRevenue = yearly.reduce((s, y) => s + y.sales, 0);
  const billed = invoices.reduce((s, i) => s + invoiceGrand(i), 0);
  const outstanding = invoices.reduce((s, i) => s + invoiceBalance(i), 0);
  const collection = billed ? Math.round(((billed - outstanding) / billed) * 100) : 0;

  const series: { label: string; sales: number; invoices: number }[] = tab === "Daily" ? daily : tab === "Monthly" ? monthly : yearly;
  const title = tab === "Daily" ? "Daily Sales" : tab === "Monthly" ? "Monthly Sales" : "Yearly Sales";

  const exportReport = () => {
    downloadFile(
      `reinsoft-gold-${tab.toLowerCase()}-report.csv`,
      toCsv(series, [
        { header: tab === "Daily" ? "Date" : tab === "Monthly" ? "Month" : "Year", value: (r) => r.label },
        { header: "Sales (INR)", value: (r) => r.sales },
        { header: "Invoices", value: (r) => r.invoices },
      ]),
    );
    toast(`${tab} report exported`);
  };

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Daily, monthly and yearly sales performance.">
        <Link href="/reports/profit" className="inline-flex items-center rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm font-medium text-ink transition hover:border-gold/60">Profit & Margin</Link>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Daily Sales" value={todaySales} format={moneyCompact} sub="Today" />
        <StatCard label="Monthly Sales" value={monthly[monthly.length - 1].sales} format={moneyCompact} sub="September 2026" delay={0.05} trend="up" />
        <StatCard label="Yearly Sales" value={year.sales} format={moneyCompact} sub="↑ 14.2% YoY" delay={0.1} trend="up" />
        <StatCard label="Total Revenue" value={allRevenue} format={moneyCompact} sub="Since 2022" delay={0.15} />
        <StatCard label="Total Invoices" value={year.invoices} sub={`2026 · avg ${moneyCompact(year.sales / year.invoices)}`} delay={0.2} />
        <StatCard label="Gold Sold" value={year.gold} format={(n) => `${num(Math.round(n) / 1000)} kg`} sub="All purities, 2026" delay={0.25} />
        <StatCard label="Payment Collection" value={collection} format={(n) => `${Math.round(n)}%`} sub={`${moneyCompact(outstanding)} outstanding`} delay={0.3} trend={collection >= 85 ? "up" : "down"} />
        <StatCard label="Active Customers" value={customers.length} sub="Registered" delay={0.35} />
      </div>

      <Card className="mt-4" delay={0.1}>
        <ReportFilters tab={tab} onTab={setTab} days={days} onDays={setDays} />
        <div className="mt-4">
          <CardHead title={`${title} Trend`}>
            <span className="text-xs text-muted">{series.length} data points</span>
          </CardHead>
          {tab === "Yearly" ? <RevenueChart data={series} /> : <SalesTrendChart data={series} />}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.15}>
          <CardHead title="Monthly Revenue" />
          <RevenueChart data={monthly} />
        </Card>
        <Card delay={0.2}>
          <CardHead title="Customer Sales" />
          <CustomerSalesChart data={topCustomers(customers, invoices)} />
        </Card>
        <Card delay={0.25}>
          <CardHead title="Purity Distribution">
            <span className="text-xs text-muted">By weight sold</span>
          </CardHead>
          <PurityChart data={purityMix(invoices)} />
        </Card>
        <Card delay={0.3}>
          <CardHead title="Paid vs Unpaid" />
          <PaidUnpaidChart paid={billed - outstanding} outstanding={outstanding} />
        </Card>
      </div>
      <p className="sr-only">{REPORT_TABS.join(", ")}</p>
    </>
  );
}
