"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppProvider } from "@/components/providers/AppProvider";
import { ShopProvider } from "@/components/providers/ShopProvider";
import { OperationsProvider } from "@/components/providers/OperationsProvider";
import { GoldAccountingProvider } from "@/components/providers/GoldAccountingProvider";
import { StonesProvider } from "@/components/providers/StonesProvider";
import { WhatsAppProvider } from "@/components/providers/WhatsAppProvider";
import { AdvancedModulesProvider } from "@/components/providers/AdvancedModulesProvider";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { canAccess } from "@/lib/config";
import { InvoiceDetailsModal } from "@/components/invoices/InvoiceDetails";
import { MAIN_OFFSET, Sidebar, type SidebarMode } from "@/components/layout/Sidebar";
import { PrintHost } from "@/components/layout/PrintHost";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getSession, subscribeSession } from "@/lib/services/auth";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSyncExternalStore(subscribeSession, getSession, () => undefined);
  const [mode, setMode] = useState<SidebarMode>("auto");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (!session) {
    return (
      <div className="p-8">
        <PageSkeleton />
      </div>
    );
  }

  const toggle = () => {
    const wide = window.innerWidth >= 1024;
    setMode((m) => (m === "auto" ? (wide ? "narrow" : "wide") : m === "wide" ? "narrow" : "wide"));
  };

  return (
    <AppProvider>
      <ShopProvider>
      <OperationsProvider>
      <GoldAccountingProvider>
      <StonesProvider>
      <WhatsAppProvider>
      <AdvancedModulesProvider>
      <div className="print:hidden">
        <Sidebar mode={mode} role={session.role} mobileOpen={drawer} onClose={() => setDrawer(false)} />
        <div className={cn("admin-content-shell min-h-screen transition-[margin] duration-300", MAIN_OFFSET[mode])}>
          <Topbar session={session} onMenu={() => setDrawer(true)} onToggleSidebar={toggle} />
          <main className="mx-auto max-w-[1500px] px-4 pt-6 pb-12 sm:px-[30px] sm:pt-7">{canAccess(session.role, pathname) ? children : <AccessDenied />}</main>
        </div>
        <InvoiceDetailsModal />
      </div>
      <PrintHost />
      </AdvancedModulesProvider>
      </WhatsAppProvider>
      </StonesProvider>
      </GoldAccountingProvider>
      </OperationsProvider>
      </ShopProvider>
    </AppProvider>
  );
}
