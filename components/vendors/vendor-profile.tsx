"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronRight, GitCompareArrows, Network } from "lucide-react";
import { useMemo } from "react";
import { vendorProfile } from "@/data/analytics";
import { casesForVendor } from "@/data/cases";
import { BIDS_BY_VENDOR, CONTRACT_BY_TENDER, TENDER_BY_ID } from "@/data/procurement";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, REGION_BY_ID, RELATIONSHIP_TYPE_META } from "@/data/reference";
import { relationshipBetween, relationshipsForVendor } from "@/data/relationships";
import { signalsForVendor } from "@/data/signals";
import { VENDOR_BY_ID, vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Stat } from "@/components/ui/misc";
import { SyntheticNotice } from "@/components/ui/notices";
import { KeyValue, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { BarList } from "@/components/charts/bar-list";
import { SimpleBars, SimpleLines } from "@/components/charts/series-charts";
import { CHART, rampColor } from "@/components/charts/theme";
import { STRENGTH_TONE } from "@/components/network/intel-panel";
import { SignalRow } from "@/components/signals/signal-list";

export function VendorProfile({ vendorId }: { vendorId: string }) {
  const vendor = VENDOR_BY_ID[vendorId];
  const saved = useAegis((s) => s.saved.VENDOR.includes(vendorId));
  const toggleSaved = useAegis((s) => s.toggleSaved);
  const setCompare = useAegis((s) => s.setCompare);
  const profile = useMemo(() => (vendor ? vendorProfile(vendorId) : null), [vendor, vendorId]);

  if (!vendor || !profile) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorState title="Unable to load vendor record" description={`No vendor with id ${vendorId} exists in the registry.`} />
        <ButtonLink href="/vendors" size="sm" className="mt-4">
          Back to vendors
        </ButtonLink>
      </div>
    );
  }

  const signals = signalsForVendor(vendorId);
  const relationships = relationshipsForVendor(vendorId);
  const cases = casesForVendor(vendorId);
  const bids = [...(BIDS_BY_VENDOR.get(vendorId) ?? [])].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  const maxMonthly = Math.max(1, ...profile.monthly.map((m) => m.bids));

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/vendors" className="hover:text-ink">
          Vendors
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono text-ink-2">{vendor.id}</span>
      </nav>

      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label">Vendor intelligence</span>
            <Badge tone={vendor.verification === "VERIFIED" ? "ok" : vendor.verification === "PENDING_RENEWAL" ? "warn" : "neutral"}>
              {vendor.verification.replace("_", " ")}
            </Badge>
            {signals.length > 0 && <Badge tone="risk">{signals.length} investigation signals</Badge>}
          </div>
          <h1 className="type-display mt-3 text-[30px] uppercase text-ink sm:text-[44px]">{vendor.name}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] md:grid-cols-4">
            <KeyValue label="Vendor id" value={vendor.id} mono />
            <KeyValue label="Registration" value={vendor.registrationNo} mono />
            <KeyValue label="GSTIN" value={vendor.gstin} mono />
            <KeyValue label="Registered since" value={formatDate(vendor.registeredOn)} />
            <KeyValue label="Class" value={vendor.classLabel} />
            <KeyValue label="Legal form" value={vendor.legalForm} />
            <KeyValue label="Directors" value={vendor.directors.join(", ")} />
            <KeyValue label="Categories" value={vendor.categories.map((c) => CATEGORY_BY_ID[c].short).join(", ")} />
          </dl>
          <p className="mt-3 text-[13px] text-ink-3">{vendor.address}</p>
          <SyntheticNotice compact className="mt-2" />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleSaved("VENDOR", vendor.id)}
            aria-pressed={saved}
            className={cn("flex h-9 items-center gap-2 rounded-[5px] border px-3 text-[13px] font-medium", saved ? "border-accent/50 bg-accent/10 text-accent-ink" : "border-line-strong text-ink-2 hover:bg-panel-3")}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? "Bookmarked" : "Bookmark vendor"}
          </button>
          <ButtonLink href="/vendors/compare" onClick={() => setCompare({ a: vendor.id })}>
            <GitCompareArrows className="h-4 w-4" /> Compare
          </ButtonLink>
          <ButtonLink href={`/relationships?focus=${vendor.id}`}>
            <Network className="h-4 w-4" /> Network
          </ButtonLink>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-line bg-panel p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Procurements" value={profile.participations} hint={`${profile.cancelled} cancelled · ${profile.participations - profile.concluded - profile.cancelled} pending`} />
        <Stat label="Contracts" value={formatINR(profile.contractValue)} hint={`${profile.wins} awards`} />
        <Stat label="Win rate" value={`${Math.round(profile.winRate)}%`} hint={`${profile.wins} of ${profile.concluded} concluded`} />
        <Stat label="Departments" value={profile.departments.length} />
        <Stat label="Regions" value={profile.regions.length} hint={profile.regions.map((r) => REGION_BY_ID[r].short).join(", ")} />
        <Stat label="Investigation signals" value={signals.length} tone={signals.length ? "risk" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Award history" description="Bids submitted per quarter, and how many of those bids won." />
          <PanelBody>
            <SimpleBars
              data={profile.quarterly}
              xKey="quarter"
              series={[
                { key: "bids", name: "Bids", color: CHART.series[0] },
                { key: "awards", name: "Awards", color: CHART.series[1] },
              ]}
              height={220}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Contract value over time" description="Value awarded per quarter, ₹ Cr." />
          <PanelBody>
            <SimpleBars data={profile.quarterly} xKey="quarter" series={[{ key: "valueCr", name: "₹ Cr awarded", color: CHART.series[2] }]} height={220} valueFormatter={(v) => `₹${v.toFixed(2)} Cr`} />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Win rate" description="Awards ÷ bids per quarter. Gaps are quarters without bids." />
          <PanelBody>
            <SimpleLines data={profile.quarterly} xKey="quarter" series={[{ key: "winRate", name: "Win rate", color: CHART.series[0] }]} height={220} yDomain={[0, 100]} valueFormatter={(v) => `${Math.round(v)}%`} />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Department distribution" description="Contract value by awarding department." />
          <PanelBody>
            {profile.departmentMix.length ? (
              <BarList
                items={profile.departmentMix.map((d) => ({
                  id: d.departmentId,
                  label: DEPARTMENT_BY_ID[d.departmentId].short,
                  sublabel: `${d.contracts} contracts`,
                  value: d.value,
                  display: formatINR(d.value),
                }))}
              />
            ) : (
              <EmptyState title="No awards" description="This vendor has not won a contract in the analysis window." className="py-8" />
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Participation frequency" description="Bids submitted per month, April 2024 – September 2026." />
        <PanelBody>
          <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]" role="img" aria-label="Monthly participation heat strip">
            {profile.monthly.map((m) => (
              <div
                key={m.month}
                title={`${formatMonthShort(m.month)}: ${m.bids} bids`}
                className="aspect-square rounded-[2px]"
                style={{ background: m.bids ? rampColor(CHART.series[0], 0.25 + (m.bids / maxMonthly) * 0.75) : "#1d232a" }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular text-ink-3">
            <span>Apr ’24</span>
            <span>Apr ’25</span>
            <span>Sep ’26</span>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Investigation signals" description="Signals naming this vendor. Each is a lead for review, not a finding." />
          {signals.length ? (
            <div className="px-1 py-1">
              {signals.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <EmptyState title="No signals" description="No open signals name this vendor." className="py-10" />
          )}
          {cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-xs text-ink-3">
              Cases:
              {cases.map((c) => (
                <RecordChip key={c.id} id={c.id} />
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Relationships" />
            {relationships.length ? (
              <ul className="divide-y divide-line">
                {relationships.slice(0, 8).map((rel) => {
                  const other = rel.vendorIds[0] === vendorId ? rel.vendorIds[1] : rel.vendorIds[0];
                  return (
                    <li key={rel.id}>
                      <Link href={`/relationships?relationship=${rel.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-panel-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] text-ink">{vendorName(other)}</span>
                          <span className="block text-[11px] text-ink-3">
                            {RELATIONSHIP_TYPE_META[rel.type].label} · {rel.evidenceCount} records · since {formatDate(rel.firstObserved)}
                          </span>
                        </span>
                        <Badge tone={STRENGTH_TONE[rel.strength]}>{rel.strength.toLowerCase()}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Network} title="No vendor relationships" description="No shared entities or repeated joint participation recorded." className="py-8" />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Frequent co-bidders" description="Vendors that bid in the same tenders." />
            <ul className="divide-y divide-line">
              {profile.coBidders.map((co) => {
                const linked = relationshipBetween(vendorId, co.vendorId).some((r) => r.type !== "JOINT_BIDDING" && r.type !== "REPEATED_PARTICIPATION");
                return (
                  <li key={co.vendorId} className="flex items-center justify-between gap-3 px-4 py-2">
                    <Link href={`/vendors/${co.vendorId}`} className="truncate text-[13px] text-ink-2 hover:text-ink">
                      {vendorName(co.vendorId)}
                    </Link>
                    <span className="flex items-center gap-2 text-xs tabular text-ink-3">
                      {linked && <Badge tone="rel">Linked</Badge>}
                      {co.count} tenders
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Procurement history" description={`${profile.participations} tenders, most recent first.`} />
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="sticky top-0 border-b border-line bg-panel text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tender</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 text-right font-medium">Bid</th>
                <th className="px-4 py-2.5 font-medium">Outcome</th>
                <th className="px-4 py-2.5 text-right font-medium">Contract</th>
                <th className="px-4 py-2.5 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => {
                const tender = TENDER_BY_ID.get(bid.tenderId)!;
                const contract = CONTRACT_BY_TENDER.get(bid.tenderId);
                return (
                  <tr key={bid.id} className="border-b border-line last:border-0 hover:bg-panel-2">
                    <td className="px-4 py-2">
                      <Link href={`/procurement/${tender.id}`} className="text-ink hover:text-accent-ink">
                        {tender.title}
                      </Link>
                      <div className="font-mono text-[11px] text-ink-3">{tender.id}</div>
                    </td>
                    <td className="px-4 py-2 text-ink-2">{DEPARTMENT_BY_ID[tender.departmentId].short}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular text-ink-2">{formatINR(bid.amount)}</td>
                    <td className="px-4 py-2">
                      <Badge tone={bid.outcome === "WON" ? "ok" : bid.outcome === "CANCELLED" ? "warn" : bid.outcome === "PENDING" ? "accent" : "neutral"}>
                        {bid.outcome.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular text-ink">{bid.outcome === "WON" && contract ? formatINR(contract.value) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular text-ink-3">{formatDate(bid.submittedAt.slice(0, 10))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
