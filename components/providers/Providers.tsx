"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import { useI18n, useTheme } from "@/lib/prefs";

function PrefsApplier() {
  useTheme();
  useI18n();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <PrefsApplier />
        {children}
      </ToastProvider>
    </MotionConfig>
  );
}
