"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, Languages, LogOut, Menu, Moon, PanelLeft, Settings as SettingsIcon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Tooltip } from "@/components/ui/Tooltip";
import { NAV_ITEMS } from "@/lib/config";
import { money } from "@/lib/format";
import { invoiceBalance } from "@/lib/selectors";
import { logout, type Session } from "@/lib/services/auth";
import { useI18n, useTheme } from "@/lib/prefs";

function Popover({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Topbar({ session, onMenu, onToggleSidebar }: { session: Session; onMenu: () => void; onToggleSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { invoices, openInvoice, logAudit } = useApp();
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const { t, lang, toggle: toggleLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  const crumb = [...NAV_ITEMS].reverse().find((n) => pathname.startsWith(n.href))?.crumb ?? "Overview";
  const due = invoices.filter((i) => !i.cancelledAt && i.status === "Unpaid").slice(0, 4);

  const signOut = () => {
    logAudit("Signed out");
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-[#fffdf9]/95 px-4 backdrop-blur sm:px-[30px]">
      <div className="flex items-center gap-2">
        <button aria-label="Open navigation" onClick={onMenu} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-ink hover:bg-cream md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <Tooltip label="Toggle sidebar">
          <button aria-label="Toggle sidebar" onClick={onToggleSidebar} className="hidden h-9 w-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink md:grid">
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
        <div className="hidden text-[13px] text-muted sm:block">{t(crumb)}</div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Tooltip label={lang === "hi" ? t("Switch to English") : t("Switch to Hindi")}>
          <button
            aria-label="Toggle language"
            onClick={toggleLang}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-[#fffdf9] px-2.5 text-xs font-semibold transition hover:border-gold/60"
          >
            <Languages className="h-4 w-4" /> {lang === "hi" ? "EN" : "हिं"}
          </button>
        </Tooltip>
        <Tooltip label={theme === "dark" ? t("Light mode") : t("Dark mode")}>
          <button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line bg-[#fffdf9] transition hover:border-gold/60"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </Tooltip>
        <div className="relative">
          <Tooltip label="Notifications">
            <button
              aria-label="Notifications"
              aria-expanded={bell}
              onClick={() => {
                setBell((b) => !b);
                setMenu(false);
              }}
              className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line bg-[#fffdf9] transition hover:border-gold/60"
            >
              <Bell className="h-4 w-4" />
              {due.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold" />}
            </button>
          </Tooltip>
          <Popover open={bell} onClose={() => setBell(false)} className="absolute right-0 mt-2 w-72 rounded-xl border border-line bg-card p-2 shadow-xl">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted">{t("Unpaid invoices")}</p>
            {due.length === 0 && <p className="px-2 py-3 text-sm text-muted">Notifications are all clear</p>}
            {due.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  setBell(false);
                  openInvoice(i.id);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-cream"
              >
                <span>
                  <b className="block">{i.id}</b>
                  <span className="text-xs text-muted">{i.customerName}</span>
                </span>
                <b className="text-danger">{money(invoiceBalance(i))}</b>
              </button>
            ))}
          </Popover>
        </div>

        <div className="relative">
          <button
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => {
              setMenu((m) => !m);
              setBell(false);
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-1 pl-2 hover:bg-cream"
          >
            <span className="hidden text-left sm:block">
              <b className="block text-[13px] leading-tight">{session.name}</b>
              <span className="text-xs text-muted">{session.role}</span>
            </span>
            <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#ead39b] font-bold">{session.name[0]}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" />
          </button>
          <Popover open={menu} onClose={() => setMenu(false)} className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-card p-1.5 shadow-xl">
            <div className="px-2.5 py-2 text-xs text-muted">{session.email}</div>
            <Link href="/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-cream">
              <SettingsIcon className="h-4 w-4" /> {t("Settings")}
            </Link>
            <button onClick={signOut} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/5">
              <LogOut className="h-4 w-4" /> {t("Sign out")}
            </button>
          </Popover>
        </div>
      </div>
    </header>
  );
}
