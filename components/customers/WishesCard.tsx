"use client";

import { Cake, Gift, MessageCircle } from "lucide-react";
import { differenceInCalendarDays, parseISO, setYear } from "date-fns";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/prefs";
import { publishWhatsAppEvent } from "@/lib/whatsapp-automation";

function daysUntil(iso: string) {
  const today = parseISO(DEMO_TODAY);
  const d = setYear(parseISO(iso), today.getFullYear());
  return differenceInCalendarDays(d, today);
}

export function WishesCard() {
  const { customers, settings, logAudit } = useApp();
  const toast = useToast();
  const { t } = useI18n();

  const events = customers
    .flatMap((c) => [
      c.birthday ? { c, kind: "Birthday" as const, date: c.birthday, days: daysUntil(c.birthday) } : null,
      c.anniversary ? { c, kind: "Anniversary" as const, date: c.anniversary, days: daysUntil(c.anniversary) } : null,
    ])
    .filter((e): e is NonNullable<typeof e> => !!e && e.days >= 0 && e.days <= 14)
    .sort((a, b) => a.days - b.days);

  const send = (customerId: string, name: string, mobile: string, kind: string) => {
    const digits = mobile.replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const text = `Dear ${name}, wishing you a very happy ${kind.toLowerCase()}! Warm regards, ${settings.businessName}.`;
    publishWhatsAppEvent({
      id: `wish-${kind.toLowerCase()}-${customerId}-${DEMO_TODAY}`,
      type: kind === "Birthday" ? "birthday" : "anniversary",
      customerName: name,
      mobile,
      variables: {},
    });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    toast(`${kind} click-to-chat opened for ${name}; WhatsApp delivery is not confirmed.`);
    logAudit(`Opened ${kind.toLowerCase()} click-to-chat for ${name}`);
  };

  return (
    <Card className="mb-4">
      <CardHead title={t("Upcoming Birthdays & Anniversaries")} />
      {events.length === 0 && <p className="text-sm text-muted">No birthdays or anniversaries in the next 14 days.</p>}
      <ul className="divide-y divide-line">
        {events.map((e) => (
          <li key={`${e.c.id}-${e.kind}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0d1] text-gold-deep">{e.kind === "Birthday" ? <Cake className="h-4 w-4" /> : <Gift className="h-4 w-4" />}</span>
              <span>
                <b className="block">{e.c.name}</b>
                <span className="text-xs text-muted">
                  {e.kind} · {fmtDate(e.date).slice(0, 6)} · {e.days === 0 ? "Today" : `in ${e.days} day${e.days > 1 ? "s" : ""}`}
                </span>
              </span>
            </span>
            <Button size="sm" onClick={() => send(e.c.id, e.c.name, e.c.mobile, e.kind)}>
              <MessageCircle className="h-4 w-4" /> {t("Send Wish")}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
