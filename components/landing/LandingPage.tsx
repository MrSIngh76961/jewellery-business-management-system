"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Gem,
  LockKeyhole,
  Menu,
  MessageCircle,
  PackageCheck,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/layout/BrandMark";

const features = [
  {
    icon: ReceiptIndianRupee,
    title: "Smart Gold Billing",
    text: "22K/18K rates, weight, making, wastage, old gold, GST, discounts, payments and multi-item invoices.",
    accent: "gold",
  },
  {
    icon: Boxes,
    title: "Jewellery Inventory",
    text: "Tagged stock, barcode/QR labels, item movement, aging, returns and sold status.",
    accent: "green",
  },
  {
    icon: CircleDollarSign,
    title: "Gold Accounting",
    text: "Fine gold, purity conversions, purchases, sales, old gold, karigar metal and reconciliation.",
    accent: "gold",
  },
  {
    icon: UsersRound,
    title: "Customer 360°",
    text: "Purchase history, ledger, KYC, loyalty, orders, loans, statements and customer insights.",
    accent: "green",
  },
  {
    icon: Workflow,
    title: "Karigar Management",
    text: "Jobs, gold issue/return, wastage, production status and karigar-wise metal balances.",
    accent: "gold",
  },
  {
    icon: BarChart3,
    title: "Business Intelligence",
    text: "Profit, sales, gold movement, dead stock, outstanding, business insights and executive reporting.",
    accent: "green",
  },
];

const securityFeatures = [
  { icon: LockKeyhole, title: "Role-based access", text: "Owner, Staff and Accountant permissions keep sensitive operations controlled." },
  { icon: ClipboardCheck, title: "Audit trail", text: "Track changes, approvals, reversals and stock adjustments." },
  { icon: PackageCheck, title: "Backup ready", text: "Support backup, export and recovery workflows." },
  { icon: MessageCircle, title: "Connected automation", text: "WhatsApp, invoice verification and business insights in one system." },
];

const menuItems = [
  { text: "Features", href: "#features" },
  { text: "Billing", href: "#billing" },
  { text: "Gold Intelligence", href: "#gold" },
  { text: "Security", href: "#security" },
];

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.48, ease: "easeOut" as const },
};

