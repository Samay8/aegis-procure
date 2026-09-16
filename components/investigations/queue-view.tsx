"use client";

import Link from "next/link";
import { FolderKanban, FolderX } from "lucide-react";
import { useMemo } from "react";
import { ACTIVE_STATUSES, DEPARTMENTS, DEPARTMENT_BY_ID, SIGNAL_CATEGORY_META, SIGNAL_CATEGORY_ORDER, STATUS_META, STATUS_ORDER } from "@/data/reference";
import { SIGNAL_BY_ID } from "@/data/signals";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR } from "@/lib/format";
import { useCaseViews } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis, DEFAULT_QUEUE, type QueueFilters } from "@/store/aegis";
import { Button } from "@/components/ui/button";
import { SearchInput, Select } from "@/components/ui/fields";
import { ScoreDisclaimer } from "@/components/ui/notices";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { OutcomeBadge } from "@/components/ui/priority";
import { EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/tabs";
import { QueueTable } from "./queue-table";

const CONFIDENCE_WEIGHT = { HIGH: 1, MEDIUM: 0.7, LOW: 0.4 };

const SORTS: { value: QueueFilters["sort"]; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "recency", label: "Recency" },
  { value: "evidence", label: "Evidence strength" },
  { value: "department", label: "Department" },
  { value: "type", label: "Anomaly type" },
  { value: "value", label: "Contract value" },
];

export function QueueView() {
  const views = useCaseViews();
  const queue = useAegis((s) => s.queue);
  const setQueue = useAegis((s) => s.setQueue);

  const rows = useMemo(() => {
    const q = queue.query.trim().toLowerCase();
    const filtered = views.filter(({ investigation, state }) => {
      if (queue.status === "ACTIVE" && !ACTIVE_STATUSES.includes(state.status)) return false;
      if (queue.status !== "ACTIVE" && queue.status !== "ALL" && state.status !== queue.status) return false;
      if (queue.department !== "ALL" && investigation.departmentId !== queue.department) return false;
      if (queue.signalCategory !== "ALL" && !investigation.signalIds.some((id) => SIGNAL_BY_ID.get(id)?.category === queue.signalCategory)) return false;
      if (q) {
        const hay = [investigation.id, investigation.title, investigation.primarySignal, vendorName(investigation.vendorId), ...investigation.relatedVendorIds.map(vendorName)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const evidenceStrength = (row: (typeof filtered)[number]) => {
      const signals = row.investigation.signalIds.map((id) => SIGNAL_BY_ID.get(id)).filter(Boolean);
      const confidence = signals.length ? signals.reduce((s, sig) => s + CONFIDENCE_WEIGHT[sig!.confidence], 0) / signals.length : 0.5;
      return row.investigation.evidence.length * confidence;
    };

    return [...filtered].sort((a, b) => {
      switch (queue.sort) {
        case "recency":
          return a.investigation.openedOn < b.investigation.openedOn ? 1 : -1;
        case "evidence":
          return evidenceStrength(b) - evidenceStrength(a);
        case "department":
          return DEPARTMENT_BY_ID[a.investigation.departmentId].short.localeCompare(DEPARTMENT_BY_ID[b.investigation.departmentId].short) || b.score.total - a.score.total;
        case "type":
          return a.investigation.primarySignal.localeCompare(b.investigation.primarySignal) || b.score.total - a.score.total;
        case "value":
          return b.investigation.value - a.investigation.value;
        default:
          return b.score.total - a.score.total;
      }
    });
  }, [views, queue]);

  const statusCounts = STATUS_ORDER.map((status) => ({ status, count: views.filter((v) => v.state.status === status).length })).filter((s) => s.count > 0);
  const closed = views.filter((v) => v.investigation.historical || v.state.outcome).filter((v) => !ACTIVE_STATUSES.includes(v.state.status));
  const filtersActive = JSON.stringify({ ...queue, sort: "priority" }) !== JSON.stringify({ ...DEFAULT_QUEUE, sort: "priority" });

  return (
    <div>
      <PageHeader
        meta={
          <>
            <FolderKanban className="h-3.5 w-3.5" /> {views.filter((v) => ACTIVE_STATUSES.includes(v.state.status)).length} active investigations
          </>
        }
        title="Investigation queue"
        description="Cases ranked by investigation priority. Each score is the sum of named factors and can be lowered by context or investigator feedback."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusCounts.map(({ status, count }) => (
          <button
            key={status}
            type="button"
            onClick={() => setQueue({ status: queue.status === status ? "ACTIVE" : status })}
            aria-pressed={queue.status === status}
            className={cn(
              "flex h-7 items-center gap-2 rounded-full border px-3 text-xs transition-colors",
              queue.status === status ? "border-accent/60 bg-accent/15 text-accent-ink" : "border-line-strong text-ink-2 hover:text-ink",
            )}
          >
            {STATUS_META[status].label}
            <span className="tabular text-ink-3">{count}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={queue.query} onChange={(query) => setQueue({ query })} placeholder="Search case, vendor or signal…" className="lg:w-72" label="Search cases" />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Select aria-label="Case status" value={queue.status} onChange={(e) => setQueue({ status: e.target.value as QueueFilters["status"] })}>
              <option value="ACTIVE">Active cases</option>
              <option value="ALL">All cases</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
            <Select aria-label="Department" value={queue.department} onChange={(e) => setQueue({ department: e.target.value })}>
              <option value="ALL">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </Select>
            <Select aria-label="Anomaly type" value={queue.signalCategory} onChange={(e) => setQueue({ signalCategory: e.target.value })}>
              <option value="ALL">All anomaly types</option>
              {SIGNAL_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {SIGNAL_CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={() => setQueue({ ...DEFAULT_QUEUE, sort: queue.sort })}>
              Reset
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="text-xs text-ink-3">
            {rows.length} {rows.length === 1 ? "case" : "cases"}
          </span>
          <Segmented label="Sort cases by" value={queue.sort} onChange={(sort) => setQueue({ sort })} options={SORTS} />
        </div>
        {rows.length ? (
          <QueueTable rows={rows} />
        ) : (
          <EmptyState
            icon={FolderX}
            title="No investigations"
            description="No cases match these filters. Clear the search or choose All cases."
            action={
              <Button size="sm" onClick={() => setQueue(DEFAULT_QUEUE)}>
                Clear filters
              </Button>
            }
          />
        )}
      </Panel>

      <ScoreDisclaimer className="mt-4" />

      <Panel className="mt-6">
        <PanelHeader title="Reviewed cases" description="Outcomes recorded by investigators. They calibrate how future signals are weighted." />
        <ul className="divide-y divide-line">
          {closed.map(({ investigation, state }) => (
            <li key={investigation.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6">
              <div className="min-w-0 md:w-80">
                <Link href={`/investigations/${investigation.id}`} className="font-mono text-[11px] text-ink-3 hover:text-accent-ink">
                  {investigation.id}
                </Link>
                <div className="truncate text-[13px] text-ink">{investigation.title}</div>
              </div>
              <div className="md:w-48">{state.outcome && <OutcomeBadge outcome={state.outcome.outcome} />}</div>
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">{state.outcome?.note}</p>
              <div className="shrink-0 text-xs tabular text-ink-3">
                {formatINR(investigation.value)} · {state.outcome ? formatDate(state.outcome.at.slice(0, 10)) : ""}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
