"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileSearch, SearchX, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { PLATFORM } from "@/data/analytics";
import { BIDS_BY_TENDER, TENDERS } from "@/data/procurement";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  DEPARTMENTS,
  DEPARTMENT_BY_ID,
  PRIORITY_META,
  REGIONS,
  REGION_BY_ID,
  SIGNAL_CATEGORY_META,
  SIGNAL_CATEGORY_ORDER,
  TENDER_STATUS_META,
} from "@/data/reference";
import { SIGNALS } from "@/data/signals";
import { VENDOR_BY_ID, vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { useCaseViews } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { DEFAULT_EXPLORER, useAegis, type ExplorerFilters } from "@/store/aegis";
import type { PriorityLevel, SignalCategory, Tender } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, SearchInput, Select } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/misc";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PRIORITY_TONE, PriorityBadge } from "@/components/ui/priority";
import { EmptyState } from "@/components/ui/states";

const PAGE_SIZE = 25;
const RANK: Record<PriorityLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

const SIGNALS_BY_TENDER = (() => {
  const map = new Map<string, typeof SIGNALS>();
  for (const signal of SIGNALS) {
    for (const id of signal.tenderIds.slice(0, signal.type === "CONTRACT_SPLITTING" || signal.type === "PARTICIPATION_PATTERN" || signal.type === "BID_ROTATION" ? undefined : 1)) {
      const list = map.get(id) ?? [];
      list.push(signal);
      map.set(id, list);
    }
  }
  return map;
})();

export function tenderSignals(tenderId: string) {
  return SIGNALS_BY_TENDER.get(tenderId) ?? [];
}

