"use client";

import { Cake, Gift, Mail, MapPin, Phone, ShieldCheck, ShieldAlert, Star } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHead } from "@/components/ui/Card";
import { fmtDate, money } from "@/lib/format";
import { loyaltyPoints, loyaltyTier } from "@/lib/seed-shop";
import { customerStats } from "@/lib/selectors";
import type { Customer, Invoice } from "@/lib/types";
import { PurchaseHistory } from "./PurchaseHistory";

export function CustomerProfile({ customer, invoices }: { customer: Customer; invoices: Invoice[] }) {
  const s = customerStats(customer, invoices);
  const pts = loyaltyPoints(s.total);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Purchases" value={s.purchases} sub="Total invoices" />
        <StatCard label="Total Purchase" value={s.total} format={money} sub="Lifetime value" delay={0.05} />
        <StatCard label="Loyalty Points" value={pts} sub={`${loyaltyTier(pts)} tier · 1 pt per ₹100`} delay={0.1} />
        <StatCard label="Customer ID" value={customer.id} sub="Unique record" delay={0.15} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHead title="Basic Information" />
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{customer.mobile}</dd>
            </div>
            <div className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{customer.email || "No email on file"}</dd>
            </div>
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{customer.address || "No address on file"}</dd>
            </div>
            <div className="flex gap-2.5">
              <Cake className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{customer.birthday ? `Birthday: ${fmtDate(customer.birthday)}` : "Birthday not added"}</dd>
            </div>
            <div className="flex gap-2.5">
              <Gift className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{customer.anniversary ? `Anniversary: ${fmtDate(customer.anniversary)}` : "Anniversary not added"}</dd>
            </div>
            <div className="flex gap-2.5">
              {customer.kycVerified ? <ShieldCheck className="mt-0.5 h-4 w-4 text-[#34704b]" /> : <ShieldAlert className="mt-0.5 h-4 w-4 text-[#9a6b16]" />}
              <dd>
                PAN: {customer.pan || "—"} · {customer.kycVerified ? "KYC verified" : "KYC pending"}
              </dd>
            </div>
            <div className="flex gap-2.5">
              <Star className="mt-0.5 h-4 w-4 text-gold-deep" />
              <dd>{pts} points · {loyaltyTier(pts)} tier</dd>
            </div>
          </dl>
        </Card>
        <Card delay={0.05}>
          <CardHead title="Invoice History" />
          <PurchaseHistory customer={customer} invoices={s.invoices} />
        </Card>
      </div>
    </>
  );
}
