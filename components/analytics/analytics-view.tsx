"use client";

import { ChartColumn, MessageSquareText, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ACTIVE_STATUSES,
  CATEGORIES,
  DEPARTMENTS,
  DEPARTMENT_BY_ID,
  OUTCOME_META,
  SIGNAL_TYPE_META,
} from "@/data/reference";
import {
  CLOSED_OUTCOMES,
  CONCENTRATION_TREND,
  OUTCOME_TOTALS,
  SIGNAL_ARCHIVE,
  SIGNAL_TREND,
  TREND_MONTHS,
  zoneOf,
  type ZoneStat,
} from "@/data/analytics";
import { SIGNAL_MODELS } from "@/data/platform";
import { AWARDED_TENDERS, CONTRACTS, TENDERS, bidSpread } from "@/data/procurement";
import { REGIONS } from "@/data/reference";
import { SIGNALS } from "@/data/signals";
import { formatDateTime, formatINR, formatNumber, monthKey } from "@/lib/format";
import { useCaseViews } from "@/lib/hooks";
import { cn, mean, sum } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { DepartmentId, RegionId } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/misc";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OutcomeBadge } from "@/components/ui/priority";
import { BarList } from "@/components/charts/bar-list";
import { SimpleBars, SimpleLines, SingleArea, TrendArea } from "@/components/charts/series-charts";
import { CHART } from "@/components/charts/theme";
import { ZoneTileMap } from "@/components/charts/tile-map";

