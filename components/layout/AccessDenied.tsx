"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { useI18n } from "@/lib/prefs";

export function AccessDenied() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
      <ShieldAlert className="mx-auto h-10 w-10 text-gold" />
      <h1 className="mt-3 text-xl font-semibold">{t("Access restricted")}</h1>
      <p className="mt-1 text-sm text-muted">{t("You don't have permission to open this page.")}</p>
      <Link href="/dashboard" className={`${buttonClass("primary")} mt-5`}>
        {t("Dashboard")}
      </Link>
    </div>
  );
}
