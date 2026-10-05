"use client";

import { Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Card";

export const REPORT_TABS = ["Daily", "Monthly", "Yearly"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export function ReportFilters({ tab, onTab, days, onDays }: { tab: ReportTab; onTab: (t: ReportTab) => void; days: number; onDays: (d: number) => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-[260px]">
        <Tabs label="Report period" tabs={REPORT_TABS} value={tab} onChange={onTab} />
      </div>
      {tab === "Daily" && (
        <Select label="Range" value={days} onChange={(e) => onDays(Number(e.target.value))} wrapperClassName="w-40">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={17}>This month</option>
        </Select>
      )}
    </div>
  );
}
