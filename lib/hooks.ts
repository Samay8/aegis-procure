"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SIGNALS, SIGNAL_BY_ID } from "@/data/signals";
import { nowIST } from "@/lib/format";
import { scoreCase } from "@/lib/scoring";
import { allCases, defaultCaseState, findCase, useAegis } from "@/store/aegis";
import type { AnomalySignal } from "@/types";

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useCaseView(caseId: string) {
  const userCases = useAegis((s) => s.userCases);
  const stored = useAegis((s) => s.cases[caseId]);
  const importedSignals = useAegis((s) => s.importedSignals);

  return useMemo(() => {
    const investigation = findCase(caseId, userCases);
    if (!investigation) return null;
    const state = stored ?? defaultCaseState(investigation);
    const score = scoreCase(investigation, state);
    const signals = investigation.signalIds
      .map((id) => SIGNAL_BY_ID.get(id) ?? importedSignals.find((s) => s.id === id))
      .filter((s): s is AnomalySignal => Boolean(s));
    return { investigation, state, score, signals };
  }, [caseId, userCases, stored, importedSignals]);
}

export type CaseView = NonNullable<ReturnType<typeof useCaseView>>;

export function useCaseViews() {
  const userCases = useAegis((s) => s.userCases);
  const cases = useAegis((s) => s.cases);
  return useMemo(
    () =>
      allCases(userCases).map((investigation) => {
        const state = cases[investigation.id] ?? defaultCaseState(investigation);
        return { investigation, state, score: scoreCase(investigation, state) };
      }),
    [userCases, cases],
  );
}

export function useSignalViews() {
  const reviews = useAegis((s) => s.signalReviews);
  const imported = useAegis((s) => s.importedSignals);
  const userCases = useAegis((s) => s.userCases);

  return useMemo(() => {
    const caseBySignal = new Map<string, string>();
    for (const c of userCases) for (const id of c.signalIds) caseBySignal.set(id, c.id);
    return [...imported, ...SIGNALS].map((signal) => ({
      signal: !signal.caseId && caseBySignal.has(signal.id) ? { ...signal, caseId: caseBySignal.get(signal.id) } : signal,
      review: reviews[signal.id],
    }));
  }, [reviews, imported, userCases]);
}

export function useOpenSignalCount() {
  const views = useSignalViews();
  return useMemo(() => views.filter((v) => !v.review).length, [views]);
}

/** Current IST wall-clock time, refreshed every minute. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => nowIST());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowIST()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
