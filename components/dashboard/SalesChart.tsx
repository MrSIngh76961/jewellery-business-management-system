"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moneyCompact, money } from "@/lib/format";

export interface SalesPoint {
  label: string;
  sales: number;
}

export function SalesChart({ data, height = 240, highlightLast = true }: { data: SalesPoint[]; height?: number; highlightLast?: boolean }) {
  return (
    <div style={{ height }} role="img" aria-label="Sales bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9b45b" />
              <stop offset="100%" stopColor="#a9822c" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--c-line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--c-muted)" }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--c-muted)" }} tickFormatter={(v: number) => moneyCompact(v).replace("₹", "")} width={56} />
          <Tooltip
            cursor={{ fill: "rgba(201,154,46,.08)" }}
            formatter={(v) => [money(Number(v)), "Sales"]}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--c-line)", background: "var(--c-card)", fontSize: 12 }}
          />
          <Bar dataKey="sales" radius={[7, 7, 2, 2]} animationDuration={900}>
            {data.map((_, i) => (
              <Cell key={i} fill={highlightLast && i === data.length - 1 ? "#244d3a" : "url(#goldBar)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
