"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({ page, pages, total, size, onChange }: { page: number; pages: number; total: number; size: number; onChange: (p: number) => void }) {
  if (total <= size) return <p className="mt-3 text-xs text-muted">{total} record{total === 1 ? "" : "s"}</p>;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <Button size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2 text-ink">
          Page {page} / {pages}
        </span>
        <Button size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </nav>
    </div>
  );
}
