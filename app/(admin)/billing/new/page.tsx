"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BillingForm } from "@/components/billing/BillingForm";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useReady } from "@/lib/hooks";

function NewBill() {
  const customer = useSearchParams().get("customer") ?? undefined;
  const stock = useSearchParams().get("stock") ?? undefined;
  const ready = useReady(250);
  if (!ready) return <PageSkeleton />;
  return <BillingForm customerId={customer} stockId={stock} />;
}

export default function NewBillPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewBill />
    </Suspense>
  );
}
