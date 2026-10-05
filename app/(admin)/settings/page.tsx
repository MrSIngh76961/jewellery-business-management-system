"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Save } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApprovalSettings, BackupSettings, GoldSettings, InvoiceSettings, SecuritySettings, ShopProfile, WhatsappSettings } from "@/components/settings/SettingsSections";
import { Button } from "@/components/ui/Button";
import { UsersRoles } from "@/components/settings/UsersRoles";
import { Card, Tabs } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useReady } from "@/lib/hooks";
import type { Settings } from "@/lib/types";

const TABS = ["Shop Profile", "Invoice", "Gold", "Approvals", "WhatsApp", "Security", "Users & Roles", "Backup"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const toast = useToast();
  const ready = useReady(250);
  const [tab, setTab] = useState<Tab>("Shop Profile");
  const [draft, setDraft] = useState<Settings>(settings);
  if (!ready) return <PageSkeleton />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const props = { s: draft, set };
  const save = () => {
    updateSettings(draft);
    toast("Settings saved successfully");
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Shop, invoice, gold, messaging and security preferences.">
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(settings)}>
          Discard
        </Button>
        <Button variant="primary" onClick={save}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </PageHeader>
      <Card>
        <div className="mb-5 overflow-x-auto">
          <Tabs label="Settings sections" tabs={TABS} value={tab} onChange={setTab} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === "Shop Profile" && <ShopProfile {...props} />}
            {tab === "Invoice" && <InvoiceSettings {...props} />}
            {tab === "Gold" && <GoldSettings {...props} />}
            {tab === "Approvals" && <ApprovalSettings {...props} />}
            {tab === "WhatsApp" && <WhatsappSettings {...props} />}
            {tab === "Security" && <SecuritySettings {...props} />}
            {tab === "Users & Roles" && <UsersRoles />}
            {tab === "Backup" && <BackupSettings {...props} />}
          </motion.div>
        </AnimatePresence>
      </Card>
    </>
  );
}
