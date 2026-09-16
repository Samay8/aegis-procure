"use client";

import { useRouter } from "next/navigation";
import { useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { TENDERS } from "@/data/procurement";
import { SIGNALS } from "@/data/signals";
import { CASE_TENDER } from "@/data/story";
import { formatINR } from "@/lib/format";
import type { PriorityLevel } from "@/types";

const RANK: Record<PriorityLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/** Every tender in the dataset as one cell; the ones carrying signals light up. */
export function SignalField() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);

  const cells = useMemo(() => {
    const severity = new Map<string, PriorityLevel>();
    const count = new Map<string, number>();
    for (const signal of SIGNALS) {
      for (const tenderId of signal.tenderIds.slice(0, 1)) {
        const current = severity.get(tenderId);
        if (!current || RANK[signal.severity] > RANK[current]) severity.set(tenderId, signal.severity);
        count.set(tenderId, (count.get(tenderId) ?? 0) + 1);
      }
    }
    return [...TENDERS]
      .sort((a, b) => (a.publishedOn < b.publishedOn ? -1 : 1))
      .map((tender) => ({ tender, severity: severity.get(tender.id), signals: count.get(tender.id) ?? 0 }));
  }, []);

  const hovered = cells.find((c) => c.tender.id === hover);
  const lit = cells.filter((c) => c.severity).length;

  return (
    <div ref={ref}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10px,1fr))] gap-[3px]" onMouseLeave={() => setHover(null)}>
        {cells.map(({ tender, severity }, index) => {
          const on = Boolean(severity) && (inView || reduce);
          const color = !severity
            ? "bg-[#1f252d]"
            : severity === "CRITICAL" || severity === "HIGH"
              ? "bg-risk"
              : severity === "MEDIUM"
                ? "bg-warn"
                : "bg-slate";
          return (
            <button
              key={tender.id}
              type="button"
              aria-label={`${tender.id}: ${tender.title}${severity ? `, ${severity.toLowerCase()} signal` : ""}`}
              tabIndex={severity ? 0 : -1}
              onMouseEnter={() => setHover(tender.id)}
              onFocus={() => setHover(tender.id)}
              onClick={() => router.push(`/procurement/${tender.id}`)}
              className={`aspect-square rounded-[2px] transition-[background-color,transform,box-shadow] duration-500 hover:scale-150 ${on ? color : "bg-[#1f252d]"} ${tender.id === CASE_TENDER && on ? "shadow-[0_0_0_2px_#ece7df]" : ""}`}
              style={{ transitionDelay: on && !reduce ? `${(index % 37) * 18}ms` : "0ms" }}
            />
          );
        })}
      </div>
      <div className="mt-4 flex min-h-[44px] flex-wrap items-start justify-between gap-3 text-[13px]">
        {hovered ? (
          <div>
            <span className="font-mono text-xs text-ink-3">{hovered.tender.id}</span>
            <div className="text-ink">{hovered.tender.title}</div>
            <div className="text-xs text-ink-3">
              {hovered.tender.awardValue ? formatINR(hovered.tender.awardValue) : "Not awarded"}
              {hovered.signals > 0 ? ` · ${hovered.signals} signal${hovered.signals === 1 ? "" : "s"}` : " · no signal"}
            </div>
          </div>
        ) : (
          <p className="text-ink-3">Each square is one tender in the demo dataset. Hover to read it; select to open the record.</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-risk" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-warn" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#1f252d] ring-1 ring-line-strong" /> No signal
          </span>
          <span className="tabular text-ink-2">
            {lit} of {cells.length} tenders
          </span>
        </div>
      </div>
    </div>
  );
}
