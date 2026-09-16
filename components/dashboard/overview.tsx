"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Database, FolderKanban, Gauge, Radar, Waypoints } from "lucide-react";
import { useMemo, useState } from "react";
import { PLATFORM, SIGNAL_ARCHIVE, SIGNAL_TREND } from "@/data/analytics";
import { DATA_QUALITY, DATA_SOURCES } from "@/data/platform";
import { formatCr, formatDateTime } from "@/lib/format";
import { ACTIVE_STATUSES, CURRENT_INVESTIGATOR, LAST_ANALYSIS_AT, PRIORITY_META, SIGNAL_CATEGORY_ORDER, SYNTHETIC_NOTICE } from "@/data/reference";
import { CLUSTER_VENDORS } from "@/data/story";
import { vendorName } from "@/data/vendors";
import { useCaseViews, useSignalViews } from "@/lib/hooks";
import { getNetwork } from "@/lib/network";
import { useAegis } from "@/store/aegis";
import type { PriorityLevel, SignalCategory } from "@/types";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge, TONE_FILL } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Meter } from "@/components/ui/misc";
import { ScoreDisclaimer, SyntheticNotice } from "@/components/ui/notices";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PRIORITY_TONE, PriorityBadge, StatusBadge } from "@/components/ui/priority";
import { AnomalyRadar } from "@/components/charts/radar";
import { ScoreTrack } from "@/components/charts/score-breakdown";
import { TrendArea } from "@/components/charts/series-charts";
import { CHART } from "@/components/charts/theme";
import { QueueTable } from "@/components/investigations/queue-table";
import { NetworkGraphView } from "@/components/network/network-graph";
import { SignalRow } from "@/components/signals/signal-list";

