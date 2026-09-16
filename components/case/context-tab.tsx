"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Scale, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TENDER_BY_ID, comparableStats, comparablesFor } from "@/data/procurement";
import { formatPct } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { ContextCheck } from "@/types";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImportantContext, ScoreDisclaimer } from "@/components/ui/notices";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PriorityBadge } from "@/components/ui/priority";
import { AnalysisSteps, EmptyState } from "@/components/ui/states";
import { ComparableStrip } from "@/components/charts/comparable-strip";
import { ScoreTrack } from "@/components/charts/score-breakdown";

const STEPS = ["Loading context sources", "Adjusting the observed measurement", "Recomputing the factor contribution", "Recalculating investigation priority"];

function ContextCard({
  check,
  caseId,
  applied,
  factorLabel,
  factorBase,
  running,
  step,
  onApply,
}: {
  check: ContextCheck;
  caseId: string;
  applied: boolean;
  factorLabel: string;
  factorBase: number;
  running: boolean;
  step: number;
  onApply: () => void;
}) {
  const isPercent = check.factorId === "F-PRICE";
  const tender = useCaseView(caseId)?.investigation.tenderId;

  return (
    <motion.article layout className={cn("rounded-md border bg-panel transition-colors", applied ? "border-ok/40" : "border-line")}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Scale aria-hidden className="h-4 w-4 text-ink-3" />
          <h3 className="type-title text-[15px] uppercase tracking-[0.02em] text-ink">{check.title}</h3>
        </div>
        {applied ? (
          <Badge tone="ok">
            <Check className="h-3 w-3" /> {check.verdict}
          </Badge>
        ) : check.recommended ? (
          <Badge tone="accent">Context available · recommended</Badge>
        ) : (
          <Badge tone="neutral">{check.verdict}</Badge>
        )}
      </header>

      <div className="space-y-4 p-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Observed</div>
          <div className="type-title mt-1 text-2xl text-ink">{check.observed}</div>
        </div>

        <div className="rounded-[5px] border border-line bg-ground-2/50">
          {isPercent && (
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5 text-[13px]">
              <span className="text-ink-2">Observed deviation</span>
              <span className="tabular font-semibold text-ink">{formatPct(check.observedValue, 1, true)}</span>
            </div>
          )}
          {check.adjustments.map((adjustment) => (
            <div key={adjustment.label} className="grid grid-cols-1 gap-1 border-b border-line px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:gap-4">
              <div>
                <div className="text-[13px] text-ink">
                  <span className="text-ink-3">− </span>
                  {adjustment.label}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-ink-3">{adjustment.source}</div>
              </div>
              <div className="text-[13px] font-semibold tabular text-ok-ink sm:text-right">
                {isPercent ? formatPct(adjustment.effect, 1, true) : adjustment.value}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t-2 border-line-strong px-3 py-3">
            <span className="text-[13px] font-medium text-ink">{isPercent ? "= Adjusted deviation" : "= After context"}</span>
            <span className={cn("type-title text-xl tabular", applied ? "text-ok-ink" : "text-ink")}>
              {isPercent ? formatPct(check.adjustedValue, 1, true) : check.adjustedLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span className="text-ink-3">{factorLabel}</span>
          <span className="tabular text-ink">+{factorBase}</span>
          <ArrowRight aria-hidden className="h-3.5 w-3.5 text-ink-3" />
          <span className="tabular font-semibold text-ok-ink">+{check.adjustedPoints}</span>
          <span className="text-ink-3">points</span>
        </div>

        <p className="text-[13px] leading-relaxed text-ink-2">
          <span className="font-medium text-ink">Reason. </span>
          {check.reason}
        </p>

        {isPercent && tender && <PriceContextStrip tenderId={tender} adjusted={applied ? check.adjustedValue : null} />}

        <AnimatePresence>
          {running && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <AnalysisSteps steps={STEPS} active={step} className="rounded-[5px] border border-accent/30 bg-accent/[0.05] p-3" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          <Button variant={applied ? "secondary" : "primary"} onClick={onApply} disabled={running}>
            {applied ? (
              <>
                <Undo2 className="h-4 w-4" /> Remove context adjustment
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" /> Apply context to priority
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function PriceContextStrip({ tenderId, adjusted }: { tenderId: string; adjusted: number | null }) {
  const tender = TENDER_BY_ID.get(tenderId);
  if (!tender) return null;
  const stats = comparableStats(tender);
  if (!stats.count) return null;
  return (
    <div className="rounded-[5px] border border-line p-3">
      <ComparableStrip stats={stats} comparables={comparablesFor(tender)} current={tender} adjustedPct={adjusted} />
    </div>
  );
}

export function ContextTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const toggleContext = useAegis((s) => s.toggleContext);
  const [running, setRunning] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (step >= STEPS.length) {
      toggleContext(caseId, running);
      const done = window.setTimeout(() => {
        setRunning(null);
        setStep(0);
      }, 250);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), 420);
    return () => window.clearTimeout(timer);
  }, [running, step, caseId, toggleContext]);

  if (!view) return null;
  const { investigation, state, score, signals } = view;
  const checks = investigation.contextChecks;
  const reduction = score.base - score.computed;
  const withContext = new Set(checks.map((c) => c.factorId));
  const unaffected = score.factors.filter((f) => !withContext.has(f.id) && f.current > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Context check</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          The system does not blindly flag unusual numbers. It checks market, regional and procedural context, shows the arithmetic, and lets the investigator decide whether the context applies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {checks.length === 0 ? (
            <Panel>
              <EmptyState icon={Scale} title="No quantified context yet" description="No market, regional or procedural context has been matched to this case. The legitimate explanations below still need testing." />
            </Panel>
          ) : (
            checks.map((check) => {
              const factor = score.factors.find((f) => f.id === check.factorId);
              const applied = state.appliedContext.includes(check.id);
              return (
                <ContextCard
                  key={check.id}
                  check={check}
                  caseId={caseId}
                  applied={applied}
                  factorLabel={factor?.label ?? check.title}
                  factorBase={factor?.base ?? 0}
                  running={running === check.id}
                  step={step}
                  onApply={() => {
                    if (applied) toggleContext(caseId, check.id);
                    else {
                      setStep(0);
                      setRunning(check.id);
                    }
                  }}
                />
              );
            })
          )}
          <ImportantContext items={[...new Set(signals.flatMap((s) => s.alternatives))].slice(0, 8)} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-[7.5rem] xl:self-start">
          <Panel className={cn(reduction > 0 && "border-ok/35")}>
            <PanelHeader title="Why the score changed" actions={<PriorityBadge level={score.level} score={score.total} />} />
            <PanelBody className="space-y-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Original</div>
                  <div className="type-display mt-1 text-5xl tabular text-ink-2">{score.base}</div>
                </div>
                <ArrowRight aria-hidden className="h-5 w-5 text-ink-3" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">After context</div>
                  <AnimatedNumber
                    value={score.total}
                    startOnView={false}
                    className={cn("type-display mt-1 block text-5xl tabular", reduction > 0 ? "text-ok-ink" : "text-ink")}
                  />
                </div>
              </div>
              <ScoreTrack score={score} />
              {reduction > 0 ? (
                <>
                  <Badge tone="ok">Lowered priority after context</Badge>
                  <ul className="space-y-2">
                    {score.reasons.map((reason) => (
                      <li key={reason} className="text-[13px] leading-snug text-ink-2">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-ink-3">No context applied yet. Apply a check to see which part of the score it explains.</p>
              )}
              {unaffected.length > 0 && (
                <div className="border-t border-line pt-4">
                  <div className="type-label mb-2">Not explained by context</div>
                  <ul className="space-y-1.5">
                    {unaffected.map((factor) => (
                      <li key={factor.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-ink-2">{factor.label}</span>
                        <span className="tabular font-medium text-ink">+{factor.current}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs leading-snug text-ink-3">These signals still require review regardless of market conditions.</p>
                </div>
              )}
              <ScoreDisclaimer />
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
