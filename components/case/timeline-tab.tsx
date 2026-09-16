"use client";

import { motion } from "framer-motion";
import { CalendarClock, CircleDot, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { TENDER_BY_ID } from "@/data/procurement";
import { INVESTIGATOR_BY_ID, STATUS_META } from "@/data/reference";
import { formatDate, formatDateShort, formatTime, minuteNumber } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { buildTimeline } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import type { InvestigationStatus, TimelineEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/fields";
import { Panel, PanelBody } from "@/components/ui/panel";
import { RecordChip, RecordChips } from "@/components/ui/record-chip";
import { EmptyState } from "@/components/ui/states";

type Row = TimelineEvent & { activity?: boolean };

const KIND_COLOR: Record<string, string> = {
  TENDER: "bg-accent",
  CORRIGENDUM: "bg-accent",
  BID: "bg-series-1",
  EVALUATION: "bg-slate",
  AWARD: "bg-ink",
  CONTRACT: "bg-ok",
  INVOICE: "bg-ok",
  PAYMENT: "bg-ok",
  INSPECTION: "bg-slate",
};

export function TimelineTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const [showActivity, setShowActivity] = useState(true);
  const [hover, setHover] = useState<string | null>(null);

  const tender = view?.investigation.tenderId ? TENDER_BY_ID.get(view.investigation.tenderId) : undefined;

  const rows = useMemo<Row[]>(() => {
    if (!view || !tender) return [];
    const events: Row[] = buildTimeline(tender, view.investigation.timelineNotes);
    if (showActivity) {
      events.push({
        id: `${view.investigation.id}-opened`,
        at: view.investigation.openedOn,
        kind: "EVALUATION",
        label: "Investigation opened",
        detail: `${view.investigation.id} · priority ${view.score.base}`,
        activity: true,
      });
      for (const entry of view.state.history) {
        events.push({
          id: `${entry.at}-${entry.kind}-${entry.to}`,
          at: entry.at,
          kind: "EVALUATION",
          label:
            entry.kind === "STATUS"
              ? `Status → ${STATUS_META[entry.to as InvestigationStatus]?.label ?? entry.to}`
              : entry.kind === "PRIORITY"
                ? `Priority ${entry.from} → ${entry.to}`
                : entry.kind === "ASSIGNMENT"
                  ? `Assigned to ${INVESTIGATOR_BY_ID[entry.to]?.name ?? entry.to}`
                  : entry.to,
          detail: entry.note ?? "Investigator action",
          activity: true,
        });
      }
      for (const note of view.state.notes) {
        events.push({ id: note.id, at: note.createdAt, kind: "EVALUATION", label: "Investigator note", detail: note.text, activity: true });
      }
    }
    return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  }, [view, tender, showActivity]);

  if (!view) return null;
  if (!tender) {
    return (
      <Panel>
        <EmptyState icon={CalendarClock} title="No procurement timeline" description="This case is not linked to a tender, so there is no lifecycle to plot." />
      </Panel>
    );
  }

  const procurement = rows.filter((r) => !r.activity);
  const start = minuteNumber(procurement[0]?.at ?? tender.publishedOn);
  const end = minuteNumber(procurement[procurement.length - 1]?.at ?? tender.publishedOn);
  const pos = (iso: string) => ((minuteNumber(iso) - start) / Math.max(1, end - start)) * 100;
  const unusual = procurement.filter((r) => r.unusual).length;


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Procurement timeline</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
            From publication to payment, with {unusual} unusual {unusual === 1 ? "event" : "events"} marked where a signal attaches to the record.
          </p>
        </div>
        <div className="w-full md:w-72">
          <Switch checked={showActivity} onChange={setShowActivity} label="Show investigation activity" description="Status changes, priority changes and notes" />
        </div>
      </div>

      <Panel>
        <PanelBody>
          <div className="relative mx-3 mb-9 mt-9 h-px bg-line-strong" role="img" aria-label="Timeline overview">
            {procurement.map((event) => (
              <button
                key={event.id}
                type="button"
                onMouseEnter={() => setHover(event.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(event.id)}
                onBlur={() => setHover(null)}
                onClick={() => document.getElementById(`evt-${event.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="absolute top-0 -translate-x-1/2 -translate-y-1/2 p-1.5"
                style={{ left: `${pos(event.at)}%` }}
                aria-label={`${formatDate(event.at)} ${event.label}`}
              >
                <span
                  className={cn(
                    "block rounded-full border-2 border-panel",
                    event.unusual ? "h-3.5 w-3.5 bg-risk" : cn("h-2.5 w-2.5", KIND_COLOR[event.kind]),
                  )}
                />
                {hover === event.id && (
                  <span className="absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-56 -translate-x-1/2 rounded-[4px] border border-line-strong bg-[#0d1014] px-2 py-1 text-left text-[11px] text-ink-2 shadow-xl">
                    <span className="block tabular text-ink-3">{formatDate(event.at)}</span>
                    {event.label}
                  </span>
                )}
              </button>
            ))}
            <span className="absolute left-0 top-3 text-[11px] tabular text-ink-3">{formatDate(procurement[0]?.at ?? tender.publishedOn)}</span>
            <span className="absolute right-0 top-3 text-[11px] tabular text-ink-3">{formatDate(procurement[procurement.length - 1]?.at ?? tender.publishedOn)}</span>
          </div>
        </PanelBody>
      </Panel>

      <ol className="relative">
        {rows.map((event, index) => {
          const showDate = index === 0 || event.at.slice(0, 10) !== rows[index - 1].at.slice(0, 10);
          return (
            <motion.li
              key={event.id}
              id={`evt-${event.id}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 14) * 0.035 }}
              className="grid grid-cols-[4.5rem_1.5rem_1fr] gap-x-3 sm:grid-cols-[6rem_2rem_1fr]"
            >
              <div className="pt-3 text-right">
                {showDate && (
                  <>
                    <div className="type-title text-[15px] uppercase tabular text-ink">{formatDateShort(event.at)}</div>
                    <div className="text-[11px] tabular text-ink-3">{event.at.slice(0, 4)}</div>
                  </>
                )}
              </div>
              <div className="relative flex justify-center">
                <span className="absolute inset-y-0 w-px bg-line" aria-hidden />
                <span
                  className={cn(
                    "relative mt-4 flex items-center justify-center rounded-full border-2 border-ground",
                    event.unusual ? "h-4 w-4 bg-risk shadow-[0_0_0_4px_rgba(229,86,76,0.18)]" : event.activity ? "h-3 w-3 bg-rel" : cn("h-3 w-3", KIND_COLOR[event.kind]),
                  )}
                  aria-hidden
                />
              </div>
              <div className="pb-4">
                <div
                  className={cn(
                    "rounded-md border p-3.5",
                    event.unusual ? "border-risk/35 bg-risk/[0.05]" : event.activity ? "border-rel/25 bg-rel/[0.04]" : "border-line bg-panel",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] tabular text-ink-3">{formatTime(event.at)}</span>
                    <span className="text-[14px] font-medium text-ink">{event.label}</span>
                    {event.activity && <Badge tone="rel">Investigation</Badge>}
                    {event.unusual && (
                      <Badge tone="risk">
                        <TriangleAlert className="h-3 w-3" /> Unusual
                      </Badge>
                    )}
                    {event.recordId && <RecordChip id={event.recordId} className="ml-auto" />}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink-2">{event.detail}</p>
                  {event.annotation && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-[4px] border border-warn/30 bg-warn/[0.07] px-2.5 py-1.5 text-[13px] text-warn-ink">
                      <CircleDot aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">{event.annotation}</span>
                      {event.signalIds && event.signalIds.length > 0 && <RecordChips ids={event.signalIds} max={2} />}
                    </div>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
