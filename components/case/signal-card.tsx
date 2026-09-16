"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, ShieldQuestionMark } from "lucide-react";
import { useState } from "react";
import { CONFIDENCE_META, SIGNAL_CATEGORY_META, SIGNAL_TYPE_META } from "@/data/reference";
import { cn } from "@/lib/utils";
import type { AnomalySignal, SignalFeedback } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORY_ICON } from "@/components/ui/icons";
import { PRIORITY_TONE } from "@/components/ui/priority";
import { RecordChips } from "@/components/ui/record-chip";
import { ConfidenceTag } from "@/components/ui/signal-badge";

const FEEDBACK_LABEL: Record<SignalFeedback, { label: string; tone: "ok" | "slate" | "accent" }> = {
  RELEVANT: { label: "Marked relevant", tone: "accent" },
  NOT_RELEVANT: { label: "Marked not relevant", tone: "slate" },
  EXPLAINED: { label: "Explained by context", tone: "ok" },
};

/** Why should I trust this alert? — the seven questions every signal must answer. */
export function TrustPanel({ signal }: { signal: AnomalySignal }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Signal", value: `${SIGNAL_TYPE_META[signal.type].label}: ${signal.headline}` },
    { label: "Evidence", value: signal.evidenceIds.length ? <RecordChips ids={signal.evidenceIds} max={5} /> : "Records listed in the evidence tab" },
    { label: "Context", value: signal.context },
    { label: "Confidence", value: `${CONFIDENCE_META[signal.confidence].label}. ${CONFIDENCE_META[signal.confidence].description}` },
    { label: "Data coverage", value: signal.dataCoverage },
    { label: "Reasoning", value: signal.reasoning },
    {
      label: "Alternative explanations",
      value: (
        <ul className="space-y-1">
          {signal.alternatives.map((alt) => (
            <li key={alt} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
              {alt}
            </li>
          ))}
        </ul>
      ),
    },
  ];
  return (
    <dl className="divide-y divide-line rounded-[5px] border border-line bg-ground-2/60">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-1 gap-1 px-3 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{row.label}</dt>
          <dd className="text-[13px] leading-relaxed text-ink-2">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Stretch the last cell of a hairline metric grid (2 cols, 3 from sm) so no empty cell shows through. */
function fillSpan(count: number) {
  const base = count % 2 === 1 ? "col-span-2" : "col-span-1";
  const sm = ["sm:col-span-1", "sm:col-span-3", "sm:col-span-2"][count % 3];
  return `${base} ${sm}`;
}

export function SignalExplanationCard({
  signal,
  caseId,
  feedback,
  defaultOpen,
  index,
}: {
  signal: AnomalySignal;
  caseId: string;
  feedback?: SignalFeedback;
  defaultOpen?: boolean;
  index?: number;
}) {
  const [trustOpen, setTrustOpen] = useState(Boolean(defaultOpen));
  const Icon = CATEGORY_ICON[signal.category];
  const metrics = signal.metrics.slice(0, 6);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (index ?? 0) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-md border bg-panel", feedback === "NOT_RELEVANT" ? "border-line opacity-60" : "border-line")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-line-strong bg-panel-2">
            <Icon aria-hidden className="h-4 w-4 text-ink-2" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-label">{SIGNAL_CATEGORY_META[signal.category].label}</span>
              <span className="font-mono text-[11px] text-ink-3">{signal.id}</span>
            </div>
            <h3 className="type-title mt-1 text-[17px] uppercase tracking-[0.01em] text-ink">{signal.title}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {feedback && <Badge tone={FEEDBACK_LABEL[feedback].tone}>{FEEDBACK_LABEL[feedback].label}</Badge>}
          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()} severity</Badge>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <p className="text-[15px] leading-relaxed text-ink">{signal.headline}</p>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-line bg-line sm:grid-cols-3">
          {metrics.map((metric, i) => (
            <div key={metric.label} className={cn("bg-panel-2 px-3 py-2.5", i === metrics.length - 1 && fillSpan(metrics.length))}>
              <dt className="text-[11px] text-ink-3">{metric.label}</dt>
              <dd className="mt-0.5 truncate text-[15px] font-semibold tabular text-ink" title={metric.value}>
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        <blockquote className="border-l-2 border-accent/60 pl-3 text-[13px] leading-relaxed text-ink-2">{signal.explanation}</blockquote>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ConfidenceTag confidence={signal.confidence} />
          <span className="text-xs text-ink-3">
            Recommended: <span className="text-ink-2">{signal.recommendedAction}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {signal.type === "PRICE_OUTLIER" || signal.type === "CLOSE_BIDS" ? (
            <ButtonLink
              href={caseId ? `/investigations/${caseId}/bids#comparables` : `/procurement/${signal.tenderIds[0]}#comparables`}
              size="sm"
              variant="secondary"
            >
              View comparable procurement
            </ButtonLink>
          ) : signal.type === "SHARED_ENTITY" || signal.type === "PARTICIPATION_PATTERN" || signal.type === "BID_ROTATION" ? (
            <ButtonLink href={caseId ? `/investigations/${caseId}/relationships` : `/relationships?focus=${signal.vendorIds[0]}`} size="sm" variant="secondary">
              Open relationship graph
            </ButtonLink>
          ) : signal.type === "TIMING_ANOMALY" && caseId ? (
            <ButtonLink href={`/investigations/${caseId}/timeline`} size="sm" variant="secondary">
              Open timeline
            </ButtonLink>
          ) : null}
          <ButtonLink href={caseId ? `/investigations/${caseId}/evidence?signal=${signal.id}` : `/alerts?signal=${signal.id}`} size="sm" variant="primary">
            {caseId ? "View evidence" : "Review signal"} <ArrowUpRight className="h-3.5 w-3.5" />
          </ButtonLink>
          <button
            type="button"
            onClick={() => setTrustOpen((v) => !v)}
            aria-expanded={trustOpen}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2 text-xs text-ink-2 hover:bg-panel-3 hover:text-ink"
          >
            <ShieldQuestionMark className="h-3.5 w-3.5" /> Why should I trust this alert?
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", trustOpen && "rotate-180")} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {trustOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <TrustPanel signal={signal} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export function SignalMini({ signal, caseId, feedback }: { signal: AnomalySignal; caseId: string; feedback?: SignalFeedback }) {
  const Icon = CATEGORY_ICON[signal.category];
  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", feedback === "NOT_RELEVANT" && "opacity-55")}>
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink">{signal.title}</span>
          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
          {feedback && <Badge tone={FEEDBACK_LABEL[feedback].tone}>{FEEDBACK_LABEL[feedback].label}</Badge>}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{signal.headline}</p>
      </div>
      <Link href={`/investigations/${caseId}/evidence?signal=${signal.id}`} className="shrink-0 text-xs text-accent-ink hover:underline">
        Evidence
      </Link>
    </li>
  );
}
