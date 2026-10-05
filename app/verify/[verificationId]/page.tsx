"use client";

import { useParams } from "next/navigation";
import { VerificationClient } from "@/components/advanced/AdvancedPages";

export default function InvoiceVerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>();
  return <VerificationClient verificationId={decodeURIComponent(verificationId)} />;
}
