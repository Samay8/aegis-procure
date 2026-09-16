"use client";

import { Gavel, Info, Radio } from "lucide-react";
import { useMemo } from "react";
import { BIDS_BY_TENDER, TENDERS, TENDER_BY_ID, bidSpread, comparableStats, comparablesFor, medianComparableSpread } from "@/data/procurement";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, EVALUATION_LABEL, REGION_BY_ID } from "@/data/reference";
import { ATTRIBUTE_RELATIONSHIPS } from "@/data/relationships";
import { vendorName } from "@/data/vendors";
import { formatDate, formatDateTime, formatINR, formatPct, minuteNumber } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Tender } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/misc";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { BidComparison } from "@/components/charts/bid-comparison";
import { ComparableStrip } from "@/components/charts/comparable-strip";
import { ParticipationMatrix } from "@/components/charts/participation-matrix";
import { CHART } from "@/components/charts/theme";

function SubmissionStrip({ tender }: { tender: Tender }) {
  const bids = [...(BIDS_BY_TENDER.get(tender.id) ?? [])].sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1));
  if (bids.length < 2) return null;
  const start = minuteNumber(`${tender.publishedOn}T10:00`);
  const end = minuteNumber(tender.bidDeadline);
  const pos = (iso: string) => Math.max(0, Math.min(100, ((minuteNumber(iso) - start) / Math.max(1, end - start)) * 100));
  const close = bids
    .slice(1)
    .map((bid, i) => ({ a: bids[i], b: bid, gap: minuteNumber(bid.submittedAt) - minuteNumber(bids[i].submittedAt) }))
    .filter((pair) => pair.gap <= 60);

  return (
    <div>
      <div className="relative mx-2 mb-12 mt-10 h-px bg-line-strong">
        <span className="absolute -top-6 left-0 whitespace-nowrap text-[11px] text-ink-3">Published {formatDate(tender.publishedOn)}</span>
        <span className="absolute -top-6 right-0 whitespace-nowrap text-right text-[11px] text-ink-3">Deadline {formatDateTime(tender.bidDeadline)}</span>
        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-ink-3" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-ink-3" />
        {bids.map((bid, index) => {
          const inClose = close.some((c) => c.a.id === bid.id || c.b.id === bid.id);
          const at = pos(bid.submittedAt);
          const align = at > 78 ? "right-0 text-right" : at < 22 ? "left-0 text-left" : "left-1/2 -translate-x-1/2 text-center";
          return (
            <div key={bid.id} className="absolute top-0" style={{ left: `${at}%` }}>
              <span className={cn("absolute -top-[5px] left-0 h-[10px] w-[10px] -translate-x-1/2 rounded-full border-2 border-panel", inClose ? "bg-warn" : "bg-series-1")} />
              <span className={cn("absolute w-24 text-[10.5px] leading-tight text-ink-2", align, index % 2 ? "top-3" : "top-7")}>
                {vendorName(bid.vendorId).split(" ")[0]}
                <span className="block tabular text-ink-3">{formatDateTime(bid.submittedAt).slice(0, 6)} {bid.submittedAt.slice(11)}</span>
              </span>
            </div>
          );
        })}
      </div>
      {close.map((pair) => (
        <p key={pair.b.id} className="flex items-center gap-2 text-[13px] text-warn-ink">
          <Radio aria-hidden className="h-3.5 w-3.5" />
          {vendorName(pair.a.vendorId)} and {vendorName(pair.b.vendorId)} submitted {pair.gap} minutes apart.
        </p>
      ))}
    </div>
  );
}

