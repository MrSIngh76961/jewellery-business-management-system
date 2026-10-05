"use client";

import { useEffect, useState } from "react";

/** Short artificial delay so pages show a skeleton (stands in for real data fetching). */
export function useReady(ms = 350) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}

/** Paginates an array; page resets are handled by callers via `key`. */
export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  return { rows: items.slice((current - 1) * size, current * size), pages, current };
}
