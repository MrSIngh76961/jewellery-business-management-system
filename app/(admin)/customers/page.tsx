"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { WishesCard } from "@/components/customers/WishesCard";
import { PurchaseHistory } from "@/components/customers/PurchaseHistory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useReady } from "@/lib/hooks";
import { customerStats } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { customers, invoices } = useApp();
  const ready = useReady(250);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Customer | null>(null);
  if (!ready) return <PageSkeleton />;

  const term = q.trim().toLowerCase();
  const filtered = customers.filter((c) => `${c.name} ${c.mobile} ${c.id}`.toLowerCase().includes(term));
  const sub = history ? customerStats(history, invoices) : null;

  return (
    <>
      <PageHeader title="Customers" subtitle="Customer records and complete purchase history.">
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </PageHeader>
      <WishesCard />
      <Card>
        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or mobile…" className={cn(controlClass, "pl-9")} />
        </div>
        <CustomerTable customers={filtered} invoices={invoices} onEdit={setEditing} onHistory={setHistory} />
      </Card>

      <CustomerModal open={adding} onClose={() => setAdding(false)} />
      <CustomerModal open={!!editing} customer={editing ?? undefined} onClose={() => setEditing(null)} />
      <Modal open={!!history} onClose={() => setHistory(null)} size="lg" title={history ? `${history.name} — Purchase History` : "Purchase History"}>
        {history && sub && <PurchaseHistory customer={history} invoices={sub.invoices} showCreate />}
      </Modal>
    </>
  );
}
