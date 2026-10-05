import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#cda64b] text-sm font-extrabold text-[#e5c36e]",
        className,
      )}
    >
      RG
    </div>
  );
}