function DemoDashboard() {
  const chartBars = [38, 55, 44, 68, 51, 77, 61, 84, 68, 93, 76, 100, 82, 91, 70, 87];
  const stats = [
    { label: "Today’s Sales", value: "₹4.82L", detail: "+12.8%", color: "text-[#34704b]" },
    { label: "Gold Stock", value: "12.84 KG", detail: "22K + 18K", color: "text-[#a9822c]" },
    { label: "Outstanding", value: "₹8.62L", detail: "31 customers", color: "text-[#a9822c]" },
    { label: "Stock Value", value: "₹1.42Cr", detail: "Current inventory", color: "text-[#34704b]" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.14, ease: "easeOut" }}
      className="group relative mx-auto w-full max-w-[650px]"
    >
      <div className="absolute -inset-5 rounded-[32px] bg-[#17352a]/10 blur-2xl transition duration-500 group-hover:bg-[#17352a]/15" />
      <div className="landing-glow-card landing-glow-card--gold relative rounded-[22px] border border-white p-2.5 shadow-[0_30px_75px_rgba(21,47,36,.2)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_36px_85px_rgba(21,47,36,.24)] sm:p-3.5">
        <div className="flex min-h-[345px] overflow-hidden rounded-[15px] border border-[#cbdacb] bg-[#e3ede3] sm:min-h-[395px]">
          <aside className="hidden w-[130px] shrink-0 flex-col bg-[#0c3027] p-2.5 text-white sm:flex">
            <div className="flex items-center gap-2 px-1 py-2">
              <BrandMark className="h-7 w-7 rounded-lg text-[9px]" />
              <span className="truncate text-[10px] font-semibold">ReinSoft Gold</span>
            </div>
            <p className="mb-1 mt-5 px-2 text-[7px] font-semibold tracking-[.14em] text-[#93aa9e]">OVERVIEW</p>
            <div className="space-y-0.5 text-[9px]">
              {[
                ["Dashboard", true],
                ["Billing", false],
                ["Inventory", false],
                ["Customers", false],
                ["Gold Accounting", false],
                ["Karigars", false],
                ["Reports", false],
              ].map(([label, active]) => (
                <div key={String(label)} className={`landing-preview-nav-item rounded-md px-2 py-1.5 ${active ? "bg-[#245344] text-white" : "text-[#c2d0c8]"}`}>{label}</div>
              ))}
            </div>
            <p className="mb-1 mt-4 px-2 text-[7px] font-semibold tracking-[.14em] text-[#93aa9e]">MANAGE</p>
            <div className="space-y-0.5 text-[9px] text-[#c2d0c8]">
              <div className="landing-preview-nav-item rounded-md px-2 py-1.5">Ledger</div>
              <div className="landing-preview-nav-item rounded-md px-2 py-1.5">Loans</div>
              <div className="landing-preview-nav-item rounded-md px-2 py-1.5">Orders</div>
            </div>
            <div className="mt-auto flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[.06] px-2 py-2 text-[8px] text-[#d5e1d9]">
              <ShieldCheck className="h-3 w-3 text-[#efd07b]" /> System Healthy
            </div>
          </aside>

          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[.15em] text-[#818982]">Monday, 5 October 2026</p>
                <h3 className="mt-1 text-sm font-semibold text-[#18221e] sm:text-base">Good morning, Owner</h3>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#dce9dc] bg-[#edf5ed] px-2 py-1 text-[8px] font-medium text-[#34704b]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#59966b]" /> Workspace
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + index * 0.07 }} className={`landing-preview-item landing-glow-card ${index === 1 || index === 2 ? "landing-glow-card--gold border-[#dfc98f]" : "landing-glow-card--green border-[#cbdacb]"} rounded-[9px] border p-2 sm:p-2.5`}>
                  <p className="truncate text-[8px] text-[#89918a]">{stat.label}</p>
                  <p className="mt-1 truncate text-[12px] font-semibold text-[#17352a] sm:text-[14px]">{stat.value}</p>
                  <p className={`mt-0.5 truncate text-[7px] font-medium ${stat.color}`}>{stat.detail}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-[1.35fr_.85fr]">
              <div className="landing-preview-item landing-glow-card landing-glow-card--green rounded-[10px] border border-[#cbdacb] p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-[#25332b]">Today’s Sales Performance</p>
                    <p className="mt-0.5 text-[7px] text-[#8b918c]">Last 7 days · illustrative preview</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#808982]" />
                </div>
                <div className="relative mt-2 h-[70px] overflow-hidden border-b border-[#ebe8df]">
                  <div className="absolute inset-0 flex flex-col justify-between py-1">
                    <span className="border-t border-dashed border-[#eeece5]" />
                    <span className="border-t border-dashed border-[#eeece5]" />
                    <span className="border-t border-dashed border-[#eeece5]" />
                  </div>
                  <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-label="Illustrative sales trend">
                    <defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d3a64b" stopOpacity=".25" /><stop offset="100%" stopColor="#d3a64b" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 57 C24 51 27 45 50 49 S83 40 100 43 S126 27 150 36 S180 41 200 26 S229 30 250 22 S283 32 300 18 S330 26 350 12 S380 18 400 5 L400 70 L0 70 Z" fill="url(#salesFill)" />
                    <path d="M0 57 C24 51 27 45 50 49 S83 40 100 43 S126 27 150 36 S180 41 200 26 S229 30 250 22 S283 32 300 18 S330 26 350 12 S380 18 400 5" fill="none" stroke="#b98a30" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="absolute inset-x-1 bottom-0 flex h-[62px] items-end gap-[3px] opacity-30" aria-hidden="true">
                    {chartBars.map((height, index) => <motion.span key={index} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: .45, delay: .4 + index * .02 }} className={`flex-1 rounded-t-[2px] ${index > 11 ? "bg-[#d3a64b]" : "bg-[#91ae98]"}`} />)}
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[7px] text-[#939993]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>
              <div className="landing-preview-item landing-glow-card landing-glow-card--gold rounded-[10px] border border-[#dfc98f] p-2.5">
                <p className="text-[9px] font-semibold text-[#25332b]">What needs attention?</p>
                <div className="mt-2 space-y-2">
                  {[
                    ["4", "pending approvals"],
                    ["3", "ledger payments overdue"],
                    ["8", "items over 180 days old"],
                    ["12g", "reconciliation difference"],
                  ].map(([value, label], index) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[7px] font-semibold ${index === 3 ? "bg-[#f8e9e5] text-[#a34c42]" : "bg-[#f7f1e4] text-[#997020]"}`}>{value}</span>
                      <span className="text-[7px] leading-tight text-[#69736b]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-right text-[7px] tracking-wide text-[#929890]">ILLUSTRATIVE DASHBOARD PREVIEW</p>
          </div>
        </div>
      </div>
      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-4 -left-2 hidden items-center gap-2 rounded-xl border border-[#e9e2d2] bg-white px-3 py-2 shadow-lg sm:flex md:-left-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f7f1e4] text-[#a9822c]"><BadgeCheck className="h-4 w-4" /></span>
        <span><b className="block text-[9px] text-[#17352a]">Built around your workflow</b><small className="text-[8px] text-[#7c857e]">Designed for jewellery retail</small></span>
      </motion.div>
    </motion.div>
  );
}

function BillingPreview() {
  const rows = [
    { title: "22K Necklace", sub: "24.850g · Item RG-2048", value: "₹3,42,820" },
    { title: "Gold Ring", sub: "7.420g · Item RG-1821", value: "₹1,02,440" },
  ];
  return (
    <motion.div {...reveal} className="relative mx-auto w-full max-w-[490px]">
      <div className="absolute -inset-3 rounded-[28px] bg-[#e4bf68]/10 blur-xl" />
      <div className="landing-glow-card landing-glow-card--gold relative rotate-[.7deg] rounded-[20px] border border-[#d9c88e] p-4 shadow-[0_25px_60px_rgba(4,21,15,.28)] transition duration-500 hover:rotate-0 hover:shadow-[0_32px_70px_rgba(4,21,15,.35)] sm:p-5">
        <div className="flex items-center justify-between border-b border-[#eee9de] pb-3">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[.14em] text-[#a9822c]">New Gold Bill</p>
            <p className="mt-1 text-[13px] font-semibold text-[#172019]">RG-2026-1045</p>
          </div>
          <span className="rounded-full bg-[#f7f1e4] px-2.5 py-1 text-[8px] font-semibold text-[#93701f]">DRAFT</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[8px] font-semibold uppercase tracking-wide text-[#939991]"><span>Item details</span><span>Amount</span></div>
        <div className="mt-1 divide-y divide-[#e5dcc3]">
          {rows.map((row) => (
            <div key={row.title} className={`landing-preview-item landing-glow-card ${row.title.includes("Necklace") ? "landing-glow-card--green" : "landing-glow-card--gold"} my-1 flex items-center justify-between gap-2 rounded-lg border border-[#d9c88e]/60 px-2 py-2`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eee5cc] text-[#a9822c]"><Gem className="h-4 w-4" /></span>
                <span className="min-w-0"><b className="block truncate text-[10px] text-[#27332b]">{row.title}</b><small className="mt-0.5 block text-[8px] text-[#858d86]">{row.sub}</small></span>
              </span>
              <b className="shrink-0 text-[10px] text-[#27332b]">{row.value}</b>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-dashed border-[#ddd5c5] pt-3 text-[9px]">
          <div className="flex justify-between text-[#69736b]"><span>Making + Wastage</span><span>₹38,500</span></div>
          <div className="flex justify-between text-[#69736b]"><span>Old Gold Exchange</span><span>−₹86,200</span></div>
          <div className="flex justify-between text-[#69736b]"><span>GST</span><span>₹11,902</span></div>
        </div>
        <div className="landing-glow-card mt-3 flex items-center justify-between rounded-xl border border-[#d7c17e] bg-[#eee5cc] px-3.5 py-3">
          <span className="text-[10px] font-semibold text-[#354239]">Grand Total</span>
          <b className="text-[17px] text-[#17352a]">₹4,09,462</b>
        </div>
        <p className="mt-2 text-right text-[7px] tracking-wide text-[#929890]">ILLUSTRATIVE INVOICE PREVIEW</p>
      </div>
    </motion.div>
  );
}

function GoldPositionCard({ icon: Icon, title, value, unit, text, positive }: {
  icon: typeof Gem;
  title: string;
  value: string;
  unit: string;
  text: string;
  positive?: boolean;
}) {
  return (
    <motion.article {...reveal} className="landing-glow-card landing-glow-card--gold group overflow-hidden rounded-[16px] border border-[#d9c789] p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_38px_rgba(31,48,35,.09)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#66736b]">{title}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#17352a] text-[#efd07b] transition duration-300 group-hover:rotate-[-6deg]"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-5 text-[28px] leading-none font-semibold tracking-tight text-[#17352a]">{value}<span className="ml-1.5 text-xs font-medium text-[#78837a]">{unit}</span></p>
      <p className="mt-3 text-[11px] leading-5 text-[#6c776f]">{text}</p>
      {positive && <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-medium text-[#34704b]"><Check className="h-3 w-3" /> Difference highlighted for owner review</span>}
    </motion.article>
  );
}

function DemoDialog({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#06231d]/75 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
        initial={{ opacity: 0, y: 14, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: .99 }}
        className="landing-glow-card landing-glow-card--gold my-auto w-full max-w-[460px] rounded-[20px] border border-[#d9c789] p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a9822c]">ReinSoft Gold</span>
            <h2 id="demo-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#17352a]">Request a Private Demo</h2>
            <p className="mt-2 text-[12px] leading-5 text-[#6c776f]">Tell us a little about your jewellery business to prepare a product walkthrough request.</p>
          </div>
          <button onClick={onClose} aria-label="Close demo request" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#68736b] transition hover:bg-[#f1eee5] hover:text-[#17352a]"><X className="h-4 w-4" /></button>
        </div>
        {submitted ? (
          <div className="mt-6 rounded-xl border border-[#e9e2d2] bg-[#f7f3e9] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#17352a]"><BadgeCheck className="h-4 w-4 text-[#a9822c]" /> Demo request form preview</div>
            <p className="mt-2 text-xs leading-5 text-[#68736b]">Demo scheduling is not connected yet, so your details have not been sent. Please contact your ReinSoft Gold representative to arrange a walkthrough.</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-[#17352a] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#285440]">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-[11px] font-medium text-[#4e5b52]">Your name<input required name="name" autoComplete="name" className="rounded-lg border border-[#ded8c9] bg-white px-3 py-2.5 text-sm text-[#172019] outline-none transition focus:border-[#b99642] focus:ring-2 focus:ring-[#c99a2e]/15" placeholder="Full name" /></label>
            <label className="grid gap-1.5 text-[11px] font-medium text-[#4e5b52]">Business name<input required name="business" autoComplete="organization" className="rounded-lg border border-[#ded8c9] bg-white px-3 py-2.5 text-sm text-[#172019] outline-none transition focus:border-[#b99642] focus:ring-2 focus:ring-[#c99a2e]/15" placeholder="Jewellery shop or business" /></label>
            <label className="grid gap-1.5 text-[11px] font-medium text-[#4e5b52]">Work email<input required name="email" type="email" autoComplete="email" className="rounded-lg border border-[#ded8c9] bg-white px-3 py-2.5 text-sm text-[#172019] outline-none transition focus:border-[#b99642] focus:ring-2 focus:ring-[#c99a2e]/15" placeholder="you@business.com" /></label>
            <label className="grid gap-1.5 text-[11px] font-medium text-[#4e5b52]">Business type<select name="businessType" defaultValue="" required className="rounded-lg border border-[#ded8c9] bg-white px-3 py-2.5 text-sm text-[#172019] outline-none transition focus:border-[#b99642] focus:ring-2 focus:ring-[#c99a2e]/15"><option value="" disabled>Select your business type</option><option>Single shop</option><option>Multi-branch jeweller</option><option>Jewellery manufacturer</option></select></label>
            <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#17352a] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#285440]">Send Demo Request <ArrowRight className="h-4 w-4" /></button>
            <p className="text-center text-[10px] leading-4 text-[#808982]">This preview does not submit or store your details.</p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="landing-page overflow-hidden bg-[#f7f1e4] text-[#18221e]">
      <header className="fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex h-[62px] max-w-[1160px] items-center justify-between rounded-[17px] border border-[#efd07b]/35 bg-[#0c3027]/95 px-3.5 shadow-[0_14px_38px_rgba(8,39,31,.28),0_0_22px_rgba(211,166,75,.13)] backdrop-blur-xl transition duration-300 hover:border-[#efd07b]/55 hover:shadow-[0_17px_44px_rgba(8,39,31,.34),0_0_28px_rgba(211,166,75,.19)] sm:h-[68px] sm:px-5">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="ReinSoft Gold home">
            <BrandMark className="h-9 w-9 rounded-[10px] bg-[#123e32] transition duration-300 group-hover:-rotate-6 group-hover:scale-105 group-hover:shadow-[0_0_16px_rgba(239,208,123,.2)]" />
            <span><b className="block text-[13px] leading-tight text-white sm:text-sm">ReinSoft Gold</b><small className="text-[9px] text-[#c4d2c9] sm:text-[10px]">Jewellery Business Suite</small></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {menuItems.map((item) => <a key={item.href} href={item.href} className="text-[11px] font-medium text-[#d2ddd5] transition-colors hover:text-[#efd07b]">{item.text}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setDemoOpen(true)} className="hidden rounded-full px-3 py-2 text-[11px] font-semibold text-[#f0d78f] transition hover:bg-white/10 hover:text-white sm:inline-flex">Request Demo</button>
            <Link href="/login" className="group inline-flex items-center gap-2 rounded-full border border-[#efd07b]/70 bg-[#efd07b] px-4 py-2.5 text-[11px] font-semibold text-[#0c3027] shadow-[0_3px_14px_rgba(211,166,75,.18)] transition duration-300 hover:-translate-y-0.5 hover:border-[#f7dc91] hover:bg-[#f7dc91] hover:shadow-[0_6px_22px_rgba(211,166,75,.3)] sm:px-5 sm:text-xs">Sign in <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
            <button aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-full text-[#f3e8c7] transition hover:bg-white/10 hover:text-[#efd07b] lg:hidden"><Menu className="h-4 w-4" /></button>
          </div>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav aria-label="Mobile navigation" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto mt-2 grid max-w-[1160px] gap-1 rounded-[16px] border border-[#efd07b]/40 bg-[#0c3027]/[.97] p-2 shadow-[0_14px_38px_rgba(8,39,31,.32),0_0_20px_rgba(211,166,75,.12)] backdrop-blur-xl lg:hidden">
              {menuItems.map((item) => <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-xs font-medium text-[#d2ddd5] transition hover:bg-white/10 hover:text-[#efd07b]">{item.text}</a>)}
              <button onClick={() => { setMobileOpen(false); setDemoOpen(true); }} className="rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#efd07b] transition hover:bg-white/10">Request a Private Demo</button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_82%_18%,rgba(211,166,75,.19),transparent_27%),linear-gradient(130deg,#fbf7ed_0%,#f4eddd_56%,#eae0ca_100%)] px-5 pb-20 pt-[132px] sm:px-8 sm:pb-24 sm:pt-[150px] lg:min-h-[800px] lg:px-10 lg:pb-20 lg:pt-[148px]">
        <div className="pointer-events-none absolute -right-28 top-28 -z-10 h-[34rem] w-[34rem] rounded-full border border-[#b38a35]/10" />
        <div className="pointer-events-none absolute -right-12 top-44 -z-10 h-[25rem] w-[25rem] rounded-full border border-[#b38a35]/10" />
        <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-white/50 blur-3xl" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-9">
          <div className="relative z-10">
            <motion.span {...reveal} className="inline-flex items-center gap-2 rounded-full border border-[#d5c79f] bg-white/55 px-3 py-2 text-[9px] font-semibold uppercase tracking-[.14em] text-[#695b37] sm:text-[10px]">
              <Sparkles className="h-3.5 w-3.5 text-[#b58a2e]" /> Jewellery Business OS
            </motion.span>
            <motion.h1 {...reveal} transition={{ ...reveal.transition, delay: .06 }} className="mt-6 max-w-[550px] text-[42px] leading-[1.04] font-semibold tracking-[-.052em] text-[#142f25] sm:text-[55px] lg:text-[61px]">
              Run your gold business with <span className="font-serif text-[#b58a2e] italic">confidence.</span>
            </motion.h1>
            <motion.p {...reveal} transition={{ ...reveal.transition, delay: .12 }} className="mt-5 max-w-[510px] text-[13px] leading-7 text-[#606d64] sm:text-sm">
              Billing, inventory, gold accounting, customers, karigars, loans, GST and business intelligence — brought together in one premium platform for modern jewellery businesses.
            </motion.p>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: .18 }} className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={() => setDemoOpen(true)} className="group inline-flex items-center gap-2 rounded-full bg-[#0c3027] px-5 py-3.5 text-[12px] font-semibold text-white shadow-[0_9px_22px_rgba(12,48,39,.16)] transition duration-300 hover:-translate-y-1 hover:bg-[#123e32] hover:shadow-[0_15px_28px_rgba(12,48,39,.22)]">
                Request a Private Demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <a href="#features" className="group inline-flex items-center gap-2 rounded-full border border-[#cfc5ad] bg-white/45 px-5 py-3.5 text-[12px] font-semibold text-[#34453a] transition duration-300 hover:-translate-y-0.5 hover:border-[#b58a2e]/60 hover:bg-white">
                Explore Platform <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
              </a>
            </motion.div>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: .24 }} className="mt-7 flex flex-wrap gap-2 text-[10px] font-medium text-[#647168]">
              {["Jewellery focused", "Role-based access", "Backup ready"].map((item) => <span key={item} className="landing-feature-pill"><BadgeCheck className="h-3.5 w-3.5 text-[#a9822c]" />{item}</span>)}
            </motion.div>
          </div>
          <DemoDashboard />
        </div>
        <a href="#features" aria-label="Explore platform features" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce text-[#8a7950] transition hover:text-[#17352a] lg:block"><ArrowDown className="h-4 w-4" /></a>
      </section>

      <section id="features" className="scroll-mt-24 bg-[#fffdf8] px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-[1160px]">
          <motion.div {...reveal} className="mx-auto max-w-[680px] text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a9822c]">One platform</span>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-.04em] text-[#17352a] sm:text-[43px]">Everything your jewellery business needs.</h2>
            <p className="mx-auto mt-3 max-w-[580px] text-[13px] leading-6 text-[#707a73]">From the first gram entering your business to the final invoice, ReinSoft Gold keeps operations connected and visible.</p>
          </motion.div>
          <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, accent }, index) => (
              <motion.article key={title} {...reveal} transition={{ ...reveal.transition, delay: index * .055 }} className={`landing-glow-card ${index % 2 === 0 ? "landing-glow-card--green border-[#cbdacb]" : "landing-glow-card--gold border-[#dfc98f]"} group relative min-h-[180px] overflow-hidden rounded-[17px] border p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(18,62,50,.1)] sm:p-6`}>
                <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#d3a64b]/0 transition duration-500 group-hover:bg-[#d3a64b]/[.08] group-hover:scale-125" />
                <span className={`relative grid h-10 w-10 place-items-center rounded-xl transition duration-300 group-hover:rotate-[-5deg] group-hover:scale-110 ${accent === "green" ? "bg-[#e8f0e9] text-[#245b42]" : "bg-[#f6efd9] text-[#a9822c]"}`}><Icon className="h-[18px] w-[18px]" /></span>
                <h3 className="relative mt-4 text-[15px] font-semibold text-[#17352a]">{title}</h3>
                <p className="relative mt-2 text-[11px] leading-[1.75] text-[#707a73]">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="billing" className="scroll-mt-20 overflow-hidden bg-[#0c3027] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10">
        <div className="pointer-events-none absolute" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div {...reveal}>
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#efd07b]">Billing, perfected</span>
            <h2 className="mt-3 max-w-[500px] text-[35px] leading-[1.08] font-semibold tracking-[-.045em] sm:text-[51px]">Create accurate gold bills without manual calculations.</h2>
            <p className="mt-4 max-w-[490px] text-[12px] leading-7 text-[#c5d1ca] sm:text-[13px]">Build professional invoices while ReinSoft Gold handles gold value, making, wastage, old-gold exchange, GST and payments in one flow.</p>
            <div className="mt-6 grid max-w-[430px] grid-cols-2 gap-2">
              {["22K / 18K purity", "Live gold rate", "Old gold exchange", "GST + HSN", "Multiple items", "Payment tracking"].map((item) => <span key={item} className="landing-feature-pill landing-feature-pill--dark text-[10px]"><Check className="h-3.5 w-3.5 text-[#efd07b]" />{item}</span>)}
            </div>
            <Link href="/login" className="group mt-7 inline-flex items-center gap-2 text-[11px] font-semibold text-[#efd07b] transition hover:text-white">See Billing Demo <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link>
          </motion.div>
          <BillingPreview />
        </div>
      </section>

      <section id="gold" className="scroll-mt-20 bg-[#f0e6d1] px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-[1160px]">
          <motion.div {...reveal} className="mx-auto mb-9 max-w-[660px] text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#987225]">Gold intelligence</span>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-.04em] text-[#17352a] sm:text-[43px]">Know where every gram is.</h2>
            <p className="mx-auto mt-3 max-w-[580px] text-[12px] leading-6 text-[#657067] sm:text-[13px]">Track fine gold, karigar balances, stock value and physical reconciliation across the business.</p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <GoldPositionCard icon={Gem} title="Fine Gold Position" value="12.84" unit="KG" text="Expected closing gold after purchases, sales, old gold, karigar movement, wastage and adjustments." />
            <GoldPositionCard icon={UsersRound} title="Karigar Metal" value="246.9" unit="g" text="Gold issued to active jobs with expected return, allowed wastage and balance tracking." />
            <GoldPositionCard icon={CircleDollarSign} title="Reconciliation" value="−15.0" unit="g" text="Physical stock difference, visible for review instead of silently changing the recorded balance." positive />
          </div>
          <p className="mt-3 text-center text-[9px] text-[#80745a]">Illustrative product preview — figures shown are examples, not live business data.</p>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#0c3027] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(211,166,75,.13),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgba(36,91,66,.25),transparent_45%)]" />
        <div className="pointer-events-none absolute -top-28 left-[12%] -z-10 h-64 w-64 rounded-full border border-[#efd07b]/[.08]" />
        <div className="mx-auto max-w-[1160px]">
          <motion.div {...reveal} className="mx-auto mb-10 max-w-[680px] text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#efd07b]">Connected workflow</span>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-.04em] text-white sm:text-[43px]">From customer enquiry to completed sale.</h2>
            <p className="mx-auto mt-3 max-w-[580px] text-[12px] leading-6 text-[#c5d1ca] sm:text-[13px]">Keep the complete jewellery journey connected instead of managing separate registers and spreadsheets.</p>
          </motion.div>
          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute top-7 right-[12%] left-[12%] hidden border-t border-dashed border-[#efd07b]/50 lg:block" />
            {[
              { number: "01", title: "Customer", text: "Create a profile, capture KYC and understand purchase history, loyalty and outstanding balance.", icon: UsersRound },
              { number: "02", title: "Quotation / Order", text: "Create an estimate, collect advance and move the job into making or booking.", icon: ReceiptIndianRupee },
              { number: "03", title: "Production", text: "Issue gold to karigar, track manufacturing, stones, wastage and quality completion.", icon: Workflow },
              { number: "04", title: "Invoice & Delivery", text: "Generate the final bill, update stock, collect payment and share the invoice digitally.", icon: PackageCheck },
            ].map(({ number, title, text, icon: Icon }, index) => (
              <motion.article key={number} {...reveal} transition={{ ...reveal.transition, delay: index * .06 }} className={`landing-glow-card ${index % 2 === 0 ? "landing-glow-card--green border-[#cbdacb]" : "landing-glow-card--gold border-[#dfc98f]"} group relative rounded-[16px] border p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_17px_36px_rgba(18,62,50,.09)]`}>
                <div className="relative flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-[#dacc9c] bg-[#fffdf8] text-[#987225] transition duration-300 group-hover:border-[#17352a] group-hover:bg-[#17352a] group-hover:text-[#efd07b]"><Icon className="h-4 w-4" /></span>
                  <span className="font-serif text-lg italic text-[#b7964b]">{number}</span>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-[#17352a]">{title}</h3>
                <p className="mt-2 text-[10px] leading-[1.75] text-[#707a73]">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-20 bg-[#f7f1e4] px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-[1160px]">
          <motion.div {...reveal} className="mx-auto mb-9 max-w-[690px] text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a9822c]">Built for control</span>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-.04em] text-[#17352a] sm:text-[43px]">Your business. Your data. Your rules.</h2>
            <p className="mx-auto mt-3 max-w-[570px] text-[12px] leading-6 text-[#707a73] sm:text-[13px]">Designed around the operational realities of a jewellery business, with visibility and accountability at every step.</p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {securityFeatures.map(({ icon: Icon, title, text }, index) => (
              <motion.article key={title} {...reveal} transition={{ ...reveal.transition, delay: index * .055 }} className={`landing-glow-card ${index % 2 === 0 ? "landing-glow-card--green border-[#cbdacb]" : "landing-glow-card--gold border-[#dfc98f]"} group rounded-[14px] border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(18,62,50,.09)]`}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e9f0e8] text-[#245b42] transition duration-300 group-hover:rotate-[-5deg] group-hover:bg-[#17352a] group-hover:text-[#efd07b]"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-3 text-[12px] font-semibold text-[#17352a]">{title}</h3>
                <p className="mt-1.5 text-[10px] leading-[1.7] text-[#707a73]">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0c3027] px-5 py-[76px] text-center text-white sm:px-8 sm:py-[92px] lg:px-10">
        <motion.div {...reveal} className="relative mx-auto max-w-[1160px] overflow-hidden rounded-[22px] border border-white/[.08] bg-[radial-gradient(ellipse_at_50%_120%,rgba(211,166,75,.24),transparent_55%),linear-gradient(115deg,#123e32,#0c3027)] px-5 py-12 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-24 h-64 w-64 rounded-full border border-white/[.07]" />
          <div className="pointer-events-none absolute -right-20 -bottom-36 h-80 w-80 rounded-full border border-[#efd07b]/15" />
          <div className="relative">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#efd07b]">ReinSoft Gold</span>
            <h2 className="mx-auto mt-3 max-w-[780px] text-[35px] leading-[1.04] font-semibold tracking-[-.05em] sm:text-[55px]">Ready to modernize your jewellery business?</h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[12px] leading-6 text-[#c5d1ca] sm:text-[13px]">See the complete platform in action and explore how ReinSoft Gold can fit your shop’s workflow.</p>
            <button onClick={() => setDemoOpen(true)} className="group mt-7 inline-flex items-center gap-2 rounded-full bg-[#efd07b] px-5 py-3.5 text-[12px] font-semibold text-[#0c3027] transition duration-300 hover:-translate-y-1 hover:bg-[#f7dc91] hover:shadow-[0_15px_32px_rgba(211,166,75,.2)]">Request a Private Demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
          </div>
        </motion.div>
      </section>

      <footer className="bg-[#08271f] px-5 py-6 text-[#cad4cd] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="group flex w-fit items-center gap-2.5">
            <BrandMark className="h-9 w-9 rounded-[10px] bg-[#123e32] transition duration-300 group-hover:-rotate-6" />
            <span><b className="block text-[12px] text-white">ReinSoft Gold</b><small className="text-[9px] text-[#a8b8ae]">Jewellery Business Management Platform</small></span>
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-[10px]">
            {menuItems.map((item) => <a key={item.href} href={item.href} className="transition hover:text-[#efd07b]">{item.text}</a>)}
            <Link href="/login" className="transition hover:text-[#efd07b]">Sign in</Link>
          </nav>
          <p className="text-[9px] text-[#a8b8ae]">© {new Date().getFullYear()} ReinSoft. All rights reserved.</p>
        </div>
      </footer>

      <AnimatePresence>{demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}</AnimatePresence>
    </main>
  );
}
