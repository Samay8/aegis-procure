"use client";

import Link from "next/link";
import { ArrowUpRight, Radar, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ACTIVE_STATUSES, DEPARTMENTS, DEPARTMENT_BY_ID, SIGNAL_CATEGORY_META, SIGNAL_CATEGORY_ORDER } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatCr, formatDate } from "@/lib/format";
import { useCaseViews, useSignalViews } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { DepartmentId, SignalCategory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { CATEGORY_ICON } from "@/components/ui/icons";
import { ScoreDisclaimer } from "@/components/ui/notices";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PRIORITY_TONE, PriorityBadge, PriorityMeter } from "@/components/ui/priority";
import { EmptyState } from "@/components/ui/states";
import { AnomalyRadar } from "@/components/charts/radar";
import { rampColor, CHART } from "@/components/charts/theme";
import { QueueTable } from "./queue-table";

export function RadarView({ initialCategory }: { initialCategory?: SignalCategory }) {
  const selected = useAegis((s) => s.radarCategory);
  const setSelected = useAegis((s) => s.setRadarCategory);
  const [department, setDepartment] = useState<DepartmentId | "ALL">("ALL");
  const signalViews = useSignalViews();
  const cases = useCaseViews();

  useEffect(() => {
    if (initialCategory) setSelected(initialCategory);
  }, [initialCategory, setSelected]);

  const open = useMemo(() => signalViews.filter((v) => !v.review).map((v) => v.signal), [signalViews]);
  const counts = SIGNAL_CATEGORY_ORDER.map((category) => ({ category, count: open.filter((s) => s.category === category).length }));

  const filteredSignals = open
    .filter((s) => selected === "ALL" || s.category === selected)
    .filter((s) => department === "ALL" || s.departmentId === department)
    .sort((a, b) => b.strength - a.strength);

  const activeCases = cases
    .filter((c) => ACTIVE_STATUSES.includes(c.state.status))
    .filter((c) => {
      if (department !== "ALL" && c.investigation.departmentId !== department) return false;
      if (selected === "ALL") return true;
      return open.some((s) => s.category === selected && (s.caseId === c.investigation.id || c.investigation.signalIds.includes(s.id)));
    })
    .sort((a, b) => b.score.total - a.score.total);

  const featured = cases
    .filter((c) => ACTIVE_STATUSES.includes(c.state.status))
    .sort((a, b) => b.score.base - a.score.base)[0];

  const matrixMax = Math.max(
    1,
    ...SIGNAL_CATEGORY_ORDER.flatMap((category) => DEPARTMENTS.map((d) => open.filter((s) => s.category === category && s.departmentId === d.id).length)),
  );

  return (
    <div>
      <PageHeader
        meta={
          <>
            <Radar className="h-3.5 w-3.5" /> {open.length} open signals across {SIGNAL_CATEGORY_ORDER.length} categories
          </>
        }
        title="Anomaly radar"
        description="What looks unusual, grouped by the question it raises. Select a category on the radar or in the matrix to filter the investigations and signals below."
        actions={
          selected !== "ALL" || department !== "ALL" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelected("ALL");
                setDepartment("ALL");
              }}
            >
              Clear filters
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Signals by category" description="Radius shows the number of open signals. Categories are independent evidence layers, not a combined score." />
          <PanelBody>
            <AnomalyRadar data={counts} selected={selected} onSelect={setSelected} size={460} />
          </PanelBody>
        </Panel>

        <div className="space-y-6">
          {featured && (
            <Panel className="border-risk/30">
              <PanelHeader title="Highest priority case" actions={<PriorityBadge level={featured.score.level} score={featured.score.total} />} />
              <PanelBody className="space-y-4">
                <div>
                  <div className="font-mono text-xs text-ink-3">{featured.investigation.id}</div>
                  <div className="type-title mt-1 text-xl text-ink">{featured.investigation.title}</div>
                  <div className="mt-1 text-[13px] text-ink-2">
                    {vendorName(featured.investigation.vendorId)} · {formatCr(featured.investigation.value)} · {featured.investigation.primarySignal}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <div className={cn("type-display text-6xl tabular", featured.score.level === "MEDIUM" ? "text-warn-ink" : "text-risk-ink")}>{featured.score.total}</div>
                  <PriorityMeter score={featured.score.total} className="mb-3 flex-1" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(featured.investigation.signalIds.map((id) => open.find((s) => s.id === id)?.category).filter(Boolean))].map((category) => {
                    const Icon = CATEGORY_ICON[category as SignalCategory];
                    return (
                      <Badge key={category} tone="neutral">
                        <Icon className="h-3 w-3" /> {SIGNAL_CATEGORY_META[category as SignalCategory].short}
                      </Badge>
                    );
                  })}
                </div>
                <ScoreDisclaimer />
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/investigations/${featured.investigation.id}`} variant="primary" size="sm">
                    Why was this flagged? <ArrowUpRight className="h-3.5 w-3.5" />
                  </ButtonLink>
                  <ButtonLink href={`/investigations/${featured.investigation.id}/evidence`} size="sm">
                    View evidence
                  </ButtonLink>
                </div>
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="What each category asks" />
            <ul className="divide-y divide-line">
              {counts.map(({ category, count }) => {
                const Icon = CATEGORY_ICON[category];
                const active = selected === category;
                return (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => setSelected(active ? "ALL" : category)}
                      aria-pressed={active}
                      className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors", active ? "bg-accent/10" : "hover:bg-panel-2")}
                    >
                      <Icon aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-accent-ink" : "text-ink-3")} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-ink">{SIGNAL_CATEGORY_META[category].label}</span>
                          <span className="tabular text-[13px] font-semibold text-ink">{count}</span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-ink-3">{SIGNAL_CATEGORY_META[category].question}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6">
        <PanelHeader
          title="Signal matrix"
          description="Open signals by category and department. Select a cell to filter both."
          actions={department !== "ALL" ? <Badge tone="accent">{DEPARTMENT_BY_ID[department].short}</Badge> : undefined}
        />
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[720px] border-separate border-spacing-[3px] text-xs">
            <thead>
              <tr>
                <th className="w-40" />
                {DEPARTMENTS.map((d) => (
                  <th key={d.id} scope="col" className="px-1 pb-1 text-center font-medium text-ink-3">
                    <button type="button" onClick={() => setDepartment(department === d.id ? "ALL" : d.id)} className={cn("hover:text-ink", department === d.id && "text-accent-ink")}>
                      {d.code}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIGNAL_CATEGORY_ORDER.map((category) => (
                <tr key={category}>
                  <th scope="row" className="pr-2 text-left font-normal text-ink-2">
                    {SIGNAL_CATEGORY_META[category].label}
                  </th>
                  {DEPARTMENTS.map((d) => {
                    const n = open.filter((s) => s.category === category && s.departmentId === d.id).length;
                    const active = (selected === category || selected === "ALL") && (department === d.id || department === "ALL");
                    return (
                      <td key={d.id} className="p-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(category);
                            setDepartment(d.id);
                          }}
                          title={`${SIGNAL_CATEGORY_META[category].label} · ${d.name}: ${n}`}
                          className="flex h-9 w-full items-center justify-center rounded-[3px] tabular transition-opacity"
                          style={{
                            background: n ? rampColor(CHART.risk, 0.18 + (n / matrixMax) * 0.82) : "#1a1f25",
                            color: n / matrixMax > 0.55 ? "#140908" : n ? CHART.ink : "#4a525c",
                            opacity: active ? 1 : 0.35,
                          }}
                        >
                          {n || "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title={selected === "ALL" ? "Active investigations" : `Investigations with ${SIGNAL_CATEGORY_META[selected].label.toLowerCase()} signals`}
            description={`${activeCases.length} cases`}
          />
          {activeCases.length ? (
            <QueueTable rows={activeCases} compact />
          ) : (
            <EmptyState icon={SearchX} title="No signals found" description="No investigation matches the selected category and department. Try broadening the filters." />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Signals in view" description={`${filteredSignals.length} open signals, strongest first`} />
          {filteredSignals.length ? (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 z-10 border-b border-line bg-panel text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Signal</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Severity</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Detected</th>
                    <th className="px-4 py-2.5 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals.map((signal) => {
                    const Icon = CATEGORY_ICON[signal.category];
                    return (
                      <tr key={signal.id} className="border-b border-line last:border-0 hover:bg-panel-2">
                        <td className="px-4 py-2.5">
                          <div className="flex items-start gap-2.5">
                            <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                            <div className="min-w-0">
                              <div className="text-ink">{signal.title}</div>
                              <div className="text-xs text-ink-3">{signal.headline}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2.5 sm:table-cell">
                          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2.5 tabular text-ink-3 md:table-cell">{formatDate(signal.detectedOn)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link
                            href={signal.caseId ? `/investigations/${signal.caseId}` : `/alerts?signal=${signal.id}`}
                            className="whitespace-nowrap text-xs text-accent-ink hover:underline"
                          >
                            {signal.caseId ? signal.caseId.replace("INV-2026-", "Case ") : "Review"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={SearchX} title="No signals found" description="No procurement patterns match the selected filters. Try broadening the search." />
          )}
        </Panel>
      </div>
    </div>
  );
}
