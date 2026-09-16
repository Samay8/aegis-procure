"use client";

import { Signal, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { OUTCOME_META, PRIORITY_META, STATUS_META, levelFromScore } from "@/data/reference";
import { cn } from "@/lib/utils";
import type { InvestigationOutcome, InvestigationStatus, PriorityLevel } from "@/types";
import { AnimatedNumber } from "./animated-number";
import { Badge, TONE_FILL, TONE_TEXT, type Tone } from "./badge";

export const PRIORITY_TONE: Record<PriorityLevel, Tone> = {
  LOW: "slate",
  MEDIUM: "warn",
  HIGH: "risk",
  CRITICAL: "critical",
};

const PRIORITY_ICON = {
  LOW: SignalLow,
  MEDIUM: SignalMedium,
  HIGH: SignalHigh,
  CRITICAL: Signal,
};

export function PriorityBadge({
  level,
  score,
  label = "priority",
  className,
}: {
  level: PriorityLevel;
  score?: number;
  label?: string | false;
  className?: string;
}) {
  const Icon = PRIORITY_ICON[level];
  return (
    <Badge tone={PRIORITY_TONE[level]} className={className}>
      <Icon aria-hidden className="h-3 w-3" strokeWidth={2.5} />
      {score != null && <span className="tabular">{score}</span>}
      <span>
        {PRIORITY_META[level].label}
        {label ? ` ${label}` : ""}
      </span>
    </Badge>
  );
}

/** Four-band meter: the score's position against the priority bands. */
export function PriorityMeter({ score, className }: { score: number; className?: string }) {
  const bands: { level: PriorityLevel; from: number; to: number }[] = [
    { level: "LOW", from: 0, to: 45 },
    { level: "MEDIUM", from: 45, to: 70 },
    { level: "HIGH", from: 70, to: 90 },
    { level: "CRITICAL", from: 90, to: 100 },
  ];
  const level = levelFromScore(score);
  return (
    <div className={cn("relative", className)} role="img" aria-label={`Priority ${score} of 100, ${PRIORITY_META[level].label}`}>
      <div className="flex h-1.5 gap-[2px]">
        {bands.map((band) => (
          <div
            key={band.level}
            className={cn(
              "h-full rounded-[1px] transition-opacity duration-500",
              TONE_FILL[PRIORITY_TONE[band.level]],
              band.level === level ? "opacity-100" : "opacity-20",
            )}
            style={{ width: `${band.to - band.from}%` }}
          />
        ))}
      </div>
      <div
        className="absolute -top-[5px] h-[16px] w-[2px] rounded-full bg-ink shadow-[0_0_0_2px_var(--color-panel)] transition-[left] duration-700 ease-out"
        style={{ left: `calc(${Math.min(99.5, Math.max(0.5, score))}% - 1px)` }}
      />
    </div>
  );
}

export function ScoreFigure({
  score,
  base,
  size = "lg",
  className,
}: {
  score: number;
  base?: number;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const level = levelFromScore(score);
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <AnimatedNumber
        value={score}
        startOnView={false}
        duration={0.9}
        className={cn(
          "type-display tabular leading-none",
          TONE_TEXT[PRIORITY_TONE[level]],
          size === "xl" ? "text-[72px] sm:text-[88px]" : size === "lg" ? "text-[52px]" : "text-[34px]",
        )}
      />
      <span className="text-sm font-medium text-ink-3">/ 100</span>
      {base != null && base !== score && (
        <span className="ml-1 text-sm text-ink-3">
          was <span className="tabular line-through decoration-ink-3/60">{base}</span>
        </span>
      )}
    </div>
  );
}

const STATUS_TONE: Record<InvestigationStatus, Tone> = {
  NEW: "accent",
  UNDER_REVIEW: "rel",
  EVIDENCE_GATHERING: "rel",
  CONTEXT_CHECK: "warn",
  NEEDS_MORE_EVIDENCE: "warn",
  REFERRED: "risk",
  RESOLVED: "ok",
  CLOSED: "slate",
};

export function StatusBadge({ status, className }: { status: InvestigationStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_FILL[STATUS_TONE[status]])} />
      {STATUS_META[status].label}
    </Badge>
  );
}

export function OutcomeBadge({ outcome, className }: { outcome: InvestigationOutcome; className?: string }) {
  const tone = OUTCOME_META[outcome].tone;
  return (
    <Badge tone={tone} className={className}>
      {OUTCOME_META[outcome].label}
    </Badge>
  );
}