export function Overview() {
  const cases = useCaseViews();
  const signalViews = useSignalViews();
  const setRadarCategory = useAegis((s) => s.setRadarCategory);
  const graph = useMemo(() => getNetwork(), []);
  const [networkSelection, setNetworkSelection] = useState<string | null>(null);

  const active = useMemo(
    () => cases.filter((c) => ACTIVE_STATUSES.includes(c.state.status)).sort((a, b) => b.score.total - a.score.total),
    [cases],
  );
  const openSignals = useMemo(() => signalViews.filter((v) => !v.review).map((v) => v.signal), [signalViews]);
  const top = active[0];

  const categoryCounts = SIGNAL_CATEGORY_ORDER.map((category) => ({
    category,
    count: openSignals.filter((s) => s.category === category).length,
  }));

  const distribution = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as PriorityLevel[]).map((level) => ({
    level,
    signals: openSignals.filter((s) => s.severity === level).length,
    cases: active.filter((c) => c.score.level === level).length,
  }));

  const recent = [...openSignals]
    .sort((a, b) => (a.detectedOn === b.detectedOn ? b.strength - a.strength : a.detectedOn < b.detectedOn ? 1 : -1))
    .slice(0, 6);

  const contextLowered = cases.filter((c) => c.state.appliedContext.length > 0).length;

  const clusterIds = useMemo(() => {
    const ids = new Set<string>(CLUSTER_VENDORS);
    for (const edge of graph.edges) {
      if (CLUSTER_VENDORS.includes(edge.source) && edge.type !== "ISSUED_BY") ids.add(edge.target);
      if (CLUSTER_VENDORS.includes(edge.target) && edge.type !== "ISSUED_BY") ids.add(edge.source);
    }
    return ids;
  }, [graph]);

  return (
    <div className="space-y-6">
      {/* Headline */}
      <section className="relative overflow-hidden rounded-md border border-line bg-panel bg-grid">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(77,142,247,0.10),transparent_55%)]" aria-hidden />
        <div className="relative px-5 pb-6 pt-5 sm:px-7 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <span className="type-label !text-ink-2">Procurement Intelligence Center</span>
              <span aria-hidden>·</span>
              <span>Last analysis {formatDateTime(LAST_ANALYSIS_AT)} IST</span>
            </div>
            <SyntheticNotice compact />
          </div>

          <h1 className="type-display mt-5 text-[34px] uppercase leading-[0.95] text-ink sm:text-[52px] xl:text-[60px]">
            <AnimatedNumber value={PLATFORM.events} className="tabular" /> procurement events.
            <span className="block text-ink-2">
              <AnimatedNumber value={openSignals.length} className="text-risk-ink" /> need human attention.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Good morning, {CURRENT_INVESTIGATOR.name}. Every signal below is ranked by investigation priority and traced to the records behind it. Nothing here is a finding.
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Records analyzed", value: <AnimatedNumber value={PLATFORM.events} /> },
              { label: "Value analyzed", value: <AnimatedNumber value={PLATFORM.value / 1e7} format={(n) => `₹${n.toFixed(1)} Cr`} /> },
              { label: "Vendors", value: <AnimatedNumber value={PLATFORM.vendors} /> },
              { label: "Contracts", value: <AnimatedNumber value={PLATFORM.contracts} /> },
              { label: "Priority signals", value: <AnimatedNumber value={openSignals.length} />, tone: "text-risk-ink" },
              { label: "Active investigations", value: <AnimatedNumber value={active.length} />, tone: "text-accent-ink" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{item.label}</dt>
                <dd className={`type-title mt-1 text-2xl ${item.tone ?? "text-ink"}`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Top priority case */}
        {top && (
          <Panel className="flex flex-col">
            <PanelHeader
              title="Highest investigation priority"
              icon={<Gauge className="h-3.5 w-3.5" />}
              actions={<StatusBadge status={top.state.status} />}
            />
            <PanelBody className="flex flex-1 flex-col gap-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-ink-3">{top.investigation.id}</div>
                  <h2 className="type-title mt-1 text-2xl text-ink">{top.investigation.title}</h2>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    {vendorName(top.investigation.vendorId)} · {formatCr(top.investigation.value)} · {top.investigation.signalIds.length} signals · {top.investigation.evidence.length} evidence records
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <PriorityBadge level={top.score.level} />
                  <div className="mt-2 flex items-baseline gap-1.5 sm:justify-end">
                    <AnimatedNumber value={top.score.total} startOnView={false} className={`type-display text-6xl tabular ${top.score.level === "MEDIUM" ? "text-warn-ink" : "text-risk-ink"}`} />
                    <span className="text-sm text-ink-3">/ 100</span>
                  </div>
                </div>
              </div>
              <ScoreTrack score={top.score} />
              <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {top.score.factors.map((factor, index) => (
                  <li key={factor.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2 text-ink-2">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: CHART.series[index % 8] }} />
                      <span className="truncate">{factor.label}</span>
                    </span>
                    <span className="tabular font-medium text-ink">
                      +{factor.current}
                      {factor.current !== factor.base && <span className="ml-1 text-xs text-ink-3 line-through">{factor.base}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <ScoreDisclaimer />
              <div className="mt-auto flex flex-wrap gap-2">
                <ButtonLink href={`/investigations/${top.investigation.id}`} variant="primary">
                  Open investigation <ArrowUpRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href={`/investigations/${top.investigation.id}/evidence`}>View evidence</ButtonLink>
              </div>
            </PanelBody>
          </Panel>
        )}

        {/* Radar */}
        <Panel>
          <PanelHeader
            title="Anomaly radar"
            icon={<Radar className="h-3.5 w-3.5" />}
            description="Open signals by category. Select a category to open the filtered queue."
            actions={
              <ButtonLink href="/radar" size="xs" variant="ghost">
                Full radar <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          <PanelBody className="pt-2">
            <RadarLink data={categoryCounts} onPick={setRadarCategory} />
          </PanelBody>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Investigation queue"
            icon={<FolderKanban className="h-3.5 w-3.5" />}
            description="Active cases ordered by current priority, after context and investigator feedback."
            actions={
              <ButtonLink href="/investigations" size="xs" variant="ghost">
                All {active.length} cases <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          <QueueTable rows={active.slice(0, 6)} compact />
        </Panel>

        <Panel>
          <PanelHeader title="Investigation priority distribution" description="Open signals and active cases per priority band." />
          <PanelBody className="space-y-4">
            {distribution.map((row) => {
              const max = Math.max(...distribution.map((d) => d.signals), 1);
              return (
                <div key={row.level}>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <PriorityBadge level={row.level} label={false} />
                    <span className="text-ink-3">
                      <span className="font-semibold tabular text-ink">{row.signals}</span> signals · <span className="tabular text-ink-2">{row.cases}</span> cases
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-[2px] bg-panel-3">
                    <div className={`h-full rounded-r-[4px] ${TONE_FILL[PRIORITY_TONE[row.level]]}`} style={{ width: `${(row.signals / max) * 100}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-ink-3">Band {PRIORITY_META[row.level].band}</div>
                </div>
              );
            })}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Anomaly trend"
            description="Signals raised each month, and how many reviews closed as explained by context. Context checks now run before a signal reaches the queue."
          />
          <PanelBody>
            <TrendArea
              data={SIGNAL_TREND}
              xKey="month"
              series={[
                { key: "raised", name: "Signals raised", color: CHART.series[0] },
                { key: "explained", name: "Closed as explained by context", color: CHART.series[1] },
              ]}
              reference={{ x: "2026-05-01", label: "Context checks first" }}
              height={240}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent signals"
            actions={
              <ButtonLink href="/alerts" size="xs" variant="ghost">
                Signal center <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          <div className="px-1 py-1">
            {recent.map((signal) => (
              <SignalRow key={signal.id} signal={signal} compact />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Vendor network activity"
            icon={<Waypoints className="h-3.5 w-3.5" />}
            description="The coastal maintenance group: four bidders, the tenders they share and the entities that connect them."
            actions={
              <ButtonLink href="/relationships?focus=V-1042" size="xs" variant="ghost">
                Open network <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          <PanelBody>
            <NetworkGraphView
              graph={graph}
              filters={["all"]}
              selectedId={networkSelection}
              onSelect={setNetworkSelection}
              restrictTo={clusterIds}
              height={320}
            />
          </PanelBody>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Context before alerts" description="Share of reviewed signals that turned out to be explained by context." />
            <PanelBody className="space-y-4">
              <div>
                <div className="flex justify-between text-[13px] text-ink-2">
                  <span>Before context checks</span>
                  <span className="tabular font-semibold text-ink">{SIGNAL_ARCHIVE.explainedShareBefore}%</span>
                </div>
                <Meter value={SIGNAL_ARCHIVE.explainedShareBefore} tone="slate" className="mt-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[13px] text-ink-2">
                  <span>Since May 2026</span>
                  <span className="tabular font-semibold text-ok-ink">{SIGNAL_ARCHIVE.explainedShareAfter}%</span>
                </div>
                <Meter value={SIGNAL_ARCHIVE.explainedShareAfter} tone="ok" className="mt-1.5" />
              </div>
              <p className="text-[13px] leading-relaxed text-ink-3">
                Fewer signals reach investigators only to be explained away.{" "}
                {contextLowered > 0 ? (
                  <span className="text-ink-2">In this workspace, context has lowered priority on {contextLowered} case{contextLowered === 1 ? "" : "s"}.</span>
                ) : (
                  "Apply a context check on a case to see its priority change here."
                )}
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Data health"
              icon={<Database className="h-3.5 w-3.5" />}
              actions={
                <Link href="/data-sources" className="text-xs text-accent-ink hover:underline">
                  Sources
                </Link>
              }
            />
            <PanelBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-2">Data quality</span>
                <span className="type-title text-2xl tabular text-ink">{DATA_QUALITY.score}%</span>
              </div>
              <Meter value={DATA_QUALITY.score} tone="ok" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DATA_SOURCES.map((source) => (
                  <Badge key={source.id} tone={source.status === "CONNECTED" ? "ok" : "warn"}>
                    {source.name}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] leading-snug text-ink-3">{SYNTHETIC_NOTICE}</p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RadarLink({ data, onPick }: { data: { category: SignalCategory; count: number }[]; onPick: (c: SignalCategory | "ALL") => void }) {
  const router = useRouter();
  return (
    <AnomalyRadar
      data={data}
      onSelect={(category) => {
        onPick(category);
        router.push("/radar");
      }}
      size={400}
    />
  );
}
