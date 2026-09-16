"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, Check, ClipboardList, FileText, ListChecks, NotebookPen, Trash, Undo2 } from "lucide-react";
import { useState } from "react";
import { INVESTIGATORS, INVESTIGATOR_BY_ID, OUTCOME_META, STATUS_META, STATUS_ORDER, SIGNAL_TYPE_META } from "@/data/reference";
import { formatDateTime } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { InvestigationOutcome, NoteKind, SignalFeedback } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { ScoreDisclaimer } from "@/components/ui/notices";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OutcomeBadge, PRIORITY_TONE, PriorityBadge } from "@/components/ui/priority";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState } from "@/components/ui/states";

const FEEDBACK_OPTIONS: { value: SignalFeedback; label: string }[] = [
  { value: "RELEVANT", label: "Relevant" },
  { value: "NOT_RELEVANT", label: "Not relevant" },
  { value: "EXPLAINED", label: "Explained by context" },
];

const OUTCOMES: InvestigationOutcome[] = ["NO_ISSUE_FOUND", "EXPLAINED_BY_CONTEXT", "NEEDS_MORE_REVIEW", "REFERRED_FOR_AUDIT", "CLOSED"];

export function WorkspaceTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const setStatus = useAegis((s) => s.setStatus);
  const assign = useAegis((s) => s.assign);
  const addNote = useAegis((s) => s.addNote);
  const removeNote = useAegis((s) => s.removeNote);
  const setSignalFeedback = useAegis((s) => s.setSignalFeedback);
  const setOverride = useAegis((s) => s.setOverride);
  const setOutcome = useAegis((s) => s.setOutcome);
  const addChecklistItem = useAegis((s) => s.addChecklistItem);
  const toggleChecklistItem = useAegis((s) => s.toggleChecklistItem);
  const removeChecklistItem = useAegis((s) => s.removeChecklistItem);
  const savedEvidence = useAegis((s) => s.saved.EVIDENCE);
  const feedbackEvents = useAegis((s) => s.feedbackEvents);

  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<NoteKind>("NOTE");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [outcome, setOutcomeChoice] = useState<InvestigationOutcome>("NEEDS_MORE_REVIEW");
  const [outcomeNote, setOutcomeNote] = useState("");

  if (!view) return null;
  const { investigation, state, score, signals } = view;
  const evidenceSaved = investigation.evidence.filter((e) => savedEvidence.includes(e.id));
  const caseFeedback = feedbackEvents.filter((e) => e.caseId === caseId).slice(0, 4);
  const overrideNumber = Number(overrideValue);
  const overrideValid = overrideValue !== "" && Number.isFinite(overrideNumber) && overrideNumber >= 0 && overrideNumber <= 100 && overrideReason.trim().length >= 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Investigation workspace</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
            Where the investigator stays in control: status, assignment, signal feedback, notes, priority and the recorded outcome. Every change is written to the audit log.
          </p>
        </div>
        <ButtonLink href={`/investigations/${caseId}/brief`} variant="primary">
          <FileText className="h-4 w-4" /> Generate report preview
        </ButtonLink>
      </div>

      {/* Status */}
      <Panel>
        <PanelHeader title="Case status" description={STATUS_META[state.status].description} />
        <PanelBody>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {STATUS_ORDER.map((status, index) => {
              const active = state.status === status;
              const passed = STATUS_META[state.status].step > index;
              return (
                <li key={status} className="relative">
                  <button
                    type="button"
                    onClick={() => setStatus(caseId, status)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex h-full w-full flex-col items-start gap-1 overflow-hidden rounded-[5px] border px-3 py-2.5 text-left transition-colors",
                      active ? "border-accent/60 text-ink" : passed ? "border-line bg-panel-2 text-ink-2" : "border-line text-ink-3 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {active && <motion.span layoutId={`status-${caseId}`} className="absolute inset-0 bg-accent/15" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                    <span className="relative text-[10px] tabular text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                    <span className="relative text-[12px] font-semibold uppercase leading-tight tracking-[0.04em]">{STATUS_META[status].label}</span>
                    {passed && <Check className="absolute right-2 top-2 h-3 w-3 text-ok-ink" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Signal review */}
          <Panel>
            <PanelHeader
              title="Signal review"
              description="Mark each signal. Feedback changes this case's priority and is recorded to calibrate future scoring."
              icon={<ListChecks className="h-3.5 w-3.5" />}
            />
            <ul className="divide-y divide-line">
              {signals.map((signal) => {
                const current = state.signalFeedback[signal.id];
                return (
                  <li key={signal.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-3">{signal.id}</span>
                      <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
                      <span className="text-xs text-ink-3">{SIGNAL_TYPE_META[signal.type].label}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink">{signal.headline}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {FEEDBACK_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={current === option.value}
                          onClick={() => setSignalFeedback(caseId, signal.id, current === option.value ? null : option.value)}
                          className={cn(
                            "h-7 rounded-[4px] border px-2.5 text-xs font-medium transition-colors",
                            current === option.value
                              ? option.value === "RELEVANT"
                                ? "border-accent/60 bg-accent/15 text-accent-ink"
                                : option.value === "EXPLAINED"
                                  ? "border-ok/60 bg-ok/15 text-ok-ink"
                                  : "border-slate/60 bg-slate/15 text-slate-ink"
                              : "border-line-strong text-ink-3 hover:text-ink",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {current === "EXPLAINED" && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 flex items-start gap-1.5 overflow-hidden text-xs text-ok-ink">
                          <ArrowDownRight className="mt-px h-3.5 w-3.5 shrink-0" /> Signal priority reduced. Reason: context explains observed variation.
                        </motion.p>
                      )}
                      {current === "NOT_RELEVANT" && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 flex items-start gap-1.5 overflow-hidden text-xs text-slate-ink">
                          <ArrowDownRight className="mt-px h-3.5 w-3.5 shrink-0" /> Removed from this case&apos;s score and recorded as a false positive.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
            {caseFeedback.length > 0 && (
              <div className="border-t border-line bg-panel-2/40 px-4 py-3">
                <div className="type-label mb-2">Investigator feedback</div>
                <ul className="space-y-1.5">
                  {caseFeedback.map((event) => (
                    <li key={event.id} className="text-xs leading-snug text-ink-2">
                      <span className="tabular text-ink-3">{formatDateTime(event.at)}</span> · {event.effect}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {/* Notes */}
          <Panel>
            <PanelHeader title="Investigator notes" icon={<NotebookPen className="h-3.5 w-3.5" />} />
            <PanelBody className="space-y-4">
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addNote(caseId, note, noteKind);
                  setNote("");
                }}
              >
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Review vendor ownership records and historical joint participation."
                  aria-label="Investigator note"
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Select aria-label="Note type" value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)} wrapperClassName="w-44">
                    <option value="NOTE">Case note</option>
                    <option value="CONTEXT">Context note</option>
                    <option value="EVIDENCE">Evidence note</option>
                  </Select>
                  <Button type="submit" variant="primary" size="sm" disabled={!note.trim()}>
                    Add note
                  </Button>
                  <button
                    type="button"
                    onClick={() => setNote("Review vendor ownership records and historical joint participation.")}
                    className="text-xs text-ink-3 hover:text-ink"
                  >
                    Use suggested note
                  </button>
                </div>
              </form>
              {state.notes.length ? (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {state.notes.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="group rounded-[5px] border border-line bg-panel-2/50 p-3"
                      >
                        <div className="flex items-center gap-2 text-[11px] text-ink-3">
                          <Badge tone={item.kind === "CONTEXT" ? "ok" : item.kind === "EVIDENCE" ? "accent" : item.kind === "STATUS" ? "rel" : "neutral"}>
                            {item.kind === "NOTE" ? "Note" : item.kind.toLowerCase()}
                          </Badge>
                          <span>{INVESTIGATOR_BY_ID[item.authorId]?.name}</span>
                          <span className="tabular">{formatDateTime(item.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => removeNote(caseId, item.id)}
                            aria-label="Delete note"
                            className="ml-auto rounded p-1 text-ink-3 opacity-0 transition-opacity hover:text-risk-ink focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{item.text}</p>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="text-[13px] text-ink-3">No notes yet. Notes appear in the investigation brief.</p>
              )}
            </PanelBody>
          </Panel>

          {/* Checklist */}
          <Panel>
            <PanelHeader
              title="Investigation checklist"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              actions={
                investigation.questions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => investigation.questions.forEach((q) => addChecklistItem(caseId, q.text, q.id))}
                  >
                    Add all suggested questions
                  </Button>
                )
              }
            />
            {state.checklist.length ? (
              <ul className="divide-y divide-line">
                {state.checklist.map((item) => (
                  <li key={item.id} className="group flex items-start gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(caseId, item.id)}
                      aria-label={item.text}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#2f6fe0]"
                    />
                    <span className={cn("flex-1 text-[13px] leading-snug", item.done ? "text-ink-3 line-through" : "text-ink")}>{item.text}</span>
                    <button type="button" onClick={() => removeChecklistItem(caseId, item.id)} aria-label="Remove item" className="text-ink-3 opacity-0 hover:text-risk-ink focus-visible:opacity-100 group-hover:opacity-100">
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ListChecks} title="Checklist is empty" description="Add suggested questions, or send questions here from the AI assistant." className="py-8" />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Assignment */}
          <Panel>
            <PanelHeader title="Assignment" />
            <PanelBody>
              <Field label="Investigator">
                <Select value={state.assigneeId ?? ""} onChange={(e) => e.target.value && assign(caseId, e.target.value)}>
                  <option value="">Unassigned</option>
                  {INVESTIGATORS.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} — {inv.role}
                    </option>
                  ))}
                </Select>
              </Field>
            </PanelBody>
          </Panel>

          {/* Priority */}
          <Panel>
            <PanelHeader title="Investigation priority" actions={<PriorityBadge level={score.level} score={score.total} />} />
            <PanelBody className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[5px] border border-line p-2">
                  <div className="text-[11px] text-ink-3">Base</div>
                  <div className="type-title text-xl tabular text-ink-2">{score.base}</div>
                </div>
                <div className="rounded-[5px] border border-line p-2">
                  <div className="text-[11px] text-ink-3">After context & feedback</div>
                  <div className="type-title text-xl tabular text-ink">{score.computed}</div>
                </div>
                <div className="rounded-[5px] border border-accent/40 bg-accent/[0.06] p-2">
                  <div className="text-[11px] text-ink-3">Current</div>
                  <div className="type-title text-xl tabular text-ink">{score.total}</div>
                </div>
              </div>
              {state.override ? (
                <div className="flex items-start justify-between gap-3 rounded-[5px] border border-warn/30 bg-warn/[0.06] p-3 text-[13px]">
                  <div>
                    <div className="font-medium text-warn-ink">Set manually to {state.override.value}</div>
                    <div className="mt-0.5 text-ink-2">{state.override.reason}</div>
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => setOverride(caseId, null)}>
                    <Undo2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!overrideValid) return;
                    setOverride(caseId, Math.round(overrideNumber), overrideReason);
                    setOverrideValue("");
                    setOverrideReason("");
                  }}
                >
                  <div className="grid grid-cols-[6rem_1fr] gap-2">
                    <Input type="number" min={0} max={100} inputMode="numeric" value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} placeholder="0–100" aria-label="Priority value" />
                    <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason for changing priority" />
                  </div>
                  <Button type="submit" size="sm" disabled={!overrideValid}>
                    Change case priority
                  </Button>
                  <p className="text-xs text-ink-3">A manual priority keeps the computed score visible and is recorded with its reason.</p>
                </form>
              )}
              <ScoreDisclaimer />
            </PanelBody>
          </Panel>

          {/* Outcome */}
          <Panel>
            <PanelHeader title="Investigation outcome" description="Classify the case once reviewed. Outcomes feed back into how similar signals are prioritized." />
            <PanelBody className="space-y-3">
              {state.outcome && (
                <div className="rounded-[5px] border border-line bg-panel-2/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <OutcomeBadge outcome={state.outcome.outcome} />
                    <span className="text-[11px] tabular text-ink-3">{formatDateTime(state.outcome.at)}</span>
                  </div>
                  {state.outcome.note && <p className="mt-1.5 text-[13px] text-ink-2">{state.outcome.note}</p>}
                  {state.outcome.outcome === "EXPLAINED_BY_CONTEXT" && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ok-ink">
                      <ArrowDownRight className="mt-px h-3.5 w-3.5 shrink-0" /> Signal priority reduced. Context explains observed variation.
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-1.5">
                {OUTCOMES.map((value) => (
                  <label key={value} className={cn("flex cursor-pointer items-start gap-2.5 rounded-[5px] border px-3 py-2 transition-colors", outcome === value ? "border-accent/50 bg-accent/[0.06]" : "border-line hover:border-line-strong")}>
                    <input type="radio" name={`outcome-${caseId}`} value={value} checked={outcome === value} onChange={() => setOutcomeChoice(value)} className="mt-1 accent-[#2f6fe0]" />
                    <span>
                      <span className="block text-[13px] font-medium uppercase tracking-[0.03em] text-ink">{OUTCOME_META[value].label}</span>
                      <span className="block text-xs text-ink-3">{OUTCOME_META[value].description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <Textarea value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} rows={2} placeholder="Outcome note" aria-label="Outcome note" />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setOutcome(caseId, outcome, outcomeNote.trim());
                  setOutcomeNote("");
                }}
              >
                Record outcome
              </Button>
            </PanelBody>
          </Panel>

          {/* Saved evidence */}
          <Panel>
            <PanelHeader title="Saved evidence" actions={<Link href={`/investigations/${caseId}/evidence`} className="text-xs text-accent-ink hover:underline">Evidence</Link>} />
            <PanelBody>
              {evidenceSaved.length ? (
                <ul className="space-y-2">
                  {evidenceSaved.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-[13px]">
                      <RecordChip id={e.recordId} />
                      <span className="truncate text-ink-2">{e.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-3">Bookmark records in the evidence tab to keep them here.</p>
              )}
            </PanelBody>
          </Panel>

          {/* Activity */}
          <Panel>
            <PanelHeader title="Case activity" />
            <PanelBody>
              {state.history.length ? (
                <ol className="space-y-2.5">
                  {state.history.slice(0, 12).map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="flex gap-3 text-[13px]">
                      <span className="w-28 shrink-0 text-[11px] tabular text-ink-3">{formatDateTime(entry.at)}</span>
                      <span className="text-ink-2">
                        {entry.kind === "STATUS" && `Status ${STATUS_META[entry.from as keyof typeof STATUS_META]?.label ?? entry.from} → ${STATUS_META[entry.to as keyof typeof STATUS_META]?.label ?? entry.to}`}
                        {entry.kind === "PRIORITY" && `Priority changed ${entry.from} → ${entry.to}`}
                        {entry.kind === "ASSIGNMENT" && `Assigned to ${INVESTIGATOR_BY_ID[entry.to]?.name ?? entry.to}`}
                        {entry.kind === "CONTEXT" && `${entry.to}${entry.note ? `: ${entry.note}` : ""}`}
                        {entry.kind === "FEEDBACK" && `Signal feedback ${entry.to.toLowerCase().replaceAll("_", " ")}${entry.note ? ` · ${entry.note}` : ""}`}
                        {entry.kind === "OUTCOME" && `Outcome: ${entry.to}`}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-ink-3">Changes you make on this case are listed here and in the system audit log.</p>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
