"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, CircleCheck, CornerDownLeft, ListPlus, ShieldCheck, Trash, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QUICK_ACTIONS, detectIntent, languageCheck, progressSteps, runAssistant, type AssistantContext } from "@/lib/ai";
import { formatTime, nowIST } from "@/lib/format";
import { useCaseView } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { AIAnalysis, AIBlockKind, AIIntent, AIMessage } from "@/types";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { AIDisclaimer } from "@/components/ui/notices";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RecordChips } from "@/components/ui/record-chip";
import { AnalysisSteps } from "@/components/ui/states";

const EMPTY: AIMessage[] = [];

const BLOCK_META: Record<AIBlockKind, { label: string; tone: Tone }> = {
  OBSERVED: { label: "Observed data", tone: "accent" },
  SIGNAL: { label: "Detected signal", tone: "warn" },
  CONTEXT: { label: "Context", tone: "ok" },
  INTERPRETATION: { label: "Interpretation", tone: "rel" },
  QUESTIONS: { label: "Investigation questions", tone: "accent" },
  LIMITS: { label: "Limits of the data", tone: "slate" },
  NEXT_STEPS: { label: "Next steps", tone: "neutral" },
};

function AnalysisView({ analysis, animate, caseId }: { analysis: AIAnalysis; animate: boolean; caseId: string }) {
  const checklist = useAegis((s) => s.cases[caseId]?.checklist);
  const addChecklistItem = useAegis((s) => s.addChecklistItem);
  const flagged = languageCheck(analysis);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="type-title text-lg text-ink">{analysis.title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{analysis.lead}</p>
      </div>
      {analysis.blocks.map((block, blockIndex) => (
        <motion.section
          key={`${block.kind}-${blockIndex}`}
          initial={animate ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: animate ? 0.12 + blockIndex * 0.16 : 0 }}
          className="rounded-[5px] border border-line bg-panel-2/50 p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={BLOCK_META[block.kind].tone}>{BLOCK_META[block.kind].label}</Badge>
            <span className="text-xs text-ink-3">{block.title}</span>
          </div>
          <ul className="space-y-2">
            {block.items.map((item, itemIndex) => {
              const added = checklist?.some((c) => c.text === item.text);
              return (
                <li key={itemIndex} className="flex gap-2.5 text-[13px] leading-relaxed text-ink">
                  <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                  <div className="min-w-0 flex-1">
                    <span>{item.text}</span>
                    {item.refs && item.refs.length > 0 && <RecordChips ids={item.refs} className="ml-2 align-middle" max={3} />}
                  </div>
                  {block.kind === "QUESTIONS" && (
                    <button
                      type="button"
                      onClick={() => addChecklistItem(caseId, item.text)}
                      disabled={added}
                      className={cn(
                        "flex h-7 shrink-0 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium transition-colors",
                        added ? "text-ok-ink" : "text-accent-ink hover:bg-accent/10",
                      )}
                    >
                      {added ? <Check className="h-3 w-3" /> : <ListPlus className="h-3 w-3" />}
                      {added ? "In checklist" : "Add to checklist"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </motion.section>
      ))}
      <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        {flagged.length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs text-ok-ink">
            <ShieldCheck className="h-3.5 w-3.5" /> Language check passed — no statement of misconduct
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-warn-ink">
            <TriangleAlert className="h-3.5 w-3.5" /> Language check flagged: {flagged.join(", ")}
          </span>
        )}
        <AIDisclaimer />
      </div>
    </div>
  );
}

export function AssistantTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const messages = useAegis((s) => s.ai[caseId]) ?? EMPTY;
  const addMessage = useAegis((s) => s.addAIMessage);
  const clearAI = useAegis((s) => s.clearAI);
  const log = useAegis((s) => s.log);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ intent: AIIntent; steps: string[]; step: number } | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<AssistantContext | null>(null);

  contextRef.current = view
    ? {
        investigation: view.investigation,
        score: view.score,
        signals: view.signals,
        notes: view.state.notes,
        feedback: view.state.signalFeedback,
        appliedContext: view.state.appliedContext,
        status: view.state.status,
      }
    : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending?.step]);

  useEffect(() => {
    if (!pending) return;
    if (pending.step >= pending.steps.length) {
      const ctx = contextRef.current;
      if (ctx) {
        const analysis = runAssistant(pending.intent, ctx);
        const id = uid("AI");
        addMessage(caseId, { id, role: "ASSISTANT", text: analysis.lead, analysis, createdAt: nowIST() });
        log({ action: "AI analysis generated", target: caseId, detail: analysis.title, actor: "Investigation assistant", actorKind: "AI" });
        setFreshId(id);
      }
      setPending(null);
      return;
    }
    const timer = window.setTimeout(() => setPending((p) => (p ? { ...p, step: p.step + 1 } : p)), 420);
    return () => window.clearTimeout(timer);
  }, [pending, caseId, addMessage, log]);

  if (!view) return null;

  const ask = (question: string, intent?: AIIntent) => {
    const text = question.trim();
    if (!text || pending || !contextRef.current) return;
    const resolved = intent ?? detectIntent(text);
    addMessage(caseId, { id: uid("Q"), role: "INVESTIGATOR", text, createdAt: nowIST() });
    setInput("");
    setPending({ intent: resolved, steps: progressSteps(resolved, contextRef.current), step: 0 });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-[7.5rem] xl:self-start">
        <Panel>
          <PanelHeader title="Ask the assistant" icon={<Bot className="h-3.5 w-3.5" />} />
          <PanelBody className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.intent}
                variant="secondary"
                className="w-full justify-start uppercase tracking-[0.04em]"
                size="sm"
                disabled={Boolean(pending)}
                onClick={() => ask(action.prompt, action.intent)}
              >
                {action.label}
              </Button>
            ))}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelBody className="space-y-3 text-[13px] leading-relaxed text-ink-2">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink" />
              Answers only from this case&apos;s records, separates observed data from interpretation, and checks its own language before replying.
            </p>
            <p className="text-xs text-ink-3">Prototype: responses are generated locally from the case evidence. No data leaves this browser.</p>
          </PanelBody>
        </Panel>
      </aside>

      <Panel className="flex min-h-[620px] flex-col">
        <PanelHeader
          title="AI investigation assistant"
          description="Decision support grounded in the evidence on this case."
          actions={
            messages.length > 0 && (
              <Button variant="ghost" size="xs" onClick={() => clearAI(caseId)} disabled={Boolean(pending)}>
                <Trash className="h-3.5 w-3.5" /> Clear
              </Button>
            )
          }
        />

        <div className="flex-1 space-y-5 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && !pending && (
            <div className="mx-auto max-w-lg py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-line-strong bg-panel-2">
                <Bot className="h-6 w-6 text-rel-ink" />
              </div>
              <h3 className="type-title mt-4 text-lg uppercase text-ink">Ask about this case</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                Start with a quick action, or ask in your own words. The assistant explains evidence; it does not decide whether anyone acted improperly.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["Why is this case high priority?", "What context could explain the price?", "Did these vendors collude?"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => ask(prompt)}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === "INVESTIGATOR" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-md border border-accent/25 bg-accent/[0.08] px-3.5 py-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                    <UserRound className="h-3 w-3" /> Investigator · {formatTime(message.createdAt)}
                  </div>
                  <p className="text-[14px] text-ink">{message.text}</p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rel/35 bg-rel/10">
                  <Bot className="h-4 w-4 text-rel-ink" />
                </span>
                <div className="min-w-0 flex-1 rounded-md border border-line bg-panel p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-ink-3">
                    AI-assisted · {formatTime(message.createdAt)}
                  </div>
                  {message.analysis ? <AnalysisView analysis={message.analysis} animate={message.id === freshId} caseId={caseId} /> : <p className="text-sm text-ink-2">{message.text}</p>}
                </div>
              </div>
            ),
          )}

          <AnimatePresence>
            {pending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rel/35 bg-rel/10">
                  <Bot className="h-4 w-4 animate-pulse text-rel-ink" />
                </span>
                <div className="flex-1 rounded-md border border-line bg-panel p-4">
                  <AnalysisSteps steps={pending.steps} active={Math.min(pending.step, pending.steps.length - 1)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={2}
              placeholder="Ask why this case is prioritized, what context applies, or which questions to pursue…"
              className="min-h-[52px] resize-none"
              aria-label="Ask the investigation assistant"
            />
            <Button type="submit" variant="primary" disabled={!input.trim() || Boolean(pending)} className="h-[52px]">
              <CornerDownLeft className="h-4 w-4" /> Ask
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
            <CircleCheck className="h-3 w-3" /> AI-generated analysis is decision support, not a finding of misconduct.
          </p>
        </form>
      </Panel>
    </div>
  );
}
