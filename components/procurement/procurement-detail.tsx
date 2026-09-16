"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronRight, CircleCheck, Gavel, Wallet } from "lucide-react";
import { BIDS_BY_TENDER, CONTRACT_BY_TENDER, PAYMENTS_BY_CONTRACT, TENDER_BY_ID, bidSpread, bidWindowDays, comparableStats, comparablesFor, medianComparableSpread, tendersForVendor } from "@/data/procurement";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, EVALUATION_LABEL, METHOD_LABEL, REGION_BY_ID, TENDER_STATUS_META } from "@/data/reference";
import { caseForTender } from "@/data/cases";
import { vendorName } from "@/data/vendors";
import { formatDate, formatDateTime, formatINR, formatPct, keepDashAttached } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { buildTimeline } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Stat } from "@/components/ui/misc";
import { ImportantContext, ScoreDisclaimer, SyntheticNotice } from "@/components/ui/notices";
import { KeyValue, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PriorityBadge, PriorityMeter, ScoreFigure } from "@/components/ui/priority";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { BidComparison } from "@/components/charts/bid-comparison";
import { ComparableStrip } from "@/components/charts/comparable-strip";
import { SignalExplanationCard } from "@/components/case/signal-card";
import { tenderSignals } from "./explorer";

function CaseBlock({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  if (!view) return null;
  return (
    <Panel className="border-risk/30">
      <PanelHeader title="Investigation priority" actions={<PriorityBadge level={view.score.level} />} />
      <PanelBody className="space-y-3">
        <ScoreFigure score={view.score.total} base={view.score.base} />
        <PriorityMeter score={view.score.total} />
        <ScoreDisclaimer />
        <ButtonLink href={`/investigations/${caseId}`} variant="primary" size="sm" className="w-full">
          Open {caseId} <ArrowUpRight className="h-3.5 w-3.5" />
        </ButtonLink>
      </PanelBody>
    </Panel>
  );
}

export function ProcurementDetail({ tenderId }: { tenderId: string }) {
  const saved = useAegis((s) => s.saved.PROCUREMENT.includes(tenderId));
  const toggleSaved = useAegis((s) => s.toggleSaved);
  const tender = TENDER_BY_ID.get(tenderId);

  if (!tender) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorState title="Unable to load procurement record" description={`No tender with id ${tenderId} exists in the dataset.`} />
        <ButtonLink href="/procurement" size="sm" className="mt-4">
          Back to the explorer
        </ButtonLink>
      </div>
    );
  }

  const bids = BIDS_BY_TENDER.get(tender.id) ?? [];
  const contract = CONTRACT_BY_TENDER.get(tender.id);
  const payments = contract ? PAYMENTS_BY_CONTRACT.get(contract.id) ?? [] : [];
  const signals = tenderSignals(tender.id);
  const investigation = caseForTender(tender.id);
  const stats = comparableStats(tender);
  const comparables = comparablesFor(tender);
  const spread = bidSpread(tender.id);
  const comparableSpread = medianComparableSpread(tender);
  const timeline = buildTimeline(tender, investigation?.timelineNotes);
  const otherAwards = tender.winnerVendorId ? tendersForVendor(tender.winnerVendorId).filter((t) => t.id !== tender.id && t.winnerVendorId === tender.winnerVendorId).slice(0, 5) : [];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/procurement" className="hover:text-ink">
          Procurement Explorer
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono text-ink-2">{tender.id}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label">Tender</span>
            <span className="font-mono text-xs text-ink-2">{tender.id}</span>
            <Badge tone={TENDER_STATUS_META[tender.status].tone}>{TENDER_STATUS_META[tender.status].label}</Badge>
            {signals.length > 0 && <Badge tone="risk">{signals.length} signals</Badge>}
          </div>
          <h1 className="type-display mt-3 text-[30px] uppercase text-ink sm:text-[42px]">{keepDashAttached(tender.title)}</h1>
          <SyntheticNotice compact className="mt-3" />
        </div>
        <button
          type="button"
          onClick={() => toggleSaved("PROCUREMENT", tender.id)}
          aria-pressed={saved}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-[5px] border px-3 text-[13px] font-medium",
            saved ? "border-accent/50 bg-accent/10 text-accent-ink" : "border-line-strong text-ink-2 hover:bg-panel-3",
          )}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Saved" : "Save procurement"}
        </button>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <PanelBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                <KeyValue label="Status" value={TENDER_STATUS_META[tender.status].label} />
                <KeyValue label="Contract value" value={tender.awardValue ? formatINR(tender.awardValue) : "Not awarded"} />
                <KeyValue label="Estimate" value={formatINR(tender.estimate)} />
                <KeyValue label="Department" value={DEPARTMENT_BY_ID[tender.departmentId].name} />
                <KeyValue label="Location" value={`${tender.location}${tender.zone ? ` · ${tender.zone}` : ""}, ${REGION_BY_ID[tender.regionId].name}`} />
                <KeyValue label="Award date" value={tender.awardedOn ? formatDate(tender.awardedOn) : "—"} />
                <KeyValue
                  label="Winning vendor"
                  value={
                    tender.winnerVendorId ? (
                      <Link href={`/vendors/${tender.winnerVendorId}`} className="text-accent-ink hover:underline">
                        {vendorName(tender.winnerVendorId)}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <KeyValue label="Category" value={CATEGORY_BY_ID[tender.categoryId].name} />
                <KeyValue label="Method" value={METHOD_LABEL[tender.method]} />
                <KeyValue label="Evaluation" value={EVALUATION_LABEL[tender.evaluation]} />
                <KeyValue label="Bid window" value={`${bidWindowDays(tender)} days`} />
                <KeyValue label="Published" value={formatDate(tender.publishedOn)} />
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-[13px] text-ink-2">
                <span className="text-ink-3">Scope · </span>
                {tender.scope}
              </p>
            </PanelBody>
          </Panel>

          <section>
            <h2 className="type-display mb-4 text-[26px] uppercase text-ink">Why this matters</h2>
            {signals.length ? (
              <div className="space-y-4">
                {signals.map((signal, index) => (
                  <SignalExplanationCard key={signal.id} signal={signal} caseId={signal.caseId ?? investigation?.id ?? ""} index={index} />
                ))}
                <ImportantContext />
              </div>
            ) : (
              <Panel>
                <PanelBody className="flex items-start gap-3">
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok-ink" />
                  <div>
                    <div className="text-[14px] font-medium text-ink">No signals on this procurement</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                      Price, bidding and timing measurements sit within the ranges of comparable procurements. Absence of a signal is not a clearance; it means nothing here stands out against the data available.
                    </p>
                  </div>
                </PanelBody>
              </Panel>
            )}
          </section>

          {bids.length > 0 && (
            <Panel id="bids" className="scroll-mt-24">
              <PanelHeader title="Bid analysis" icon={<Gavel className="h-3.5 w-3.5" />} />
              <PanelBody className="space-y-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Bids" value={bids.length} />
                  <Stat label="Bid spread" value={spread != null ? `${spread.toFixed(2)}%` : "—"} />
                  <Stat label="Comparable spread" value={comparableSpread != null ? `${comparableSpread.toFixed(1)}%` : "—"} />
                  <Stat label="Market benchmark" value={stats.count ? formatINR(stats.median) : "—"} />
                </div>
                <BidComparison tender={tender} bids={bids} benchmark={stats.count ? stats.median : undefined} />
              </PanelBody>
            </Panel>
          )}

          {tender.awardValue != null && (
            <Panel id="comparables" className="scroll-mt-24">
              <PanelHeader title="Compare with similar procurement" description={`${stats.count} awarded procurements in the same category, closest in size, within 18 months.`} />
              <PanelBody className="space-y-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <Stat label="Current contract" value={formatINR(stats.current)} tone="risk" />
                  <Stat label="Comparable median" value={formatINR(stats.median)} />
                  <Stat label="P25" value={formatINR(stats.p25)} />
                  <Stat label="P75" value={formatINR(stats.p75)} />
                  <Stat label="Deviation" value={formatPct(stats.deviationPct, 1, true)} />
                </div>
                {stats.count ? <ComparableStrip stats={stats} comparables={comparables} /> : <EmptyState title="No comparable procurements" />}
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Procurement timeline" />
            <ol className="divide-y divide-line">
              {timeline.map((event) => (
                <li key={event.id} className={cn("grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[9rem_1fr_auto]", event.unusual && "bg-risk/[0.04]")}>
                  <span className="text-xs tabular text-ink-3">{formatDateTime(event.at)}</span>
                  <span className="min-w-0 text-[13px]">
                    <span className={cn("font-medium", event.unusual ? "text-risk-ink" : "text-ink")}>{event.label}</span>
                    <span className="block text-xs text-ink-3">{event.annotation ?? event.detail}</span>
                  </span>
                  {event.recordId && <RecordChip id={event.recordId} className="hidden sm:inline-flex" />}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside className="space-y-6">
          {investigation && <CaseBlock caseId={investigation.id} />}

          {contract && (
            <Panel>
              <PanelHeader title="Contract & payments" icon={<Wallet className="h-3.5 w-3.5" />} />
              <PanelBody className="space-y-4">
                <dl className="grid grid-cols-2 gap-4">
                  <KeyValue label="Contract" value={<RecordChip id={contract.id} link={false} />} />
                  <KeyValue label="Signed" value={formatDate(contract.signedOn)} />
                  <KeyValue label="Term ends" value={formatDate(contract.endOn)} />
                  <KeyValue label="Paid to date" value={formatINR(contract.paidToDate)} />
                </dl>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-ink-3">
                    <span>Progress {Math.round(contract.progress * 100)}%</span>
                    <span>Paid {Math.round((contract.paidToDate / contract.value) * 100)}%</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-panel-3">
                    <div className="absolute inset-y-0 left-0 bg-ok/60" style={{ width: `${contract.progress * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 border-r-2 border-ink" style={{ width: `${Math.min(100, (contract.paidToDate / contract.value) * 100)}%` }} />
                  </div>
                </div>
                {payments.length > 0 ? (
                  <ul className="space-y-1.5">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className={cn("tabular", p.flagged ? "text-risk-ink" : "text-ink-3")}>
                          {formatDate(p.paidOn)} · {p.type.replace("_", " ").toLowerCase()}
                          {!p.milestoneCertified && " · uncertified"}
                        </span>
                        <span className="tabular text-ink-2">{formatINR(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-3">No payments released yet.</p>
                )}
              </PanelBody>
            </Panel>
          )}

          {otherAwards.length > 0 && (
            <Panel>
              <PanelHeader title={`Other awards to ${vendorName(tender.winnerVendorId!)}`} />
              <ul className="divide-y divide-line">
                {otherAwards.map((t) => (
                  <li key={t.id}>
                    <Link href={`/procurement/${t.id}`} className="block px-4 py-2.5 hover:bg-panel-2">
                      <div className="truncate text-[13px] text-ink">{t.title}</div>
                      <div className="text-xs tabular text-ink-3">
                        {t.id} · {formatINR(t.awardValue ?? 0)} · {t.awardedOn ? formatDate(t.awardedOn) : ""}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
