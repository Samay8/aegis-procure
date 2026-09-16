"use client";

import { motion } from "framer-motion";
import { ArrowDownRight } from "lucide-react";
import type { ScoreResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { RecordChips } from "@/components/ui/record-chip";
import { CHART } from "./theme";

/**
 * The score, decomposed: a 0–100 track built from each factor's contribution,
 * with any reduction from context or feedback shown as a hatched remainder.
 */
export function ScoreTrack({ score, className }: { score: ScoreResult; className?: string }) {
  let offset = 0;
  const reduction = Math.max(0, score.base - score.computed);
  return (
    <div className={cn("relative", className)}>
      <div className="relative h-4 w-full overflow-hidden rounded-[3px] bg-panel-3" role="img" aria-label={`Score ${score.total} of 100 built from ${score.factors.length} factors`}>
        {score.factors.map((factor, index) => {
          const left = offset;
          offset += factor.current;
          if (factor.current <= 0) return null;
          return (
            <motion.div
              key={factor.id}
              className="absolute inset-y-0 border-r-2 border-panel"
              style={{ background: CHART.series[index % CHART.series.length] }}
              initial={false}
              animate={{ left: `${left}%`, width: `${factor.current}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              title={`${factor.label}: +${factor.current}`}
            />
          );
        })}
        {reduction > 0 && (
          <motion.div
            className="absolute inset-y-0 border border-dashed border-ink-3/60 bg-[repeating-linear-gradient(135deg,rgba(236,231,223,0.12)_0_2px,transparent_2px_6px)]"
            initial={false}
            animate={{ left: `${score.computed}%`, width: `${reduction}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            title={`Reduced by ${reduction} after context and feedback`}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] tabular text-ink-3">
        <span>0</span>
        <span>45</span>
        <span>70</span>
        <span>90</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ score, compact, className }: { score: ScoreResult; compact?: boolean; className?: string }) {
  return (
    <div className={className}>
      <ul className="divide-y divide-line">
        {score.factors.map((factor, index) => {
          const changed = factor.current !== factor.base;
          return (
            <li key={factor.id} className={cn("grid grid-cols-[3.25rem_1fr] gap-x-3", compact ? "py-2" : "py-3")}>
              <div className="flex flex-col items-end">
                <span className={cn("type-title tabular text-lg", changed ? "text-ok-ink" : "text-ink")}>+{factor.current}</span>
                {changed && <span className="text-[11px] tabular text-ink-3 line-through">+{factor.base}</span>}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: CHART.series[index % CHART.series.length] }} />
                  <span className="text-[13px] font-medium text-ink">{factor.label}</span>
                </div>
                {!compact && <p className="mt-1 text-[13px] leading-snug text-ink-2">{factor.rationale}</p>}
                {factor.adjustments.map((adjustment) => (
                  <p key={adjustment} className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-ok-ink">
                    <ArrowDownRight aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
                    {adjustment}
                  </p>
                ))}
                {!compact && factor.signalIds.length > 0 && <RecordChips ids={factor.signalIds} className="mt-2" max={3} />}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-1 flex items-baseline justify-between border-t-2 border-line-strong pt-3">
        <span className="type-label">Total</span>
        <span className="flex items-baseline gap-2">
          {score.total !== score.base && <span className="text-sm tabular text-ink-3 line-through">{score.base}</span>}
          <span className="type-display tabular text-3xl text-ink">{score.total}</span>
        </span>
      </div>
      {score.override && (
        <p className="mt-2 text-xs text-warn-ink">
          Set manually by investigator: {score.override.reason} (computed score {score.computed})
        </p>
      )}
    </div>
  );
}
