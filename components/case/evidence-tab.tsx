"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, FileSearch, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { EVIDENCE_GROUP_META } from "@/data/reference";
import { SIGNAL_BY_ID } from "@/data/signals";
import { formatDate } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { Evidence, EvidenceGroup } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, SearchInput, Select } from "@/components/ui/fields";
import { EVIDENCE_ICON } from "@/components/ui/icons";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState } from "@/components/ui/states";

const GROUP_ORDER: EvidenceGroup[] = ["PROCUREMENT", "BIDS", "VENDOR", "CONTRACT", "PAYMENT", "RELATIONSHIP", "COMPARABLE"];

export function EvidenceCard({ evidence, index = 0 }: { evidence: Evidence; index?: number }) {
  const saved = useAegis((s) => s.saved.EVIDENCE.includes(evidence.id));
  const toggleSaved = useAegis((s) => s.toggleSaved);

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.03 }}
      className={cn("flex flex-col rounded-md border bg-panel", evidence.neutral ? "border-line" : "border-line")}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label">{evidence.kind}</span>
            {evidence.neutral && <Badge tone="ok">No signal</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <RecordChip id={evidence.recordId} />
            <span>{evidence.source}</span>
            <span className="tabular">{formatDate(evidence.date)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggleSaved("EVIDENCE", evidence.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved evidence" : "Save evidence"}
          title={saved ? "Saved" : "Save evidence"}
          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] transition-colors", saved ? "text-accent-ink" : "text-ink-3 hover:bg-panel-3 hover:text-ink")}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-[15px] font-semibold leading-snug text-ink">{evidence.title}</h3>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {evidence.fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[11px] text-ink-3">{field.label}</dt>
              <dd className="text-[13px] leading-snug text-ink-2">{field.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Relevant value</span>
            <span className={cn("rounded-[3px] px-1.5 py-0.5 text-[13px] font-semibold", evidence.neutral ? "bg-ok/10 text-ok-ink" : "bg-warn/10 text-warn-ink")}>
              {evidence.relevantValue}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Why it matters. </span>
            {evidence.whyItMatters}
          </p>
          {evidence.signalIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {evidence.signalIds.map((id) => (
                <span key={id} className="text-[11px] text-ink-3" title={SIGNAL_BY_ID.get(id)?.title}>
                  <RecordChip id={id} />
                </span>
              ))}
            </div>
          )}
          {evidence.href && (
            <Link href={evidence.href} className="inline-block text-xs text-accent-ink hover:underline">
              Open record
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function EvidenceTab({ caseId, initialSignal }: { caseId: string; initialSignal?: string }) {
  const view = useCaseView(caseId);
  const savedIds = useAegis((s) => s.saved.EVIDENCE);
  const [group, setGroup] = useState<EvidenceGroup | "ALL">("ALL");
  const [signal, setSignal] = useState(initialSignal ?? "ALL");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const evidence = useMemo(() => view?.investigation.evidence ?? [], [view]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evidence.filter((e) => {
      if (group !== "ALL" && e.group !== group) return false;
      if (signal !== "ALL" && !e.signalIds.includes(signal)) return false;
      if (savedOnly && !savedIds.includes(e.id)) return false;
      if (q && ![e.title, e.kind, e.recordId, e.source, e.whyItMatters, ...e.fields.map((f) => f.value)].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [evidence, group, signal, query, savedOnly, savedIds]);

  if (!view) return null;
  const { signals } = view;
  const activeSignal = signal !== "ALL" ? SIGNAL_BY_ID.get(signal) ?? signals.find((s) => s.id === signal) : undefined;

  return (
    <div>
      <div className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Evidence</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
            {evidence.length} records behind this case, grouped by source. Each shows where it came from, the value that matters, and why an investigator should look at it.
          </p>
        </div>
        <span className="text-xs text-ink-3">{savedIds.filter((id) => evidence.some((e) => e.id === id)).length} saved</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["ALL", ...GROUP_ORDER] as const).map((g) => {
          const count = g === "ALL" ? evidence.length : evidence.filter((e) => e.group === g).length;
          if (!count) return null;
          const active = group === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={active}
              onClick={() => setGroup(g)}
              className={cn(
                "flex h-7 items-center gap-2 rounded-full border px-3 text-xs transition-colors",
                active ? "border-accent/60 bg-accent/15 text-accent-ink" : "border-line-strong text-ink-2 hover:text-ink",
              )}
            >
              {g === "ALL" ? "All evidence" : EVIDENCE_GROUP_META[g].label}
              <span className="tabular text-ink-3">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-md border border-line bg-panel p-3 md:flex-row md:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search records…" className="md:w-64" label="Search evidence" />
        <Select aria-label="Filter by signal" value={signal} onChange={(e) => setSignal(e.target.value)} wrapperClassName="md:w-80">
          <option value="ALL">All signals</option>
          {signals.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} · {s.title}
            </option>
          ))}
        </Select>
        <Checkbox checked={savedOnly} onChange={setSavedOnly} label="Saved only" className="md:ml-2" />
        {(group !== "ALL" || signal !== "ALL" || query || savedOnly) && (
          <Button
            variant="ghost"
            size="sm"
            className="md:ml-auto"
            onClick={() => {
              setGroup("ALL");
              setSignal("ALL");
              setQuery("");
              setSavedOnly(false);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {activeSignal && (
        <div className="mb-6 rounded-md border border-warn/30 bg-warn/[0.05] p-3 text-[13px] text-ink-2">
          Showing evidence for <span className="font-medium text-ink">{activeSignal.title}</span> — {activeSignal.headline}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-md border border-line bg-panel">
          <EmptyState icon={savedOnly ? FileSearch : SearchX} title={savedOnly ? "No saved evidence" : "No evidence found"} description={savedOnly ? "Save records with the bookmark on each card to collect them here." : "No records match the selected filters. Try broadening the search."} />
        </div>
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((g) => {
            const items = filtered.filter((e) => e.group === g);
            if (!items.length) return null;
            const Icon = EVIDENCE_ICON[g];
            return (
              <section key={g} aria-labelledby={`group-${g}`}>
                <div className="mb-3 flex items-baseline gap-3">
                  <Icon aria-hidden className="h-4 w-4 self-center text-ink-3" />
                  <h3 id={`group-${g}`} className="type-label !text-ink-2">
                    {EVIDENCE_GROUP_META[g].label}
                  </h3>
                  <span className="text-xs text-ink-3">{EVIDENCE_GROUP_META[g].description}</span>
                  <span className="ml-auto text-xs tabular text-ink-3">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {items.map((item, index) => (
                    <EvidenceCard key={item.id} evidence={item} index={index} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
