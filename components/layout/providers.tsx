"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";
import { useAegis } from "@/store/aegis";

export function Providers({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const reduced = useAegis((s) => s.prefs.reducedMotion);
  return <MotionConfig reducedMotion={hydrated && reduced ? "always" : "user"}>{children}</MotionConfig>;
}