export function BidsTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const tender = view?.investigation.tenderId ? TENDER_BY_ID.get(view.investigation.tenderId) : undefined;

  const related = useMemo(() => {
    if (!tender) return [] as Tender[];
    const bidders = new Set((BIDS_BY_TENDER.get(tender.id) ?? []).map((b) => b.vendorId));
    if (bidders.size < 2) return [];
    return TENDERS.filter((t) => {
      const others = (BIDS_BY_TENDER.get(t.id) ?? []).map((b) => b.vendorId);
      return others.filter((v) => bidders.has(v)).length >= Math.min(bidders.size, Math.max(2, bidders.size - 1));
    })
      .filter((t) => t.status !== "OPEN")
      .slice(0, 12);
  }, [tender]);

  if (!view) return null;
  if (!tender) {
    return (
      <Panel>
        <EmptyState icon={Gavel} title="No bid records" description="This case is not linked to a tender with bid records." />
      </Panel>
    );
  }

  const { investigation, state, signals } = view;
  const bids = BIDS_BY_TENDER.get(tender.id) ?? [];
  const stats = comparableStats(tender);
  const comparables = comparablesFor(tender);
  const spread = bidSpread(tender.id);
  const comparableSpread = medianComparableSpread(tender);
  const closeSignal = signals.find((s) => s.type === "CLOSE_BIDS");
  const priceContext = investigation.contextChecks.find((c) => c.factorId === "F-PRICE");
  const adjustedPct = priceContext && state.appliedContext.includes(priceContext.id) ? priceContext.adjustedValue : null;
  const linkedVendors = ATTRIBUTE_RELATIONSHIPS.filter((r) => r.verification === "REQUIRES_VERIFICATION")
    .flatMap((r) => r.vendorIds)
    .filter((id) => bids.some((b) => b.vendorId === id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Bid analysis</h2>
        <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
          {bids.length} bids on {tender.title}. Evaluation by {EVALUATION_LABEL[tender.evaluation].toLowerCase()}
          {tender.evaluation === "QCBS" ? ", weighting technical 70 and financial 30 — so the lowest price does not automatically win." : "."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-line bg-panel p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Bid spread" value={spread != null ? `${spread.toFixed(2)}%` : "—"} tone={spread != null && comparableSpread != null && spread < comparableSpread / 2 ? "warn" : undefined} />
        <Stat label="Comparable median spread" value={comparableSpread != null ? `${comparableSpread.toFixed(1)}%` : "—"} />
        <Stat label="Market benchmark" value={formatINR(stats.median)} hint="Comparable median" />
        <Stat label="Comparable contracts" value={stats.count} />
        <Stat label="Departmental estimate" value={formatINR(tender.estimate)} />
        <Stat label="Winning bid" value={tender.awardValue ? formatINR(tender.awardValue) : "—"} tone="risk" />
      </div>

      <Panel>
        <PanelHeader title="Bid comparison" description="Bars start at zero; the zoomed view states its axis start." icon={<Gavel className="h-3.5 w-3.5" />} />
        <PanelBody>
          {bids.length ? (
            <BidComparison tender={tender} bids={bids} benchmark={stats.median} highlightVendorIds={[...new Set(linkedVendors)].filter((id) => id !== tender.winnerVendorId)} />
          ) : (
            <EmptyState icon={Gavel} title="No bids recorded" />
          )}
        </PanelBody>
      </Panel>

      {(closeSignal || (spread != null && comparableSpread != null)) && (
        <div className={cn("rounded-md border p-4", closeSignal ? "border-warn/35 bg-warn/[0.06]" : "border-line bg-panel")}>
          <div className="type-label !text-warn-ink">Signal</div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {closeSignal ? "Multiple bids are unusually close relative to comparable procurements." : `Bid spread of ${spread!.toFixed(2)}% against a comparable median of ${comparableSpread!.toFixed(1)}%.`}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            This pattern may warrant further review of bidder relationships and participation history. It does not, on its own, show that bidders coordinated.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {tender.evaluation === "QCBS" && bids.length > 1 && (
          <Panel>
            <PanelHeader title="Quality-cum-cost evaluation" description="Combined score = 0.7 × technical + 0.3 × financial (lowest bid ÷ bid × 100)." />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 text-right font-medium">Bid</th>
                    <th className="px-4 py-2.5 text-right font-medium">Technical</th>
                    <th className="px-4 py-2.5 text-right font-medium">Financial</th>
                    <th className="px-4 py-2.5 text-right font-medium">Combined</th>
                    <th className="px-4 py-2.5 text-right font-medium">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {[...bids]
                    .sort((a, b) => a.rank - b.rank)
                    .map((bid) => (
                      <tr key={bid.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 text-ink">
                          {vendorName(bid.vendorId)} {bid.outcome === "WON" && <Badge tone="risk" className="ml-1">Winner</Badge>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{formatINR(bid.amount)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{bid.technicalScore}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{bid.financialScore?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular text-ink">{bid.combinedScore?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{bid.rank}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs leading-snug text-ink-3">
              <Info aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
              The winner was not the lowest financial bid; the technical score decided the award. Reviewing how technical marks were assigned is a legitimate line of inquiry either way.
            </p>
          </Panel>
        )}

        <Panel>
          <PanelHeader title="Submission timing" description="When each bid arrived between publication and the deadline." />
          <PanelBody>
            <SubmissionStrip tender={tender} />
          </PanelBody>
        </Panel>
      </div>

      <Panel id="comparables" className="scroll-mt-32">
        <PanelHeader
          title="Compare with similar procurement"
          description="How unusual is this price? Each dot is an awarded procurement matched on category, size, period and department."
        />
        <PanelBody className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {[
              `Category · ${CATEGORY_BY_ID[tender.categoryId].name}`,
              `Region · ${REGION_BY_ID[tender.regionId].short}${tender.comparableIds ? " + all regions (adjusted separately)" : ""}`,
              `Value · closest ${stats.count} by size`,
              "Date · ±18 months",
              `Department · ${DEPARTMENT_BY_ID[tender.departmentId].short}`,
              `Contract size · ${formatINR(stats.min)} – ${formatINR(stats.max)}`,
            ].map((chip) => (
              <Badge key={chip} tone="neutral" className="normal-case tracking-normal">
                {chip}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Current contract" value={formatINR(stats.current)} tone="risk" />
            <Stat label="Comparable median" value={formatINR(stats.median)} />
            <Stat label="P25" value={formatINR(stats.p25)} />
            <Stat label="P75" value={formatINR(stats.p75)} />
            <Stat
              label="Deviation"
              value={formatPct(stats.deviationPct, 1, true)}
              hint={adjustedPct != null ? `${formatPct(adjustedPct, 1, true)} after context` : priceContext ? "Context available" : undefined}
            />
          </div>

          {stats.count ? (
            <ComparableStrip stats={stats} comparables={comparables} current={tender} adjustedPct={adjustedPct} />
          ) : (
            <EmptyState title="No comparable procurements" description="Not enough awarded procurements match this category and size band." />
          )}
          <p className="text-xs text-ink-3">
            <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: CHART.series[0] }} /> Comparable award ·{" "}
            <span className="inline-block h-2 w-3 align-middle" style={{ background: "rgba(77,142,247,0.2)" }} /> Interquartile range ·{" "}
            <span className="inline-block h-2 w-2 rotate-45 align-middle" style={{ background: CHART.risk }} /> This contract
          </p>
        </PanelBody>
      </Panel>

      {related.length >= 3 && (
        <Panel>
          <PanelHeader
            title="Participation history"
            description="Tenders where the same bidders met. A repeating winner order reads as a staircase."
          />
          <PanelBody>
            <ParticipationMatrix tenders={related} focusTenderId={tender.id} />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
