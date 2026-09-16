"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Copy, Printer } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { BIDS_BY_TENDER, TENDER_BY_ID, comparableStats } from "@/data/procurement";
import { CATEGORY_BY_ID, CURRENT_INVESTIGATOR, DEPARTMENT_BY_ID, INVESTIGATOR_BY_ID, OUTCOME_META, REGION_BY_ID, RELATIONSHIP_TYPE_META, STATUS_META, SYNTHETIC_NOTICE } from "@/data/reference";
import { RELATIONSHIPS } from "@/data/relationships";
import { vendorName } from "@/data/vendors";
import { formatDate, formatDateTime, formatINR, formatPct, nowIST } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { buildTimeline } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { EmptyState } from "@/components/ui/states";

type TagKind = "OBSERVED" | "SIGNAL" | "INTERPRETATION" | "NOTE";

const TAG: Record<TagKind, { label: string; className: string }> = {
  OBSERVED: { label: "Observed data", className: "border-accent/40 text-accent-ink" },
  SIGNAL: { label: "Detected signal", className: "border-warn/40 text-warn-ink" },
  INTERPRETATION: { label: "Interpretation", className: "border-rel/40 text-rel-ink" },
  NOTE: { label: "Investigator note", className: "border-ok/40 text-ok-ink" },
};

