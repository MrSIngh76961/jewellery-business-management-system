"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { GoldRateCard } from "@/components/dashboard/GoldRateCard";
import { PaymentStatus } from "@/components/dashboard/PaymentStatus";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { BusinessInsights } from "@/components/dashboard/BusinessInsights";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useReady } from "@/lib/hooks";
import { dailySeries, dashboardStats } from "@/lib/selectors";
import { money, moneyCompact } from "@/lib/format";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const { invoices, customers } = useApp();
  const ready = useReady();
  if (!ready) return <PageSkeleton />;

  const s = dashboardStats(invoices, customers.length);
  const week = dailySeries(invoices, 7);
  const up = s.todayDelta >= 0;

  return (
    <>
      <PageHeader title="Good evening, Admin" subtitle="Your gold shop at a glance.">
        <Link href="/billing/new" className={buttonClass("primary")}>
          <Plus className="h-4 w-4" /> Create New Bill
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={s.today} format={money} href="/sales" trend={up ? "up" : "down"} sub={`${up ? "↑" : "↓"} ${Math.abs(s.todayDelta).toFixed(1)}% vs yesterday`} />
        <StatCard label="Monthly Sales" value={s.month} format={moneyCompact} href="/reports" delay={0.05} trend="up" sub={`${s.monthInvoices} invoices this month`} />
        <StatCard label="Outstanding" value={s.outstanding} format={moneyCompact} href="/invoices" delay={0.1} sub={`${s.pending} pending invoices`} />
        <StatCard label="Customers" value={s.customers} href="/customers" delay={0.15} trend="up" sub="Registered customers" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card delay={0.05}>
          <CardHead title="Sales Overview">
            <span className="text-xs text-muted">Last 7 days</span>
          </CardHead>
          <SalesChart data={week} />
        </Card>
        <PaymentStatus invoices={invoices} />
      </div>
      <GoldRateCard />
      <BusinessInsights />
      <RecentInvoices />
    </>
  );
}
