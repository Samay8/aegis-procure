"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BellRing, CircleCheck, FolderPlus, RotateCcw, SearchX, CircleX } from "lucide-react";
import { useMemo, useState } from "react";
import { ALERT_FILTERS, DEPARTMENT_BY_ID, SIGNAL_TYPE_META } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatPct } from "@/lib/format";
import { useSignalViews } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { AnomalySignal, PriorityLevel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchInput, Select, Textarea } from "@/components/ui/fields";
import { CATEGORY_ICON } from "@/components/ui/icons";
import { ImportantContext } from "@/components/ui/notices";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PRIORITY_TONE } from "@/components/ui/priority";
import { RecordChips } from "@/components/ui/record-chip";
import { ConfidenceTag } from "@/components/ui/signal-badge";
import { EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/tabs";
import { TrustPanel } from "@/components/case/signal-card";

function formatComparison(signal: AnomalySignal, value: number) {
  const unit = signal.comparison?.unit;
  if (unit === "INR") return formatINR(value);
  if (unit === "PCT") return `${value.toFixed(1)}%`;
  if (unit === "DAYS") return `${value} days`;
  return String(value);
}

function AlertDetail({ signal, onClose }: { signal: AnomalySignal; onClose: () => void }) {
  const router = useRouter();
  const review = useAegis((s) => s.signalReviews[signal.id]);
  const reviewSignal = useAegis((s) => s.reviewSignal);
  const createCase = useAegis((s) => s.createCaseFromSignal);
  const [reason, setReason] = useState("");
  const Icon = CATEGORY_ICON[signal.category];

  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()} priority</Badge>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            <Icon className="h-3.5 w-3.5" /> {SIGNAL_TYPE_META[signal.type].label}
          </span>
          {review && <Badge tone={review.status === "EXPLAINED" ? "ok" : "slate"}>{review.status.toLowerCase()}</Badge>}
        </div>
        <div className="type-label mt-4 !text-risk-ink">Signal detected</div>
        <h3 className="type-title mt-1 text-2xl uppercase text-ink">{signal.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{signal.headline}</p>
      </div>

      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[5px] border border-line bg-line sm:grid-cols-2">
        <div className="bg-panel-2 px-3 py-2.5">
          <dt className="text-[11px] text-ink-3">Vendor</dt>
          <dd className="mt-0.5 text-[14px] text-ink">
            {signal.vendorIds.slice(0, 2).map((id, i) => (
              <span key={id}>
                {i > 0 && ", "}
                <Link href={`/vendors/${id}`} className="hover:underline">
                  {vendorName(id)}
                </Link>
              </span>
            ))}
            {signal.vendorIds.length > 2 && <span className="text-ink-3"> +{signal.vendorIds.length - 2}</span>}
          </dd>
        </div>
        <div className="bg-panel-2 px-3 py-2.5">
          <dt className="text-[11px] text-ink-3">Department</dt>
          <dd className="mt-0.5 text-[14px] text-ink">{DEPARTMENT_BY_ID[signal.departmentId].name}</dd>
        </div>
        {signal.metrics.slice(0, 4).map((m, i, shown) => (
          <div key={m.label} className={cn("bg-panel-2 px-3 py-2.5", i === shown.length - 1 && shown.length % 2 === 1 && "sm:col-span-2")}>
            <dt className="text-[11px] text-ink-3">{m.label}</dt>
            <dd className="mt-0.5 text-[14px] font-semibold tabular text-ink">{m.value}</dd>
          </div>
        ))}
      </dl>

      {signal.comparison && (
        <div className="rounded-[5px] border border-line p-3">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink-2">{signal.comparison.label}</span>
            <span className="tabular font-semibold text-ink">{formatComparison(signal, signal.comparison.current)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink-3">{signal.comparison.baselineLabel}</span>
            <span className="tabular text-ink-2">{formatComparison(signal, signal.comparison.baseline)}</span>
          </div>
          {signal.comparison.unit === "INR" && (
            <div className="mt-1 text-right text-xs text-warn-ink">
              {formatPct(((signal.comparison.current - signal.comparison.baseline) / signal.comparison.baseline) * 100, 1, true)}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 text-[14px] leading-relaxed">
        <p>
          <span className="type-label mr-2">Context</span>
          <span className="text-ink-2">{signal.context}</span>
        </p>
        <p className="rounded-[5px] border-l-2 border-warn/60 bg-warn/[0.05] py-2 pl-3 pr-2 text-ink">
          <span className="font-medium">Therefore: </span>
          {signal.alternatives[0]} may explain part of this pattern. {signal.recommendedAction}
        </p>
      </div>

      <ConfidenceTag confidence={signal.confidence} />

      <div>
        <div className="type-label mb-2">Why should I trust this alert?</div>
        <TrustPanel signal={signal} />
      </div>

      {signal.evidenceIds.length > 0 && (
        <div>
          <div className="type-label mb-2">Records</div>
          <RecordChips ids={signal.evidenceIds} max={8} />
        </div>
      )}

      <div className="space-y-3 border-t border-line pt-5">
        <div className="flex flex-wrap gap-2">
          {signal.caseId ? (
            <ButtonLink href={`/investigations/${signal.caseId}`} variant="primary" onClick={onClose}>
              Open {signal.caseId} <ArrowUpRight className="h-4 w-4" />
            </ButtonLink>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                const id = createCase(signal.id);
                if (id) {
                  onClose();
                  router.push(`/investigations/${id}`);
                }
              }}
            >
              <FolderPlus className="h-4 w-4" /> Open investigation
            </Button>
          )}
          {signal.tenderIds[0] && (
            <ButtonLink href={`/procurement/${signal.tenderIds[0]}`} onClick={onClose}>
              {signal.actionLabel}
            </ButtonLink>
          )}
        </div>
        {!signal.caseId && (
          <div className="rounded-[5px] border border-line p-3">
            <div className="type-label mb-2">Investigator feedback</div>
            {review ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-2">
                <span>
                  {review.status === "EXPLAINED" ? "Signal priority reduced. Context explains observed variation." : "Dismissed from the queue."} Reason: {review.reason}
                </span>
                <Button size="xs" variant="ghost" onClick={() => reviewSignal(signal.id, null)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reopen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. higher specification confirmed in tender documents" aria-label="Feedback reason" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => reviewSignal(signal.id, "EXPLAINED", reason)}>
                    <CircleCheck className="h-3.5 w-3.5" /> Explained by context
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reviewSignal(signal.id, "DISMISSED", reason)}>
                    <CircleX className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ImportantContext items={signal.alternatives} />
    </div>
  );
}

export function AlertCenter({ initialSignal }: { initialSignal?: string }) {
  const views = useSignalViews();
  const filter = useAegis((s) => s.alertFilter);
  const setFilter = useAegis((s) => s.setAlertFilter);
  const [status, setStatus] = useState<"OPEN" | "REVIEWED" | "ALL">("OPEN");
  const [severity, setSeverity] = useState<PriorityLevel | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialSignal ?? null);

  const groups = ALERT_FILTERS;
  const active = groups.find((g) => g.id === filter) ?? groups[0];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return views
      .filter(({ signal, review }) => {
        if (!active.categories.includes(signal.category)) return false;
        if (status === "OPEN" && review) return false;
        if (status === "REVIEWED" && !review) return false;
        if (severity !== "ALL" && signal.severity !== severity) return false;
        if (q && ![signal.id, signal.title, signal.headline, ...signal.vendorIds.map(vendorName), ...signal.tenderIds].join(" ").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.signal.strength - a.signal.strength);
  }, [views, active, status, severity, query]);

  const openSignal = views.find((v) => v.signal.id === openId)?.signal;

  return (
    <div>
      <PageHeader
        meta={
          <>
            <BellRing className="h-3.5 w-3.5" /> {views.filter((v) => !v.review).length} open signals
          </>
        }
        title="Signal center"
        description="Every alert explains itself: what was measured, against what baseline, with which context, and what an investigator should check next."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {groups.map((group) => {
          const count = views.filter((v) => !v.review && group.categories.includes(v.signal.category)).length;
          const isActive = group.id === active.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setFilter(group.id)}
              aria-pressed={isActive}
              className={cn(
                "flex h-8 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors",
                isActive ? "border-accent/60 bg-accent/15 text-accent-ink" : "border-line-strong text-ink-2 hover:text-ink",
              )}
            >
              {group.label}
              <span className="tabular text-xs text-ink-3">{count}</span>
            </button>
          );
        })}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Search signals, vendors or tenders…" className="md:w-80" label="Search signals" />
          <Select aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as PriorityLevel | "ALL")} wrapperClassName="md:w-44">
            <option value="ALL">Any severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          <Segmented
            label="Review status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "OPEN", label: "Open" },
              { value: "REVIEWED", label: "Reviewed" },
              { value: "ALL", label: "All" },
            ]}
            className="md:ml-auto"
          />
        </div>

        {list.length === 0 ? (
          <EmptyState icon={SearchX} title="No alerts" description={status === "REVIEWED" ? "No signals have been marked explained or dismissed yet." : "No signals match the selected filters. Try broadening the search."} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map(({ signal, review }) => {
              const Icon = CATEGORY_ICON[signal.category];
              return (
                <li key={signal.id} className={cn("px-4 py-4 transition-colors hover:bg-panel-2/60", review && "opacity-70")}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border", signal.severity === "HIGH" || signal.severity === "CRITICAL" ? "border-risk/35 bg-risk/10 text-risk-ink" : "border-line-strong bg-panel-2 text-ink-2")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()} priority</Badge>
                          <span className="font-mono text-[11px] text-ink-3">{signal.id}</span>
                          {signal.caseId && <Badge tone="accent">{signal.caseId}</Badge>}
                          {signal.imported && <Badge tone="accent">Imported</Badge>}
                          {review && <Badge tone={review.status === "EXPLAINED" ? "ok" : "slate"}>{review.status.toLowerCase()}</Badge>}
                        </div>
                        <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{signal.title}</h3>
                        <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{signal.headline}</p>
                        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                          <div>
                            <dt className="inline text-ink-3">Vendor </dt>
                            <dd className="inline text-ink-2">{signal.vendorIds.map(vendorName).slice(0, 2).join(", ") || "—"}</dd>
                          </div>
                          <div>
                            <dt className="inline text-ink-3">Department </dt>
                            <dd className="inline text-ink-2">{DEPARTMENT_BY_ID[signal.departmentId].short}</dd>
                          </div>
                          <div>
                            <dt className="inline text-ink-3">Evidence </dt>
                            <dd className="inline text-ink-2">{signal.metrics.slice(0, 2).map((m) => `${m.label.toLowerCase()} ${m.value}`).join(" · ")}</dd>
                          </div>
                          <div>
                            <dt className="inline text-ink-3">Detected </dt>
                            <dd className="inline tabular text-ink-2">{formatDate(signal.detectedOn)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 lg:flex-col lg:items-end">
                      <Button size="sm" variant="secondary" className="uppercase tracking-[0.04em]" onClick={() => setOpenId(signal.id)}>
                        {signal.actionLabel}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Drawer open={Boolean(openSignal)} onClose={() => setOpenId(null)} title="Signal detail" subtitle={openSignal?.id}>
        {openSignal && <AlertDetail signal={openSignal} onClose={() => setOpenId(null)} />}
      </Drawer>
    </div>
  );
}
