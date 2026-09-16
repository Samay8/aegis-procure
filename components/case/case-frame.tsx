"use client";

import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Bot,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  CalendarClock,
  Lightbulb,
  Network,
  Scale,
  ScrollText,
} from "lucide-react";
import type { ReactNode } from "react";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, INVESTIGATOR_BY_ID, REGION_BY_ID } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatCr, formatDate } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { ButtonLink } from "@/components/ui/button";
import { SyntheticNotice } from "@/components/ui/notices";
import { PriorityBadge, PriorityMeter, ScoreFigure, StatusBadge } from "@/components/ui/priority";
import { RecordChip } from "@/components/ui/record-chip";
import { ErrorState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";

export function CaseFrame({ caseId, children }: { caseId: string; children: ReactNode }) {
  const view = useCaseView(caseId);
  const saved = useAegis((s) => s.saved.CASE.includes(caseId));
  const toggleSaved = useAegis((s) => s.toggleSaved);

  if (!view) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorState
          title="Unable to load investigation record"
          description={`No case with id ${caseId} exists in this workspace. It may have been created in another browser, or the link is mistyped.`}
        />
        <div className="mt-4">
          <ButtonLink href="/investigations" size="sm">
            Back to the investigation queue
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { investigation, state, score } = view;
  const base = `/investigations/${investigation.id}`;
  const assignee = state.assigneeId ? INVESTIGATOR_BY_ID[state.assigneeId] : undefined;
  const historical = Boolean(investigation.historical);

  const tabs = [
    { href: base, label: "Why flagged", exact: true, icon: Lightbulb },
    { href: `${base}/evidence`, label: "Evidence", count: investigation.evidence.length, icon: ScrollText },
    { href: `${base}/bids`, label: "Bids & comparables", icon: Gavel },
    { href: `${base}/relationships`, label: "Relationships", icon: Network },
    { href: `${base}/context`, label: "Context check", count: investigation.contextChecks.length || undefined, icon: Scale },
    { href: `${base}/timeline`, label: "Timeline", icon: CalendarClock },
    { href: `${base}/assistant`, label: "AI assistant", icon: Bot },
    { href: `${base}/workspace`, label: "Workspace", icon: ClipboardList },
    { href: `${base}/brief`, label: "Brief", icon: FileText },
  ];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/investigations" className="hover:text-ink">
          Investigations
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono text-ink-2">{investigation.id}</span>
      </nav>

      <header className="grid grid-cols-1 gap-6 border-b border-line pb-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label">Investigation case</span>
            <span className="font-mono text-xs text-ink-2">{investigation.id}</span>
            <StatusBadge status={state.status} />
            {investigation.userCreated && <span className="text-xs text-accent-ink">Opened from a signal</span>}
          </div>
          <h1 className="type-display mt-3 text-[30px] uppercase text-ink sm:text-[42px]">{investigation.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
            {investigation.tenderId && <RecordChip id={investigation.tenderId} />}
            <span>{DEPARTMENT_BY_ID[investigation.departmentId].name}</span>
            <span className="text-ink-3">{CATEGORY_BY_ID[investigation.categoryId].name}</span>
            <span className="text-ink-3">{REGION_BY_ID[investigation.regionId].name}</span>
            <span className="tabular text-ink">{formatCr(investigation.value)}</span>
            <Link href={`/vendors/${investigation.vendorId}`} className="text-accent-ink hover:underline">
              {vendorName(investigation.vendorId)}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
            <span>
              Primary signal <span className="text-ink-2">{investigation.primarySignal}</span>
            </span>
            <span>
              Investigator <span className="text-ink-2">{assignee ? `${assignee.name} · assigned` : "Unassigned"}</span>
            </span>
            <span>
              Opened <span className="tabular text-ink-2">{formatDate(investigation.openedOn.slice(0, 10))}</span>
            </span>
            <SyntheticNotice compact />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-line bg-panel p-4 lg:w-[320px]">
          <div className="flex items-center justify-between gap-2">
            <span className="type-label">{historical ? "Priority at review" : "Investigation priority"}</span>
            <PriorityBadge level={score.level} />
          </div>
          <ScoreFigure score={score.total} base={score.base} size="lg" />
          <PriorityMeter score={score.total} className="mt-1" />
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => toggleSaved("CASE", investigation.id)}
              aria-pressed={saved}
              className={cn(
                "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] border text-xs font-medium transition-colors",
                saved ? "border-accent/50 bg-accent/10 text-accent-ink" : "border-line-strong text-ink-2 hover:bg-panel-3 hover:text-ink",
              )}
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              {saved ? "Saved" : "Save case"}
            </button>
            <ButtonLink href={`${base}/brief`} size="sm" variant="secondary" className="flex-1">
              <FileText className="h-3.5 w-3.5" /> Brief
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="sticky top-14 z-10 -mx-4 bg-ground/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-4">
          <LinkTabs items={tabs} className="min-w-0 flex-1" layoutId={`case-tabs-${investigation.id}`} />
          <div className="hidden shrink-0 items-center gap-2 border-b border-line pb-[9px] pt-2.5 text-xs text-ink-3 xl:flex">
            <span className="font-mono">{investigation.id}</span>
            <span className={cn("type-title tabular text-base", score.level === "MEDIUM" ? "text-warn-ink" : score.level === "LOW" ? "text-slate-ink" : "text-risk-ink")}>
              {score.total}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-6">{children}</div>
    </div>
  );
}
