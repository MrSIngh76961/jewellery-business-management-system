"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { TD, TH } from "@/components/invoices/InvoiceTable";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { fmtDateTime } from "@/lib/format";
import { passwordSchema, type PasswordForm } from "@/lib/schemas";
import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SectionProps {
  s: Settings;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
}

const num = (v: string) => (v === "" ? 0 : Number(v));

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-cream/50 px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors", checked ? "bg-brand" : "bg-[#d5cfc0]")}
      >
        <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
    </div>
  );
}

export function ShopProfile({ s, set }: SectionProps) {
  const toast = useToast();
  const onLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 512 * 1024) {
      toast("Choose an image under 512 KB", "error");
      return;
    }
    const r = new FileReader();
    r.onload = () => set("logo", String(r.result));
    r.readAsDataURL(file);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Business Name" value={s.businessName} onChange={(e) => set("businessName", e.target.value)} />
      <Input label="Phone" value={s.phone} onChange={(e) => set("phone", e.target.value)} />
      <Input label="Email" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
      <Input label="GSTIN" value={s.gstin} onChange={(e) => set("gstin", e.target.value)} />
      <Input label="Invoice Prefix" value={s.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value.toUpperCase().slice(0, 6))} />
      <Textarea label="Address" wrapperClassName="sm:col-span-2" value={s.address} onChange={(e) => set("address", e.target.value)} />
      <div className="sm:col-span-2">
        <div className="mb-1.5 text-[11px] font-semibold text-[#69716b]">Logo</div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-line bg-cream text-xl font-bold text-gold-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.logo ? <img src={s.logo} alt="Shop logo" className="h-full w-full object-contain" /> : "RG"}
          </div>
          <label className="cursor-pointer rounded-[9px] border border-line bg-card px-3.5 py-2.5 text-sm font-medium transition hover:border-gold/60 focus-within:outline-2 focus-within:outline-gold">
            Upload logo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
          </label>
          {s.logo && (
            <Button variant="ghost" onClick={() => set("logo", "")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InvoiceSettings({ s, set }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="Invoice Numbering" value={s.includeYear ? "year" : "plain"} onChange={(e) => set("includeYear", e.target.value === "year")}>
        <option value="year">{s.invoicePrefix}-YYYY-0001</option>
        <option value="plain">{s.invoicePrefix}-0001</option>
      </Select>
      <Select label="Number Padding" value={s.numberPadding} onChange={(e) => set("numberPadding", Number(e.target.value))}>
        {[3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n} digits
          </option>
        ))}
      </Select>
      <Input label="Default GST on Gold (%)" type="number" min={0} max={100} step="0.01" value={s.defaultTax} onChange={(e) => set("defaultTax", num(e.target.value))} />
      <Input label="Default GST on Making (%)" type="number" min={0} max={100} step="0.01" value={s.defaultMakingTax} onChange={(e) => set("defaultMakingTax", num(e.target.value))} />
      <Input label="HSN / SAC Code" value={s.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
      <Input label="Old Gold Melting Deduction (%)" type="number" min={0} max={100} step="0.1" value={s.oldGoldDeduction} onChange={(e) => set("oldGoldDeduction", num(e.target.value))} />
      <Select label="Default Currency" value={s.currency} onChange={() => set("currency", "INR")}>
        <option value="INR">Indian Rupee (₹)</option>
      </Select>
      <Textarea label="Invoice Footer" wrapperClassName="sm:col-span-2" value={s.invoiceFooter} onChange={(e) => set("invoiceFooter", e.target.value)} />
    </div>
  );
}

export function ApprovalSettings({ s, set }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Discount approval threshold (%)" type="number" min={0} max={100} step="0.5" value={s.approvalDiscountPercent} onChange={(e) => set("approvalDiscountPercent", num(e.target.value))} hint="Staff discounts above this share of invoice subtotal are held for Owner approval." />
      <Input label="Refund approval threshold (₹)" type="number" min={0} value={s.approvalRefundLimit} onChange={(e) => set("approvalRefundLimit", num(e.target.value))} hint="Staff refunds at or above this amount require approval." />
      <Toggle label="Require approval for refunds over threshold" checked={s.approvalRequireRefund} onChange={(value) => set("approvalRequireRefund", value)} />
      <Toggle label="Require approval for stock adjustments" checked={s.approvalRequireStockAdjustment} onChange={(value) => set("approvalRequireStockAdjustment", value)} />
      <Toggle label="Require approval for invoice cancellation" checked={s.approvalRequireInvoiceCancellation} onChange={(value) => set("approvalRequireInvoiceCancellation", value)} />
      <Toggle label="Require approval for gold-rate override" checked={s.approvalRequireRateOverride} onChange={(value) => set("approvalRequireRateOverride", value)} />
      <Toggle label="Require approval for ledger write-off" checked={s.approvalRequireLedgerWriteOff} onChange={(value) => set("approvalRequireLedgerWriteOff", value)} />
      <Toggle label="Require approval for loan release" checked={s.approvalRequireLoanRelease} onChange={(value) => set("approvalRequireLoanRelease", value)} />
      <Toggle label="Require approval for sensitive customer-data changes" checked={s.approvalRequireSensitiveDataChange} onChange={(value) => set("approvalRequireSensitiveDataChange", value)} />
      <p className="text-xs text-muted sm:col-span-2">Approval settings apply to the workflows currently connected to the approval queue. The remaining action toggles are exposed for future API-backed flows.</p>
    </div>
  );
}