function Statement({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return (
    <div className="print-break grid grid-cols-1 gap-1.5 py-2 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <span className={cn("h-fit w-fit rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", TAG[kind].className)}>
        {TAG[kind].label}
      </span>
      <div className="text-[13.5px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="print-break border-t border-line py-6">
      <h2 className="mb-2 flex items-baseline gap-3">
        <span className="font-mono text-xs text-ink-3">{String(number).padStart(2, "0")}</span>
        <span className="type-title text-[15px] uppercase tracking-[0.04em] text-ink">{title}</span>
      </h2>
      <div className="divide-y divide-line/60">{children}</div>
    </section>
  );
}

export function InvestigationBrief({ caseId, standalone }: { caseId: string; standalone?: boolean }) {
  const view = useCaseView(caseId);
  const [copied, setCopied] = useState(false);
  const generatedAt = useMemo(() => nowIST(), []);

  if (!view) {
    return <EmptyState title="Unable to load investigation record" description={`No case with id ${caseId} exists in this workspace.`} />;
  }

  const { investigation, state, score, signals } = view;
  const tender = TENDER_BY_ID.get(investigation.tenderId);
  const bids = tender ? BIDS_BY_TENDER.get(tender.id) ?? [] : [];
  const stats = tender ? comparableStats(tender) : null;
  const primary = signals.filter((s) => investigation.primarySignalIds.includes(s.id));
  const vendorIds = [investigation.vendorId, ...investigation.relatedVendorIds];
  const relationships = RELATIONSHIPS.filter((r) => r.type !== "JOINT_BIDDING" && r.vendorIds.some((id) => vendorIds.includes(id))).slice(0, 6);
  const timeline = tender ? buildTimeline(tender, investigation.timelineNotes) : [];
  const keyEvents = timeline.filter((e) => e.unusual || ["TENDER", "EVALUATION", "AWARD", "CONTRACT"].includes(e.kind)).slice(0, 10);
  const assignee = state.assigneeId ? INVESTIGATOR_BY_ID[state.assigneeId] : undefined;

  const summaryText = [
    `${investigation.id} — ${investigation.title}`,
    `Investigation priority ${score.total}/100 (${score.level.toLowerCase()})${score.total !== score.base ? `, lowered from ${score.base} after context` : ""}.`,
    ...primary.map((s) => `• ${s.headline}`),
    "This brief is decision support. It does not establish misconduct.",
  ].join("\n");

  return (
    <div className={cn(!standalone && "mx-auto max-w-4xl")}>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Investigation brief</h2>
          <p className="mt-1 text-[13px] text-ink-3">Observed data, detected signals, interpretation and investigator notes are labeled separately.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summaryText);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy summary"}
          </Button>
          <Button size="sm" variant="primary" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print or save as PDF
          </Button>
        </div>
      </div>

      <article className="print-document rounded-md border border-line bg-panel px-5 py-6 sm:px-10 sm:py-9">
        <header className="flex flex-col gap-5 border-b-2 border-line-strong pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-6" />
              <span className="text-xs font-bold tracking-[0.18em] text-ink [font-stretch:125%]">AEGIS PROCURE</span>
            </div>
            <div className="type-label mt-5">Investigation brief · decision support</div>
            <h1 className="type-display mt-2 text-[30px] uppercase leading-none text-ink sm:text-[38px]">{investigation.title}</h1>
            <div className="mt-2 font-mono text-xs text-ink-3">
              {investigation.id} · {investigation.tenderId}
            </div>
          </div>
          <dl className="grid min-w-[14rem] grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt className="text-ink-3">Priority</dt>
            <dd className="text-right font-semibold tabular text-ink">
              {score.total} / 100 {score.total !== score.base && <span className="font-normal text-ink-3">(was {score.base})</span>}
            </dd>
            <dt className="text-ink-3">Status</dt>
            <dd className="text-right text-ink">{STATUS_META[state.status].label}</dd>
            <dt className="text-ink-3">Investigator</dt>
            <dd className="text-right text-ink">{assignee?.name ?? "Unassigned"}</dd>
            <dt className="text-ink-3">Prepared by</dt>
            <dd className="text-right text-ink">{CURRENT_INVESTIGATOR.name}</dd>
            <dt className="text-ink-3">Generated</dt>
            <dd className="text-right tabular text-ink">{formatDateTime(generatedAt)} IST</dd>
          </dl>
        </header>

        <p className="mt-5 rounded-[4px] border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[13px] leading-snug text-ink">
          This brief prioritizes the case for human review. It does not determine misconduct, and interpretations below are not findings.
        </p>

        <Section number={1} title="Case summary">
          <Statement kind="OBSERVED">
            {tender ? (
              <>
                {tender.title} ({tender.id}) — {DEPARTMENT_BY_ID[investigation.departmentId].name}, {CATEGORY_BY_ID[investigation.categoryId].name}, {REGION_BY_ID[investigation.regionId].name}. Award of{" "}
                {formatINR(investigation.value)} to {vendorName(investigation.vendorId)} on {tender.awardedOn ? formatDate(tender.awardedOn) : "—"}, from {bids.length} bids.
              </>
            ) : (
              `${investigation.title} — ${formatINR(investigation.value)}.`
            )}
          </Statement>
          <Statement kind="SIGNAL">
            Investigation priority {score.total} / 100 ({score.level.toLowerCase()}), built from:{" "}
            {score.factors.map((f) => `${f.label.toLowerCase()} +${f.current}`).join(", ")}.
          </Statement>
          <Statement kind="INTERPRETATION">{investigation.summary}</Statement>
        </Section>

        <Section number={2} title="Primary signals">
          {primary.map((signal) => (
            <div key={signal.id}>
              <Statement kind="SIGNAL">
                <span className="font-medium">{signal.title}.</span> {signal.headline}{" "}
                <span className="text-ink-3">({signal.metrics.slice(0, 4).map((m) => `${m.label}: ${m.value}`).join("; ")})</span>
              </Statement>
              <Statement kind="INTERPRETATION">
                {signal.explanation} Possible legitimate explanations: {signal.alternatives.slice(0, 2).join("; ").toLowerCase()}.
              </Statement>
            </div>
          ))}
        </Section>

        <Section number={3} title="Supporting evidence">
          {investigation.evidence.slice(0, 12).map((e) => (
            <Statement key={e.id} kind="OBSERVED">
              <span className="font-mono text-xs text-ink-3">{e.recordId}</span> · {e.kind} · {e.source} · {formatDate(e.date)} — <span className="font-medium">{e.relevantValue}</span>. {e.whyItMatters}
            </Statement>
          ))}
        </Section>

        {stats && stats.count > 0 && (
          <Section number={4} title="Comparable procurement">
            <Statement kind="OBSERVED">
              {stats.count} comparable procurements: median {formatINR(stats.median)}, interquartile range {formatINR(stats.p25)} to {formatINR(stats.p75)}. This award: {formatINR(stats.current)} (
              {formatPct(stats.deviationPct, 1, true)}).
            </Statement>
            <Statement kind="INTERPRETATION">A price outside the comparable range is unusual but not improper; scope, specification and market movement change price.</Statement>
          </Section>
        )}

        <Section number={5} title="Vendor relationships">
          {relationships.length ? (
            relationships.map((r) => (
              <Statement key={r.id} kind="OBSERVED">
                {vendorName(r.vendorIds[0])} ↔ {vendorName(r.vendorIds[1])}: {RELATIONSHIP_TYPE_META[r.type].label.toLowerCase()}, {r.strength.toLowerCase()} strength, {r.evidenceCount} records ({formatDate(r.firstObserved)} – {formatDate(r.lastObserved)}).
                {r.context ? ` Context: ${r.context}` : ""}
              </Statement>
            ))
          ) : (
            <Statement kind="OBSERVED">No shared-entity relationships recorded for the vendors in this case.</Statement>
          )}
          <Statement kind="INTERPRETATION">A relationship is an investigative lead that requires verification. It is not proof of wrongdoing.</Statement>
        </Section>

        {keyEvents.length > 0 && (
          <Section number={6} title="Timeline">
            {keyEvents.map((event) => (
              <Statement key={event.id} kind={event.unusual ? "SIGNAL" : "OBSERVED"}>
                <span className="tabular">{formatDateTime(event.at)}</span> — {event.label}. {event.detail}
                {event.annotation ? ` (${event.annotation})` : ""}
              </Statement>
            ))}
          </Section>
        )}

        <Section number={7} title="Contextual factors">
          {investigation.contextChecks.length ? (
            investigation.contextChecks.map((check) => (
              <div key={check.id}>
                <Statement kind="OBSERVED">
                  {check.title}: {check.observed}. Context sources: {check.adjustments.map((a) => `${a.label} ${a.value} (${a.source})`).join("; ")}.
                </Statement>
                <Statement kind="INTERPRETATION">
                  {check.reason} {state.appliedContext.includes(check.id) ? `Applied — contribution reduced to +${check.adjustedPoints}.` : "Not applied to the priority score."}
                </Statement>
              </div>
            ))
          ) : (
            <Statement kind="INTERPRETATION">No quantified context is on file for this case.</Statement>
          )}
        </Section>

        <Section number={8} title="Investigation questions">
          {investigation.questions.map((q) => {
            const done = state.checklist.find((c) => c.text === q.text)?.done;
            return (
              <Statement key={q.id} kind="INTERPRETATION">
                {q.text} <span className="text-ink-3">— {q.rationale}</span>
                {done && <span className="ml-1 text-ok-ink">(addressed)</span>}
              </Statement>
            );
          })}
          {state.checklist
            .filter((c) => !investigation.questions.some((q) => q.text === c.text))
            .map((c) => (
              <Statement key={c.id} kind="NOTE">
                {c.text} {c.done && <span className="text-ok-ink">(addressed)</span>}
              </Statement>
            ))}
        </Section>

        <Section number={9} title="Investigator notes and status">
          {state.notes.length ? (
            state.notes.map((n) => (
              <Statement key={n.id} kind="NOTE">
                {n.text} <span className="text-ink-3">— {INVESTIGATOR_BY_ID[n.authorId]?.name}, {formatDateTime(n.createdAt)}</span>
              </Statement>
            ))
          ) : (
            <Statement kind="NOTE">No investigator notes recorded.</Statement>
          )}
          <Statement kind="NOTE">
            Status: {STATUS_META[state.status].label}.
            {state.outcome ? ` Outcome: ${OUTCOME_META[state.outcome.outcome].label}${state.outcome.note ? ` — ${state.outcome.note}` : ""}.` : " No outcome recorded yet."}
            {state.override ? ` Priority set manually to ${state.override.value}: ${state.override.reason}.` : ""}
          </Statement>
        </Section>

        <footer className="border-t-2 border-line-strong pt-4 text-[11px] leading-relaxed text-ink-3">
          Generated from records in the AEGIS PROCURE workspace. AI-assisted sections are decision support, not findings of misconduct. {SYNTHETIC_NOTICE}
        </footer>
      </article>

      <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel p-4">
        <p className="text-[13px] text-ink-2">The system doesn&apos;t decide who is guilty. It shows investigators where to look.</p>
        <ButtonLink href="/closing" variant="secondary" size="sm">
          Closing statement <ArrowUpRight className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
      {standalone && (
        <p className="no-print mt-3 text-xs text-ink-3">
          <Link href={`/investigations/${caseId}`} className="text-accent-ink hover:underline">
            Open the case
          </Link>
        </p>
      )}
    </div>
  );
}