export function AnalyticsView() {
  const [department, setDepartment] = useState<DepartmentId | null>(null);
  const [region, setRegion] = useState<RegionId | null>(null);
  const cases = useCaseViews();
  const feedbackEvents = useAegis((s) => s.feedbackEvents);

  const departmentCards = useMemo(
    () =>
      DEPARTMENTS.map((d) => {
        const tenders = TENDERS.filter((t) => t.departmentId === d.id);
        const contracts = CONTRACTS.filter((c) => c.departmentId === d.id);
        const value = sum(contracts.map((c) => c.value));
        const byVendor = new Map<string, number>();
        for (const c of contracts) byVendor.set(c.vendorId, (byVendor.get(c.vendorId) ?? 0) + c.value);
        const top3 = sum([...byVendor.values()].sort((a, b) => b - a).slice(0, 3));
        const signals = SIGNALS.filter((s) => s.departmentId === d.id).length;
        return {
          ...d,
          tenders: tenders.length,
          value,
          average: contracts.length ? value / contracts.length : 0,
          top3Share: value ? (top3 / value) * 100 : 0,
          anomalyRate: contracts.length ? (signals / contracts.length) * 100 : 0,
          signals,
          cases: cases.filter((c) => c.investigation.departmentId === d.id && ACTIVE_STATUSES.includes(c.state.status)).length,
        };
      }).sort((a, b) => b.value - a.value),
    [cases],
  );

  const scopedContracts = useMemo(
    () => CONTRACTS.filter((c) => (!department || c.departmentId === department) && (!region || c.regionId === region)),
    [department, region],
  );
  const scopedTenders = useMemo(
    () => TENDERS.filter((t) => (!department || t.departmentId === department) && (!region || t.regionId === region)),
    [department, region],
  );
  const scopedSignals = useMemo(
    () => SIGNALS.filter((s) => (!department || s.departmentId === department) && (!region || s.regionId === region)),
    [department, region],
  );

  const categoryRows = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const contracts = scopedContracts.filter((x) => x.categoryId === c.id);
        const values = contracts.map((x) => x.value);
        const avg = mean(values);
        const sd = Math.sqrt(mean(values.map((v) => Math.pow(v - avg, 2))));
        return {
          ...c,
          spend: sum(values),
          contracts: contracts.length,
          vendors: new Set(contracts.map((x) => x.vendorId)).size,
          average: avg,
          variance: avg ? (sd / avg) * 100 : 0,
          signals: scopedSignals.filter((s) => s.categoryId === c.id).length,
        };
      })
        .filter((c) => c.contracts > 0)
        .sort((a, b) => b.spend - a.spend),
    [scopedContracts, scopedSignals],
  );

  const zones: ZoneStat[] = useMemo(
    () =>
      REGIONS.flatMap((r) =>
        Array.from({ length: r.zones }, (_, i) => {
          const tenders = TENDERS.filter((t) => t.regionId === r.id && zoneOf(t) === i + 1 && (!department || t.departmentId === department));
          const ids = new Set(tenders.map((t) => t.id));
          const signals = SIGNALS.filter((s) => s.tenderIds.some((id) => ids.has(id))).length;
          const awarded = tenders.filter((t) => t.awardValue).length;
          return {
            regionId: r.id,
            zone: i + 1,
            tenders: tenders.length,
            value: sum(tenders.map((t) => t.awardValue ?? 0)),
            signals,
            signalDensity: awarded ? (signals / awarded) * 100 : 0,
          };
        }),
      ),
    [department],
  );

  const activity = useMemo(
    () =>
      TREND_MONTHS.map((month) => {
        const published = scopedTenders.filter((t) => monthKey(t.publishedOn) === month);
        const awarded = AWARDED_TENDERS.filter((t) => t.awardedOn && monthKey(t.awardedOn) === month && (!department || t.departmentId === department) && (!region || t.regionId === region));
        const spreads = awarded.map((t) => bidSpread(t.id)).filter((s): s is number => s != null);
        return {
          month: `${month}-01`,
          tenders: published.length,
          awards: awarded.length,
          valueCr: Number((sum(awarded.map((t) => t.awardValue ?? 0)) / 1e7).toFixed(2)),
          avgSpread: spreads.length ? Number(mean(spreads).toFixed(1)) : null,
        };
      }),
    [scopedTenders, department, region],
  );

  const feedbackByType = Object.entries(
    feedbackEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.signalType] = (acc[e.signalType] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const scopeLabel = [department ? DEPARTMENT_BY_ID[department].short : null, region ? REGIONS.find((r) => r.id === region)?.name : null].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <ChartColumn className="h-3.5 w-3.5" /> {formatNumber(scopedTenders.length)} tenders · {formatINR(sum(scopedContracts.map((c) => c.value)))} · {scopedSignals.length} signals in scope
          </>
        }
        title="Analytics"
        description="Where the work goes, how prices vary, and where signals concentrate. Select a department or region to scope every panel on this page."
        actions={
          scopeLabel ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDepartment(null);
                setRegion(null);
              }}
            >
              {scopeLabel} <X className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
      />

      <section>
        <h2 className="type-label mb-3 !text-ink-2">Department intelligence</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {departmentCards.map((d) => {
            const active = department === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDepartment(active ? null : d.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border p-4 text-left transition-colors",
                  active ? "border-accent/60 bg-accent/[0.08]" : department ? "border-line bg-panel opacity-60 hover:opacity-100" : "border-line bg-panel hover:border-line-strong",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">{d.code}</div>
                    <div className="type-title mt-1 text-[17px] text-ink">{d.short}</div>
                  </div>
                  {d.cases > 0 && <Badge tone="accent">{d.cases} cases</Badge>}
                </div>
                <div className="type-title mt-4 text-2xl tabular text-ink">{formatINR(d.value)}</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-ink-3">Volume</dt>
                    <dd className="tabular text-ink-2">{d.tenders} tenders</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Avg contract</dt>
                    <dd className="tabular text-ink-2">{formatINR(d.average)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Top-3 vendor share</dt>
                    <dd className={cn("tabular", d.top3Share > 60 ? "text-warn-ink" : "text-ink-2")}>{d.top3Share.toFixed(0)}%</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Anomaly rate</dt>
                    <dd className="tabular text-ink-2">{d.anomalyRate.toFixed(1)} / 100</dd>
                  </div>
                </dl>
                <Meter value={d.anomalyRate} max={Math.max(...departmentCards.map((x) => x.anomalyRate))} tone="risk" className="mt-3" label={`${d.short} anomaly rate`} />
              </button>
            );
          })}
        </div>
      </section>

      <Panel>
        <PanelHeader title="Category analytics" description="Spend, competition and price variability by category. Price variance is the coefficient of variation of contract values." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                <th className="px-4 py-2.5 text-right font-medium">Contracts</th>
                <th className="px-4 py-2.5 text-right font-medium">Vendors</th>
                <th className="px-4 py-2.5 text-right font-medium">Average price</th>
                <th className="px-4 py-2.5 font-medium">Price variance</th>
                <th className="px-4 py-2.5 text-right font-medium">Signals</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-ink">{row.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink">{formatINR(row.spend)}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-2">{row.contracts}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-2">{row.vendors}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink-2">{formatINR(row.average)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Meter value={row.variance} max={150} tone="accent" className="w-24" label={`${row.name} price variance`} />
                      <span className="tabular text-xs text-ink-2">{row.variance.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">{row.signals ? <Badge tone="risk">{row.signals}</Badge> : <span className="text-ink-3">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Procurement heatmap" description="Procurement zones arranged by geography. Select a zone to scope the page to its region." />
          <PanelBody>
            <ZoneTileMap zones={zones} selectedRegion={region} onSelectRegion={setRegion} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Anomaly signals" description="Signals raised per month and reviews closed as explained by context (all departments)." />
          <PanelBody>
            <TrendArea
              data={SIGNAL_TREND}
              xKey="month"
              series={[
                { key: "raised", name: "Signals raised", color: CHART.series[0] },
                { key: "explained", name: "Explained by context", color: CHART.series[1] },
                { key: "escalated", name: "Escalated", color: CHART.series[2] },
              ]}
              reference={{ x: "2026-05-01", label: "Context checks first" }}
              height={280}
            />
          </PanelBody>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Procurement volume" description="Tenders published and awards made per month." />
          <PanelBody>
            <SimpleBars
              data={activity}
              xKey="month"
              xFormatter={(v) => {
                const [y, m] = String(v).split("-");
                return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ’${y.slice(2)}`;
              }}
              series={[
                { key: "tenders", name: "Tenders published", color: CHART.series[0] },
                { key: "awards", name: "Awards", color: CHART.series[1] },
              ]}
              height={240}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Contract value" description="Value awarded per month, ₹ Cr." />
          <PanelBody>
            <SingleArea data={activity} xKey="month" dataKey="valueCr" name="₹ Cr awarded" height={240} valueFormatter={(v) => `₹${Number(v).toFixed(1)} Cr`} />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Average bid variance" description="Mean bid spread across awards each month. Tighter spreads are not suspicious on their own." />
          <PanelBody>
            <SimpleLines data={activity} xKey="month" monthly series={[{ key: "avgSpread", name: "Average spread", color: CHART.series[0] }]} height={240} valueFormatter={(v) => `${Number(v).toFixed(1)}%`} />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Vendor concentration" description="Herfindahl–Hirschman index of award value per quarter. Above 1,500 indicates a moderately concentrated market." />
          <PanelBody>
            <SimpleLines data={CONCENTRATION_TREND} xKey="quarter" series={[{ key: "hhi", name: "HHI", color: CHART.series[0] }]} height={240} valueFormatter={(v) => formatNumber(v)} />
          </PanelBody>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel>
          <PanelHeader title="Investigation outcomes" description={`${formatNumber(SIGNAL_ARCHIVE.reviewed)} reviewed signals since April 2025.`} />
          <PanelBody className="space-y-5">
            <BarList
              items={OUTCOME_TOTALS.map((o) => ({
                id: o.outcome,
                label: OUTCOME_META[o.outcome].label,
                value: o.count,
                display: `${o.count} · ${((o.count / SIGNAL_ARCHIVE.reviewed) * 100).toFixed(0)}%`,
              }))}
            />
            <ul className="divide-y divide-line border-t border-line">
              {CLOSED_OUTCOMES.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink-2">
                    <span className="font-mono text-[11px] text-ink-3">{c.id}</span> {c.title}
                  </span>
                  <OutcomeBadge outcome={c.outcome} />
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Investigator feedback" description="Outcomes and signal feedback recalibrate how signals are weighted." icon={<MessageSquareText className="h-3.5 w-3.5" />} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Signal model</th>
                  <th className="px-4 py-2.5 font-medium">Precision after review</th>
                  <th className="px-4 py-2.5 text-right font-medium">Feedback</th>
                  <th className="px-4 py-2.5 font-medium">Calibrated</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_MODELS.map((model) => (
                  <tr key={model.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="text-ink">{model.name}</div>
                      <div className="text-xs text-ink-3">{model.note}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Meter value={model.precision} tone={model.precision >= 65 ? "ok" : "warn"} className="w-24" label={`${model.name} precision`} />
                        <span className="tabular text-xs text-ink-2">{model.precision}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-2">{model.feedback}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{model.calibrated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelBody className="border-t border-line">
            <div className="type-label mb-2">Feedback from this workspace</div>
            {feedbackEvents.length ? (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {feedbackByType.map(([type, count]) => (
                    <Badge key={type} tone="neutral" className="normal-case tracking-normal">
                      {SIGNAL_TYPE_META[type as keyof typeof SIGNAL_TYPE_META]?.label ?? type} · {count}
                    </Badge>
                  ))}
                </div>
                <ul className="space-y-2">
                  {feedbackEvents.slice(0, 5).map((event) => (
                    <li key={event.id} className="text-[13px] leading-snug text-ink-2">
                      <span className="text-xs tabular text-ink-3">{formatDateTime(event.at)} · {event.signalId}</span>
                      <br />
                      {event.effect}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[13px] text-ink-3">
                Mark a signal as relevant, not relevant or explained by context in a case workspace or the signal center. The effect appears here.
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

