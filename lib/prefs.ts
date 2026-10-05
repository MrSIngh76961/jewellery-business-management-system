"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { DICT } from "./dictionary";

export type Lang = "en" | "hi";
export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

const read = <T extends string>(key: string, fallback: T) => ((typeof window !== "undefined" && (window.localStorage.getItem(key) as T)) || fallback) as T;
const write = (key: string, value: string) => {
  window.localStorage.setItem(key, value);
  emit();
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => read<Theme>("rg-theme", "light"), () => "light" as Theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggle = useCallback(() => write("rg-theme", theme === "dark" ? "light" : "dark"), [theme]);
  return { theme, toggle };
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, () => read<Lang>("rg-lang", "en"), () => "en" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = useCallback((key: string) => (lang === "hi" ? DICT[key] ?? key : key), [lang]);
  const toggle = useCallback(() => write("rg-lang", lang === "hi" ? "en" : "hi"), [lang]);
  return { lang, t, toggle };
}
