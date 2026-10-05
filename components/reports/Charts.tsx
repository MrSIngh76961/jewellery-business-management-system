"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyCompact, num } from "@/lib/format";

const tip = { borderRadius: 10, border: "1px solid var(--c-line)", background: "var(--c-card)", fontSize: 12 };
const axis = { fontSize: 10, fill: "var(--c-muted)" };
const COLORS = ["#c99a2e", "#244d3a", "#e4bf68", "#3f7658"];

export function SalesTrendChart({ data }: { data: { label: string; sales: number }[] }) {
  return (
    <div className="h-[260px]" role="img" aria-label="Sales trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c99a2e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#c99a2e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--c-line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={axis} width={56} tickFormatter={(v: number) => moneyCompact(v).replace("₹", "")} />
          <Tooltip formatter={(v) => [money(Number(v)), "Sales"]} contentStyle={tip} />
          <Area type="monotone" dataKey="sales" stroke="#a9822c" strokeWidth={2.5} fill="url(#trend)" animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data }: { data: { label: string; sales: number }[] }) {
  return (
    <div className="h-[260px]" role="img" aria-label="Monthly revenue chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--c-line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
          <YAxis tickLine={false} axisLine={false} tick={axis} width={56} tickFormatter={(v: number) => moneyCompact(v).replace("₹", "")} />
          <Tooltip cursor={{ fill: "rgba(201,154,46,.08)" }} formatter={(v) => [money(Number(v)), "Revenue"]} contentStyle={tip} />
          <Bar dataKey="sales" fill="#244d3a" radius={[7, 7, 2, 2]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ data, unit, label }: { data: { name: string; value: number }[]; unit: (n: number) => string; label: string }) {
  return (
    <div className="h-[240px]" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} animationDuration={900}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => unit(Number(v))} contentStyle={tip} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export const PurityChart = ({ data }: { data: { name: string; value: number }[] }) => (
  <Donut data={data} unit={(n) => `${num(n)} g`} label="Purity distribution chart" />
);

export const PaidUnpaidChart = ({ paid, outstanding }: { paid: number; outstanding: number }) => (
  <Donut data={[{ name: "Collected", value: paid }, { name: "Outstanding", value: outstanding }]} unit={money} label="Paid versus unpaid chart" />
);

export function CustomerSalesChart({ data }: { data: { name: string; full: string; total: number }[] }) {
  return (
    <div className="h-[260px]" role="img" aria-label="Customer sales chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--c-line)" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={axis} tickFormatter={(v: number) => moneyCompact(v).replace("₹", "")} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={axis} width={64} />
          <Tooltip cursor={{ fill: "rgba(201,154,46,.08)" }} formatter={(v) => [money(Number(v)), "Total purchase"]} contentStyle={tip} />
          <Bar dataKey="total" fill="#c99a2e" radius={[0, 7, 7, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
