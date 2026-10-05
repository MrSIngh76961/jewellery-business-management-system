import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

const tone: Record<string, string> = {
  Paid: "bg-[#e4f2e8] text-[#34704b]",
  Successful: "bg-[#e4f2e8] text-[#34704b]",
  Partial: "bg-[#fff0d1] text-[#9a6b16]",
  Unpaid: "bg-[#fae4e2] text-[#a54440]",
  Failed: "bg-[#fae4e2] text-[#a54440]",
  neutral: "bg-cream text-muted",
};

export function Badge({ children, tone: t = "neutral", className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold", tone[t] ?? tone.neutral, className)}>
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={status}>{status}</Badge>;