export function GoldSettings({ s, set }: SectionProps) {
  const field = (label: string, key: keyof Settings, step = "1") => (
    <Input label={label} type="number" min={0} step={step} value={s[key] as number} onChange={(e) => set(key, num(e.target.value) as never)} />
  );
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {field("22K Rate / g (₹)", "rate22")}
      {field("22K Making Charge (₹)", "making22")}
      {field("22K Wastage (%)", "wastage22", "0.1")}
      {field("18K Rate / g (₹)", "rate18")}
      {field("18K Making Charge (₹)", "making18")}
      {field("18K Wastage (%)", "wastage18", "0.1")}
    </div>
  );
}

export function WhatsappSettings({ s, set }: SectionProps) {
  const external = s.whatsappProvider !== "Click-to-chat (wa.me)";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="Provider" value={s.whatsappProvider} onChange={(e) => set("whatsappProvider", e.target.value as Settings["whatsappProvider"])}>
        <option>Click-to-chat (wa.me)</option>
        <option>WhatsApp Cloud API</option>
        <option>Twilio</option>
      </Select>
      <Input label="Sender Number" value={s.whatsappSender} disabled={!external} onChange={(e) => set("whatsappSender", e.target.value)} />
      <p className="text-xs text-muted sm:col-span-2">{external ? "Provider credentials must be configured in the server environment. Secrets are not collected or stored in this browser." : "Click-to-chat opens WhatsApp for a user to review and send; it does not use API credentials."}</p>
      <Textarea label="Message Template" wrapperClassName="sm:col-span-2" rows={4} value={s.whatsappTemplate} onChange={(e) => set("whatsappTemplate", e.target.value)} />
      <p className="text-xs text-muted sm:col-span-2">Placeholders: {"{customer} {invoice} {date} {total} {balance} {shop}"}</p>
    </div>
  );
}

export function SecuritySettings({ s, set }: SectionProps) {
  const { auditLogs, logAudit } = useApp();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const submit = async (v: PasswordForm) => {
    await new Promise((r) => setTimeout(r, 500));
    if (v.current !== "admin123") {
      toast("Current password is incorrect", "error");
      return;
    }
    logAudit("Changed account password");
    reset();
    toast("Password updated");
  };
  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-3" noValidate>
        <Input label="Current Password" type={show ? "text" : "password"} autoComplete="current-password" error={errors.current?.message} {...register("current")} />
        <Input label="New Password" type={show ? "text" : "password"} autoComplete="new-password" error={errors.next?.message} {...register("next")} />
        <Input label="Confirm Password" type={show ? "text" : "password"} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        <div className="flex gap-2 sm:col-span-3">
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Change Password
          </Button>
          <Button variant="ghost" onClick={() => setShow((v) => !v)}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? "Hide" : "Show"}
          </Button>
        </div>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Session Timeout" value={s.sessionTimeout} onChange={(e) => set("sessionTimeout", Number(e.target.value))}>
          {[15, 30, 60, 120].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
        <div className="self-end">
          <Toggle label="Audit logging" desc="Record sign-ins and data changes" checked={s.auditEnabled} onChange={(v) => set("auditEnabled", v)} />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Audit Log</h3>
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] border-collapse">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className={TH}>Time</th>
                <th className={TH}>User</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((l) => (
                <tr key={l.id} className="border-b border-[#f0ebdf]">
                  <td className={cn(TD, "whitespace-nowrap")}>{fmtDateTime(l.at)}</td>
                  <td className={TD}>{l.actor}</td>
                  <td className={TD}>{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BackupSettings({ s, set }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Toggle label="Automatic daily backup" desc="A recovery point is created every day" checked={s.autoBackup} onChange={(v) => set("autoBackup", v)} />
      </div>
      <Input label="Backup Time" type="time" value={s.backupTime} disabled={!s.autoBackup} onChange={(e) => set("backupTime", e.target.value)} />
      <Select label="Retention Period" value={s.retentionDays} onChange={(e) => set("retentionDays", Number(e.target.value))}>
        {[7, 15, 30, 60, 90].map((d) => (
          <option key={d} value={d}>
            {d} days
          </option>
        ))}
      </Select>
    </div>
  );
}
