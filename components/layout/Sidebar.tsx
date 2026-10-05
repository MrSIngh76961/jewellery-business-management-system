"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BookUser, ClipboardCheck, Coins, DatabaseBackup, Factory, FilePlus2, FileText, FlaskConical, Gem, Hammer, HandCoins, LayoutDashboard, MessageCircle, Receipt, RotateCcw, Settings, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Store, TrendingUp, Wallet, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, APP_NAME } from "@/lib/config";
import { useI18n } from "@/lib/prefs";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";

const ICONS: Record<string, typeof Users> = {
  "/dashboard": LayoutDashboard,
  "/billing/new": FilePlus2,
  "/invoices": FileText,
  "/customers": Users,
  "/stock": Gem,
  "/ledger": BookUser,
  "/orders": Hammer,
  "/karigars": Coins,
  "/gold-accounting": Coins,
  "/gold-accounting/purity": Coins,
  "/melting": RotateCcw,
  "/assay": FlaskConical,
  "/production": Factory,
  "/quotations": FileText,
  "/gold-rate/simulator": TrendingUp,
  "/risk-center": ShieldAlert,
  "/executive-dashboard": LayoutDashboard,
  "/loans": HandCoins,
  "/sales": Receipt,
  "/reports": BarChart3,
  "/reports/profit": BarChart3,
  "/purchases": ShoppingBag,
  "/suppliers": Store,
  "/stones": Gem,
  "/returns": RotateCcw,
  "/expenses": Wallet,
  "/day-close": ClipboardCheck,
  "/bookings": FilePlus2,
  "/approvals": ShieldCheck,
  "/audit-log": ShieldCheck,
  "/whatsapp": MessageCircle,
  "/ai-assistant": Sparkles,
  "/backup": DatabaseBackup,
  "/settings": Settings,
};

export type SidebarMode = "auto" | "wide" | "narrow";

function isActive(pathname: string, href: string) {
  if (href === "/billing/new") return pathname.startsWith("/billing");
  if (href === "/reports") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ narrow, role, onNavigate }: { narrow: string; role: Role; onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const label = narrow;
  return (
    <>
      <div className="flex items-center gap-3 px-2.5 pt-2 pb-7">
        <BrandMark />
        <div className={label}>
          <strong className="block text-base leading-tight">{APP_NAME}</strong>
          <small className="mt-0.5 block text-xs text-[#aebdb5]">{t("Billing Suite")}</small>
        </div>
      </div>
      <nav aria-label="Main navigation" className="grid max-h-[calc(100vh-190px)] gap-1.5 overflow-y-auto pb-3">
        {NAV_ITEMS.filter((n) => (n.roles as readonly Role[]).includes(role)).map((item) => {
          const Icon = ICONS[item.href];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={t(item.label)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm transition-colors",
                active ? "text-white" : "text-[#bdc9c3] hover:bg-forest-2/60 hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`nav-pill-${label.length}`}
                  className="absolute inset-0 rounded-[10px] bg-forest-2"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              {active && <span className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-gold-2" />}
              <Icon className="relative h-[18px] w-[18px] shrink-0" />
              <span className={cn("relative", label)}>{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("absolute right-4 bottom-5 left-4 rounded-xl border border-[#35634e] bg-forest-3 p-3 text-xs text-[#c7d4ce]", label)}>
        <span className={cn("flex items-center gap-1.5 font-medium text-white", label)}>
          <ShieldCheck className="h-3.5 w-3.5 text-gold-2" />           {t("Secure Workspace")}
        </span>
                 <span className={cn("mt-1 block", label)}>{t("Database protected & backed up")}</span>
      </div>
    </>
  );
}

const WIDTH: Record<SidebarMode, string> = {
  auto: "md:w-[72px] lg:w-[245px]",
  wide: "md:w-[245px]",
  narrow: "md:w-[72px]",
};
const LABEL: Record<SidebarMode, string> = {
  auto: "hidden lg:block",
  wide: "hidden md:block",
  narrow: "hidden",
};

export const MAIN_OFFSET: Record<SidebarMode, string> = {
  auto: "md:ml-[72px] lg:ml-[245px]",
  wide: "md:ml-[245px]",
  narrow: "md:ml-[72px]",
};

export function Sidebar({ mode, role, mobileOpen, onClose }: { mode: SidebarMode; role: Role; mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden bg-forest px-3.5 py-5 text-white transition-[width] duration-300 md:block",
          WIDTH[mode],
        )}
      >
        <SidebarContent narrow={LABEL[mode]} role={role} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-[#102019]/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              aria-label="Navigation drawer"
              className="absolute inset-y-0 left-0 w-[270px] bg-forest px-3.5 py-5 text-white shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button aria-label="Close navigation" onClick={onClose} className="absolute top-4 right-3 cursor-pointer rounded-full p-1.5 text-[#bdc9c3] hover:bg-forest-2">
                <X className="h-4 w-4" />
              </button>
              <SidebarContent narrow="block" role={role} onNavigate={onClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
