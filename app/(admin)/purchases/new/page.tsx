import { Suspense } from "react";
import { NewPurchasePage } from "@/components/operations/OperationsPages";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><NewPurchasePage /></Suspense>;
}
