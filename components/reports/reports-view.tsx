"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText } from "lucide-react";
import { useState } from "react";
import { ACTIVE_STATUSES } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatDateTime, formatINR } from "@/lib/format";
import { useCaseViews } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/fields";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OutcomeBadge, PriorityBadge, StatusBadge } from "@/components/ui/priority";

export function ReportsView() {
  const router = useRouter();
  const views = useCaseViews();
  const [selected, setSelected] = useState("INV-2026-0042");
  const active = views.filter((v) => ACTIVE_STATUSES.includes(v.state.status)).sort((a, b) => b.score.total - a.score.total);
  const closed = views.filter((v) => !ACTIVE_STATUSES.includes(v.state.status));

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <FileText className="h-3.5 w-3.5" /> Investigation briefs
          </>
        }
        title="Reports"
        description="Printable briefs that keep observed data, detected signals, interpretation and investigator notes visibly separate."
      />

      <Panel>
        <PanelHeader title="Generate investigation brief" />
        <PanelBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Case" className="sm:w-[28rem]">
            <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {views.map((v) => (
                <option key={v.investigation.id} value={v.investigation.id}>
                  {v.investigation.id} · {v.investigation.title}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="primary" className="uppercase tracking-[0.05em]" onClick={() => router.push(`/reports/${selected}`)}>
            Generate investigation brief
          </Button>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Active cases" description="Briefs reflect the current status, context adjustments and notes." />
        <ul className="divide-y divide-line">
          {active.map(({ investigation, state, score }) => (
            <li key={investigation.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-ink-3">{investigation.id}</div>
                <div className="truncate text-[14px] text-ink">{investigation.title}</div>
                <div className="text-xs text-ink-3">
                  {vendorName(investigation.vendorId)} · {formatINR(investigation.value)} · {state.notes.length} notes
                  {state.history[0] && ` · last change ${formatDateTime(state.history[0].at)}`}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge level={score.level} score={score.total} label={false} />
                <StatusBadge status={state.status} />
                <Link href={`/reports/${investigation.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line-strong px-3 text-xs font-medium text-ink hover:bg-panel-3">
                  Open brief <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Closed cases" />
        <ul className="divide-y divide-line">
          {closed.map(({ investigation, state }) => (
            <li key={investigation.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-ink-3">{investigation.id}</div>
                <div className="truncate text-[14px] text-ink">{investigation.title}</div>
              </div>
              <div className="flex items-center gap-2">
                {state.outcome && <OutcomeBadge outcome={state.outcome.outcome} />}
                <Link href={`/reports/${investigation.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line-strong px-3 text-xs font-medium text-ink hover:bg-panel-3">
                  Open brief <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
