"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DEPARTMENT_BY_ID, INVESTIGATOR_BY_ID } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatINR } from "@/lib/format";
import type { ScoreResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { CaseState } from "@/store/aegis";
import type { InvestigationCase } from "@/types";
import { PriorityBadge, StatusBadge } from "@/components/ui/priority";

export interface QueueRow {
  investigation: InvestigationCase;
  state: CaseState;
  score: ScoreResult;
}

export function QueueTable({ rows, compact, className }: { rows: QueueRow[]; compact?: boolean; className?: string }) {
  const router = useRouter();

  return (
    <div className={className}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-medium">Case</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Primary signal</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              {!compact && <th className="px-4 py-2.5 font-medium">Vendor</th>}
              <th className="px-4 py-2.5 text-right font-medium">Evidence</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {!compact && <th className="px-4 py-2.5 font-medium">Assigned</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ investigation, state, score }) => {
              const href = `/investigations/${investigation.id}`;
              const changed = score.total !== score.base;
              return (
                <tr
                  key={investigation.id}
                  onClick={() => router.push(href)}
                  className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-panel-2"
                >
                  <td className="max-w-[18rem] px-4 py-3">
                    <Link href={href} onClick={(e) => e.stopPropagation()} className="block font-mono text-[11px] text-ink-3 group-hover:text-accent-ink">
                      {investigation.id}
                    </Link>
                    <span className="mt-0.5 block truncate text-ink">{investigation.title}</span>
                    {!compact && <span className="block truncate text-xs text-ink-3">{DEPARTMENT_BY_ID[investigation.departmentId].short}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("type-title w-8 text-right text-lg tabular", score.level === "HIGH" || score.level === "CRITICAL" ? "text-risk-ink" : score.level === "MEDIUM" ? "text-warn-ink" : "text-slate-ink")}>
                        {score.total}
                      </span>
                      <div>
                        <PriorityBadge level={score.level} label={false} />
                        {changed && <div className="mt-0.5 text-[10px] tabular text-ok-ink">was {score.base}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="min-w-[9rem] px-4 py-3 text-ink-2">{investigation.primarySignal}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular text-ink">{formatINR(investigation.value)}</td>
                  {!compact && <td className="max-w-[12rem] truncate px-4 py-3 text-ink-2">{vendorName(investigation.vendorId)}</td>}
                  <td className="px-4 py-3 text-right tabular text-ink-2">{investigation.evidence.length}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={state.status} />
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-ink-3">{state.assigneeId ? INVESTIGATOR_BY_ID[state.assigneeId]?.name : "Unassigned"}</td>
                  )}
                  <td className="pr-3">
                    <ChevronRight aria-hidden className="h-4 w-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {rows.map(({ investigation, state, score }) => (
          <li key={investigation.id}>
            <Link href={`/investigations/${investigation.id}`} className="block px-4 py-3.5 active:bg-panel-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-ink-3">{investigation.id}</div>
                  <div className="mt-0.5 truncate text-sm text-ink">{investigation.title}</div>
                  <div className="mt-0.5 text-xs text-ink-3">
                    {investigation.primarySignal} · {formatINR(investigation.value)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("type-title text-2xl tabular", score.level === "HIGH" || score.level === "CRITICAL" ? "text-risk-ink" : score.level === "MEDIUM" ? "text-warn-ink" : "text-slate-ink")}>
                    {score.total}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PriorityBadge level={score.level} label={false} />
                <StatusBadge status={state.status} />
                <span className="text-[11px] text-ink-3">{investigation.evidence.length} evidence items</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
