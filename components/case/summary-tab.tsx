"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Equal, Plus, Radio, Scale } from "lucide-react";
import { SIGNAL_BY_ID } from "@/data/signals";
import { NEXT_PACKAGE_TENDER, PRIMARY_CASE } from "@/data/story";
import { TENDER_BY_ID } from "@/data/procurement";
import { formatDate, formatDateTime } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink } from "@/components/ui/button";
import { ImportantContext, ScoreDisclaimer } from "@/components/ui/notices";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OutcomeBadge, PriorityBadge } from "@/components/ui/priority";
import { ScoreBreakdown, ScoreTrack } from "@/components/charts/score-breakdown";
import { CHART } from "@/components/charts/theme";
import { SignalExplanationCard, SignalMini } from "./signal-card";

/** PRICE + AWARDS + BIDDING + RELATIONSHIP + CONTEXT = PRIORITY — the evidence layers behind one score. */
function EvidenceLayers({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId)!;
  const { score, investigation } = view;
  const reduction = score.base - score.computed;
  const hasContext = investigation.contextChecks.length > 0;

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-stretch gap-1.5">
        {score.factors.map((factor, index) => (
          <li key={factor.id} className="flex items-stretch gap-1.5">
            {index > 0 && (
              <span aria-hidden className="flex items-center text-ink-3">
                <Plus className="h-3.5 w-3.5" />
              </span>
            )}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className="flex w-[118px] flex-col justify-between rounded-[5px] border border-line bg-panel-2 px-3 py-2.5"
            >
              <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-2">{factor.label}</span>
              <span className="mt-2 flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CHART.series[index % 8] }} />
                <span className={cn("type-title tabular text-xl", factor.current !== factor.base ? "text-ok-ink" : "text-ink")}>+{factor.current}</span>
              </span>
            </motion.div>
          </li>
        ))}
        <li className="flex items-stretch gap-1.5">
          <span aria-hidden className="flex items-center text-ink-3">
            <Plus className="h-3.5 w-3.5" />
          </span>
          <div className={cn("flex w-[128px] flex-col justify-between rounded-[5px] border px-3 py-2.5", reduction > 0 ? "border-ok/40 bg-ok/[0.07]" : "border-dashed border-line-strong")}>
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-2">
              <Scale className="h-3 w-3" /> Contextual analysis
            </span>
            <span className={cn("type-title mt-2 tabular text-xl", reduction > 0 ? "text-ok-ink" : "text-ink-3")}>
              {reduction > 0 ? `−${reduction}` : hasContext ? "available" : "none"}
            </span>
          </div>
        </li>
        <li className="flex items-stretch gap-1.5">
          <span aria-hidden className="flex items-center text-ink-3">
            <Equal className="h-3.5 w-3.5" />
          </span>
          <div className="flex w-[150px] flex-col justify-between rounded-[5px] border border-risk/40 bg-risk/[0.08] px-3 py-2.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-risk-ink">Investigation priority</span>
            <span className="mt-2 flex items-baseline gap-1">
              <AnimatedNumber value={score.total} startOnView={false} className="type-display tabular text-3xl text-ink" />
              <span className="text-xs text-ink-3">/100</span>
            </span>
          </div>
        </li>
      </ol>
    </div>
  );
}

export function SummaryTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  if (!view) return null;
  const { investigation, state, score, signals } = view;
  const primary = investigation.primarySignalIds.map((id) => signals.find((s) => s.id === id) ?? SIGNAL_BY_ID.get(id)).filter(Boolean);
  const supporting = signals.filter((s) => !investigation.primarySignalIds.includes(s.id));
  const nextPackage = investigation.id === PRIMARY_CASE ? TENDER_BY_ID.get(NEXT_PACKAGE_TENDER) : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <section>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Why was this flagged?</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">{investigation.summary}</p>
          {investigation.historical && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel p-3 text-[13px] text-ink-2">
              <OutcomeBadge outcome={investigation.historical.outcome} />
              <span>{investigation.historical.note}</span>
              <span className="text-ink-3">Closed {formatDate(investigation.historical.closedOn)}</span>
            </div>
          )}
        </section>

        {score.factors.length > 1 && (
          <Panel>
            <PanelHeader
              title="Evidence layers"
              description="Independent layers of evidence combine into one investigation priority. Context can only lower it."
            />
            <PanelBody>
              <EvidenceLayers caseId={caseId} />
            </PanelBody>
          </Panel>
        )}

        {primary.length > 0 && (
          <section className="space-y-4">
            <h3 className="type-label">Primary signals · {primary.length}</h3>
            {primary.map((signal, index) => (
              <SignalExplanationCard
                key={signal!.id}
                signal={signal!}
                caseId={investigation.id}
                feedback={state.signalFeedback[signal!.id]}
                index={index}
              />
            ))}
          </section>
        )}

        {supporting.length > 0 && (
          <Panel>
            <PanelHeader title={`Supporting signals · ${supporting.length}`} description="Signals that add weight to a factor but are not the main reason the case was opened." />
            <ul className="divide-y divide-line">
              {supporting.map((signal) => (
                <SignalMini key={signal.id} signal={signal} caseId={investigation.id} feedback={state.signalFeedback[signal.id]} />
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <aside className="space-y-6 xl:sticky xl:top-[7.5rem] xl:self-start">
        <Panel>
          <PanelHeader title="Investigation priority" actions={<PriorityBadge level={score.level} score={score.total} />} />
          <PanelBody className="space-y-4">
            <ScoreTrack score={score} />
            <ScoreBreakdown score={score} compact />
            <ScoreDisclaimer />
            {investigation.contextChecks.length > 0 && (
              <ButtonLink href={`/investigations/${investigation.id}/context`} variant="secondary" size="sm" className="w-full">
                {state.appliedContext.length ? "Review applied context" : "Open context check"} <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            )}
          </PanelBody>
        </Panel>

        {nextPackage && (
          <Panel className="border-warn/30">
            <PanelBody className="flex gap-3">
              <Radio aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warn-ink" />
              <div className="text-[13px] leading-relaxed">
                <div className="font-medium text-ink">The next package in this program is open</div>
                <p className="mt-1 text-ink-2">
                  <Link href={`/procurement/${nextPackage.id}`} className="text-accent-ink hover:underline">
                    {nextPackage.title}
                  </Link>{" "}
                  closes {formatDateTime(nextPackage.bidDeadline)}. Consider a monitoring note while this review runs.
                </p>
              </div>
            </PanelBody>
          </Panel>
        )}

        <ImportantContext items={[...new Set(signals.flatMap((s) => s.alternatives))].slice(0, 6)} />
      </aside>
    </div>
  );
}
