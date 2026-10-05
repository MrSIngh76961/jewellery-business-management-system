"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/components/providers/AppProvider";
import { Barcode, QrCode } from "@/components/ui/Codes";
import { money } from "@/lib/format";
import type { StockItem } from "@/lib/types";

export function TagLabel({ item }: { item: StockItem }) {
  const { settings } = useApp();
  return (
    <div className="paper w-[260px] rounded-lg border border-dashed border-[#999] bg-white p-3 text-[#172019]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-wider uppercase">{settings.businessName}</p>
          <p className="mt-1 text-[13px] font-semibold">{item.name}</p>
          <p className="text-[11px]">
            {item.purity} · {item.weight} g
          </p>
          <p className="text-[11px]">Making {money(item.making)}</p>
        </div>
        <QrCode value={`${item.tag}|${item.name}|${item.purity}|${item.weight}g`} size={56} />
      </div>
      <div className="mt-2 flex justify-center">
        <Barcode value={item.tag} height={34} />
      </div>
    </div>
  );
}

/** Renders labels into <body> so only they print, then opens the print dialog. */
export function PrintLabels({ items, onDone }: { items: StockItem[]; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 400);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div className="hidden flex-wrap gap-3 print:flex">
      {items.map((i) => (
        <TagLabel key={i.id} item={i} />
      ))}
    </div>,
    document.body,
  );
}