function toCsv(rows: { tender: Tender; priority?: PriorityLevel; signals: number }[]) {
  const header = ["Tender ID", "Title", "Department", "Category", "Region", "Winning vendor", "Bids", "Contract value (INR)", "Date", "Status", "Priority", "Signals"];
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = rows.map(({ tender, priority, signals }) =>
    [
      tender.id,
      tender.title,
      DEPARTMENT_BY_ID[tender.departmentId].name,
      CATEGORY_BY_ID[tender.categoryId].name,
      REGION_BY_ID[tender.regionId].name,
      tender.winnerVendorId ? vendorName(tender.winnerVendorId) : "",
      (BIDS_BY_TENDER.get(tender.id) ?? []).length,
      tender.awardValue ?? "",
      tender.awardedOn ?? tender.publishedOn,
      TENDER_STATUS_META[tender.status].label,
      priority ?? "",
      signals,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export function ProcurementExplorer() {
  const router = useRouter();
  const filters = useAegis((s) => s.explorer);
  const setFilters = useAegis((s) => s.setExplorer);
  const resetFilters = useAegis((s) => s.resetExplorer);
  const cases = useCaseViews();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  const casePriority = useMemo(() => {
    const map = new Map<string, { level: PriorityLevel; score: number; caseId: string }>();
    for (const view of cases) {
      if (view.investigation.tenderId) map.set(view.investigation.tenderId, { level: view.score.level, score: view.score.total, caseId: view.investigation.id });
    }
    return map;
  }, [cases]);

  const update = (patch: Partial<ExplorerFilters>) => {
    setFilters(patch);
    setPage(1);
  };

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const vendorQ = filters.vendor.trim().toLowerCase();
    const min = filters.valueMin ? Number(filters.valueMin) * 1e7 : null;
    const max = filters.valueMax ? Number(filters.valueMax) * 1e7 : null;

    const list = TENDERS.map((tender) => {
      const signals = tenderSignals(tender.id);
      const fromCase = casePriority.get(tender.id);
      const severity = signals.reduce<PriorityLevel | undefined>((best, s) => (!best || RANK[s.severity] > RANK[best] ? s.severity : best), undefined);
      return {
        tender,
        signals,
        priority: fromCase?.level ?? severity,
        score: fromCase?.score,
        caseId: fromCase?.caseId,
        bids: (BIDS_BY_TENDER.get(tender.id) ?? []).length,
        date: tender.awardedOn ?? tender.publishedOn,
      };
    }).filter((row) => {
      const t = row.tender;
      if (filters.department !== "ALL" && t.departmentId !== filters.department) return false;
      if (filters.category !== "ALL" && t.categoryId !== filters.category) return false;
      if (filters.region !== "ALL" && t.regionId !== filters.region) return false;
      if (filters.status !== "ALL" && t.status !== filters.status) return false;
      if (filters.priority !== "ALL" && row.priority !== filters.priority) return false;
      if (filters.signalCategory !== "ALL" && !row.signals.some((s) => s.category === (filters.signalCategory as SignalCategory))) return false;
      if (filters.flaggedOnly && !row.signals.length) return false;
      if (min != null && (t.awardValue ?? t.estimate) < min) return false;
      if (max != null && (t.awardValue ?? t.estimate) > max) return false;
      if (filters.dateFrom && row.date < filters.dateFrom) return false;
      if (filters.dateTo && row.date > filters.dateTo) return false;
      if (vendorQ) {
        const bidders = (BIDS_BY_TENDER.get(t.id) ?? []).map((b) => VENDOR_BY_ID[b.vendorId]?.name.toLowerCase() ?? "");
        if (!bidders.some((name) => name.includes(vendorQ)) && !(t.winnerVendorId && t.winnerVendorId.toLowerCase().includes(vendorQ))) return false;
      }
      if (q) {
        const bidders = (BIDS_BY_TENDER.get(t.id) ?? []).map((b) => VENDOR_BY_ID[b.vendorId]?.name ?? "");
        const hay = [t.id, t.title, t.location, DEPARTMENT_BY_ID[t.departmentId].name, CATEGORY_BY_ID[t.categoryId].name, REGION_BY_ID[t.regionId].name, t.contractId ?? "", ...bidders].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((token) => hay.includes(token))) return false;
      }
      return true;
    });

    const [key, direction] = filters.sort.split("-");
    const dir = direction === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (key === "value") return ((a.tender.awardValue ?? a.tender.estimate) - (b.tender.awardValue ?? b.tender.estimate)) * dir;
      if (key === "signals") return (a.signals.length - b.signals.length) * dir || (a.date < b.date ? 1 : -1);
      if (key === "priority") return ((a.score ?? (a.priority ? RANK[a.priority] * 10 : 0)) - (b.score ?? (b.priority ? RANK[b.priority] * 10 : 0))) * dir;
      if (key === "bids") return (a.bids - b.bids) * dir;
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir;
    });
  }, [filters, casePriority]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const totalValue = rows.reduce((s, r) => s + (r.tender.awardValue ?? 0), 0);
  const flagged = rows.filter((r) => r.signals.length).length;
  const active = JSON.stringify({ ...filters, sort: "" }) !== JSON.stringify({ ...DEFAULT_EXPLORER, sort: "" });

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows.map((r) => ({ tender: r.tender, priority: r.priority, signals: r.signals.length })))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aegis-procurement-${rows.length}-records.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sortHeader = (label: string, key: string, align?: "right") => {
    const [currentKey, direction] = filters.sort.split("-");
    const activeKey = currentKey === key;
    return (
      <button
        type="button"
        onClick={() => update({ sort: `${key}-${activeKey && direction === "desc" ? "asc" : "desc"}` })}
        className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", activeKey && "text-ink", align === "right" && "justify-end")}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {activeKey && <span aria-hidden>{direction === "desc" ? "↓" : "↑"}</span>}
      </button>
    );
  };

  return (
    <div>
      <PageHeader
        meta={
          <>
            <FileSearch className="h-3.5 w-3.5" /> {formatNumber(PLATFORM.tenders)} tenders · {formatNumber(PLATFORM.events)} lifecycle events · {formatNumber(PLATFORM.bids)} bids
          </>
        }
        title="Explore procurement data"
        description="Every tender in the analysis window with its bids, award and signals. Filters are saved in this browser."
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> {showFilters ? "Hide filters" : "Show filters"}
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </>
        }
      />

      <Panel className="mb-4">
        <div className="border-b border-line p-4">
          <SearchInput
            value={filters.query}
            onChange={(query) => update({ query })}
            placeholder="Search tender, vendor, contract, department…"
            label="Search procurement records"
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Field label="From">
              <Input type="date" value={filters.dateFrom} min="2024-01-01" max="2026-12-31" onChange={(e) => update({ dateFrom: e.target.value })} />
            </Field>
            <Field label="To">
              <Input type="date" value={filters.dateTo} min="2024-01-01" max="2026-12-31" onChange={(e) => update({ dateTo: e.target.value })} />
            </Field>
            <Field label="Department">
              <Select value={filters.department} onChange={(e) => update({ department: e.target.value })}>
                <option value="ALL">All departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.short}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Region">
              <Select value={filters.region} onChange={(e) => update({ region: e.target.value })}>
                <option value="ALL">All regions</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={filters.category} onChange={(e) => update({ category: e.target.value })}>
                <option value="ALL">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vendor">
              <Input value={filters.vendor} onChange={(e) => update({ vendor: e.target.value })} placeholder="Any bidder" />
            </Field>
            <Field label="Min value (₹ Cr)">
              <Input type="number" min={0} step="0.1" inputMode="decimal" value={filters.valueMin} onChange={(e) => update({ valueMin: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Max value (₹ Cr)">
              <Input type="number" min={0} step="0.1" inputMode="decimal" value={filters.valueMax} onChange={(e) => update({ valueMax: e.target.value })} placeholder="Any" />
            </Field>
            <Field label="Tender status">
              <Select value={filters.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="ALL">All statuses</option>
                {Object.entries(TENDER_STATUS_META).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Investigation priority">
              <Select value={filters.priority} onChange={(e) => update({ priority: e.target.value })}>
                <option value="ALL">Any priority</option>
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as PriorityLevel[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Anomaly type">
              <Select value={filters.signalCategory} onChange={(e) => update({ signalCategory: e.target.value })}>
                <option value="ALL">Any anomaly type</option>
                {SIGNAL_CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {SIGNAL_CATEGORY_META[c].label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end gap-3 pb-2">
              <Checkbox checked={filters.flaggedOnly} onChange={(flaggedOnly) => update({ flaggedOnly })} label="With signals only" />
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-ink-3">
          <span className="tabular">
            <span className="font-semibold text-ink">{formatNumber(rows.length)}</span> records · {formatINR(totalValue)} awarded · {flagged} with signals
          </span>
          {active && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                resetFilters();
                setPage(1);
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      </Panel>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No signals found"
            description="No procurement records match the selected filters. Try broadening the search."
            action={
              <Button
                size="sm"
                onClick={() => {
                  resetFilters();
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line text-[11px] tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium uppercase">Tender ID</th>
                    <th className="px-4 py-2.5 font-medium uppercase">Department</th>
                    <th className="px-4 py-2.5 font-medium uppercase">Category</th>
                    <th className="px-4 py-2.5 font-medium uppercase">Winning vendor</th>
                    <th className="px-4 py-2.5 text-right font-medium">{sortHeader("Bids", "bids", "right")}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{sortHeader("Contract value", "value", "right")}</th>
                    <th className="px-4 py-2.5 font-medium">{sortHeader("Date", "date")}</th>
                    <th className="px-4 py-2.5 font-medium">{sortHeader("Priority", "priority")}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{sortHeader("Signals", "signals", "right")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr
                      key={row.tender.id}
                      onClick={() => router.push(`/procurement/${row.tender.id}`)}
                      className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-panel-2"
                    >
                      <td className="px-4 py-2.5">
                        <Link href={`/procurement/${row.tender.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-ink-2 hover:text-accent-ink">
                          {row.tender.id}
                        </Link>
                        <div className="max-w-[16rem] truncate text-xs text-ink-3">{row.tender.title}</div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">{DEPARTMENT_BY_ID[row.tender.departmentId].short}</td>
                      <td className="px-4 py-2.5 text-ink-2">{CATEGORY_BY_ID[row.tender.categoryId].name}</td>
                      <td className="max-w-[14rem] truncate px-4 py-2.5 text-ink">
                        {row.tender.winnerVendorId ? vendorName(row.tender.winnerVendorId) : <span className="text-ink-3">{TENDER_STATUS_META[row.tender.status].label}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-2">{row.bids} bids</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink">{row.tender.awardValue ? formatINR(row.tender.awardValue) : <span className="text-ink-3">{formatINR(row.tender.estimate)} est.</span>}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5">{row.priority ? <PriorityBadge level={row.priority} score={row.score} label={false} /> : <span className="text-xs text-ink-3">—</span>}</td>
                      <td className="px-4 py-2.5 text-right">
                        {row.signals.length ? (
                          <Badge tone={PRIORITY_TONE[row.priority ?? "LOW"]} className="normal-case tracking-normal">
                            {row.signals.length} {row.signals.length === 1 ? "signal" : "signals"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-ink-3">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {visible.map((row) => (
                <li key={row.tender.id}>
                  <Link href={`/procurement/${row.tender.id}`} className="block px-4 py-3 active:bg-panel-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-ink-3">{row.tender.id}</div>
                        <div className="truncate text-sm text-ink">{row.tender.title}</div>
                        <div className="mt-0.5 text-xs text-ink-3">
                          {DEPARTMENT_BY_ID[row.tender.departmentId].short} · {row.bids} bids · {formatDate(row.date)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm tabular text-ink">{formatINR(row.tender.awardValue ?? row.tender.estimate)}</div>
                        {row.priority && <PriorityBadge level={row.priority} label={false} className="mt-1" />}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={current} pageCount={pageCount} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} total={rows.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </Panel>
    </div>
  );
}
