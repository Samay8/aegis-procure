import { AI_DISCLAIMER, EVIDENCE_GROUP_META, RELATIONSHIP_TYPE_META, STATUS_META } from "@/data/reference";
import { RELATIONSHIPS } from "@/data/relationships";
import { TENDER_BY_ID, bidSpread, bidWindowDays, comparableStats, medianComparableSpread } from "@/data/procurement";
import { VENDOR_BY_ID } from "@/data/vendors";
import { formatDate, formatINR, formatPct } from "@/lib/format";
import type { ScoreResult } from "@/lib/scoring";
import type {
  AIAnalysis,
  AIBlock,
  AIIntent,
  AnomalySignal,
  InvestigationCase,
  InvestigationStatus,
  InvestigatorNote,
  SignalFeedback,
} from "@/types";

export interface AssistantContext {
  investigation: InvestigationCase;
  score: ScoreResult;
  signals: AnomalySignal[];
  notes: InvestigatorNote[];
  feedback: Record<string, SignalFeedback>;
  appliedContext: string[];
  status: InvestigationStatus;
}

export const QUICK_ACTIONS: { intent: AIIntent; label: string; prompt: string }[] = [
  { intent: "SUMMARIZE_EVIDENCE", label: "Summarize evidence", prompt: "Summarize the evidence in this case." },
  { intent: "COMPARE_CONTRACTS", label: "Compare contracts", prompt: "How does this procurement compare with similar contracts?" },
  { intent: "EXPLAIN_SCORE", label: "Explain score", prompt: "Why is this case high priority?" },
  { intent: "GENERATE_QUESTIONS", label: "Generate investigation questions", prompt: "What questions should the investigation answer?" },
  { intent: "CONTEXT", label: "Check context", prompt: "What context could legitimately explain these signals?" },
  { intent: "RELATIONSHIPS", label: "Trace relationships", prompt: "How are the vendors in this case connected?" },
];

const GUARDRAIL = /\b(corrupt\w*|guilt\w*|fraud\w*|collu\w*|brib\w*|kickback\w*|cheat\w*|crook\w*|illegal\w*|criminal\w*|rigg\w*|scam\w*|misconduct|dishonest\w*|arrest\w*|punish\w*|culprit\w*|wrongdoing)\b/i;

export function detectIntent(text: string): AIIntent {
  const t = text.toLowerCase();
  if (GUARDRAIL.test(t)) return "MISCONDUCT_GUARDRAIL";
  if (/question/.test(t)) return "GENERATE_QUESTIONS";
  if (/(context|legitimate|explained by|material|regional|scarcity|speciali[sz]|false positive|innocent|alternative)/.test(t)) return "CONTEXT";
  if (/(why|priorit|score|ranked|decompos|how .*(calculated|computed)|high)/.test(t)) return "EXPLAIN_SCORE";
  if (/(compar|similar|median|benchmark|market price|quartile|typical)/.test(t)) return "COMPARE_CONTRACTS";
  if (/(relationship|address|director|connected|related|link|network|shared|owner|common)/.test(t)) return "RELATIONSHIPS";
  if (/(next|what should|recommend|step|action|do now|plan|priorit[iy]se)/.test(t)) return "NEXT_STEPS";
  if (/(summar|evidence|overview|records?|what do we (know|have)|brief)/.test(t)) return "SUMMARIZE_EVIDENCE";
  return "UNKNOWN";
}

export function progressSteps(intent: AIIntent, ctx: AssistantContext): string[] {
  const { investigation, signals } = ctx;
  const check = "Checking language for unsupported claims";
  switch (intent) {
    case "EXPLAIN_SCORE":
      return [`Reading ${investigation.factors.length} priority factors`, `Tracing factors to ${signals.length} signals`, "Checking applied context", check];
    case "SUMMARIZE_EVIDENCE":
      return [`Retrieving ${investigation.evidence.length} evidence records`, "Grouping records by source", "Separating observed data from interpretation", check];
    case "COMPARE_CONTRACTS": {
      const stats = comparableStats(TENDER_BY_ID.get(investigation.tenderId)!);
      return [`Loading ${stats.count} comparable procurements`, "Computing quartiles and bid spread", "Applying market context", check];
    }
    case "GENERATE_QUESTIONS":
      return ["Reading open signals", "Matching questions to evidence", "Dropping signals marked not relevant", check];
    case "CONTEXT":
      return [`Loading ${investigation.contextChecks.length} context checks`, "Collecting alternative explanations", "Separating explained from unexplained signals", check];
    case "RELATIONSHIPS":
      return ["Resolving vendor identities", "Loading relationship records", "Weighing strength and verification status", check];
    case "NEXT_STEPS":
      return ["Reading case status and notes", "Ranking unresolved signals", "Drafting review actions", check];
    case "MISCONDUCT_GUARDRAIL":
      return ["Reading the question", "Separating findings from evidence", "Collecting what the records can and cannot show", check];
    default:
      return ["Reading the question", "Matching it to case evidence", check];
  }
}

const vendor = (id: string) => VENDOR_BY_ID[id]?.name ?? id;

/** Plain-language statement of a signal, preferring its measured values. */
function plainStatement(signal: AnomalySignal, investigation: InvestigationCase): string {
  const metric = (label: string) => signal.metrics.find((m) => m.label === label)?.value;
  switch (signal.type) {
    case "PRICE_OUTLIER": {
      const deviation = metric("Deviation");
      return deviation ? `The winning price is ${deviation.replace("+", "")} above the comparable median.` : signal.headline;
    }
    case "REPEATED_AWARDS": {
      const awards = metric("Awards in window");
      return awards ? `The same vendor won ${awards} similar contracts in 14 months.` : signal.headline;
    }
    case "SHARED_ENTITY": {
      const type = metric("Relationship")?.toLowerCase();
      if (type?.includes("address")) return "Two participating vendors share a registered address.";
      if (type?.includes("director")) return "Two participating vendors share a director.";
      return signal.headline;
    }
    case "CLOSE_BIDS": {
      const spread = metric("Bid spread");
      const base = metric("Comparable median spread");
      return spread && base ? `All bids sit within ${spread} of each other, against ${base} for comparable procurements.` : signal.headline;
    }
    default:
      return signal.headline || investigation.summary;
  }
}

function evidenceRefs(ctx: AssistantContext, signalId: string) {
  return ctx.investigation.evidence.filter((e) => e.signalIds.includes(signalId)).slice(0, 3).map((e) => e.recordId);
}

function activeSignals(ctx: AssistantContext) {
  return ctx.signals.filter((s) => ctx.feedback[s.id] !== "NOT_RELEVANT");
}

function limitsBlock(ctx: AssistantContext): AIBlock {
  const coverage = [...new Set(ctx.signals.map((s) => s.dataCoverage))].slice(0, 3);
  return {
    kind: "LIMITS",
    title: "What the data cannot show",
    items: [
      ...coverage.map((text) => ({ text })),
      { text: "Beneficial ownership, site inspections and bank statements are not in this dataset." },
    ],
  };
}

const INTERPRETATION: AIBlock = {
  kind: "INTERPRETATION",
  title: "Interpretation",
  items: [
    { text: "These signals do not establish misconduct. They indicate areas that may warrant further review." },
    { text: "The priority score ranks this case against others in the queue. It is not a probability of wrongdoing." },
  ],
};

export function runAssistant(intent: AIIntent, ctx: AssistantContext): AIAnalysis {
  const { investigation, score } = ctx;
  const tender = TENDER_BY_ID.get(investigation.tenderId);
  const base = (title: string, lead: string, blocks: AIBlock[]): AIAnalysis => ({
    intent,
    title,
    lead,
    blocks,
    disclaimer: AI_DISCLAIMER,
  });

  switch (intent) {
    case "EXPLAIN_SCORE": {
      const factors = [...score.factors].sort((a, b) => b.current - a.current);
      const primary = investigation.primarySignalIds
        .map((id) => ctx.signals.find((s) => s.id === id))
        .filter((s): s is AnomalySignal => Boolean(s) && ctx.feedback[s!.id] !== "NOT_RELEVANT");
      const contextLine = score.contextApplied.length
        ? `Context has lowered it from ${score.base}.`
        : investigation.contextChecks.length
          ? "Context checks are available but not yet applied."
          : "";
      return base(
        "Why this case is prioritized",
        `Investigation priority is ${score.total} / 100. ${primary.length} independent signals contribute most to the score. ${contextLine}`.trim(),
        [
          {
            kind: "OBSERVED",
            title: "Observed in the records",
            items: primary.map((s) => ({ text: plainStatement(s, investigation), refs: evidenceRefs(ctx, s.id) })),
          },
          {
            kind: "SIGNAL",
            title: "How the score is built",
            items: factors.map((f) => ({
              text: `${f.label}: +${f.current}${f.current !== f.base ? ` (was +${f.base})` : ""}. ${f.rationale}`,
              refs: f.signalIds.slice(0, 3),
            })),
          },
          ...(score.reasons.length
            ? [{ kind: "CONTEXT" as const, title: "Why the score changed", items: score.reasons.map((text) => ({ text })) }]
            : []),
          INTERPRETATION,
          limitsBlock(ctx),
        ],
      );
    }

    case "SUMMARIZE_EVIDENCE": {
      const groups = [...new Set(investigation.evidence.map((e) => e.group))];
      const neutral = investigation.evidence.filter((e) => e.neutral);
      return base(
        "Evidence summary",
        `${investigation.evidence.length} records across ${groups.length} sources support this case. ${neutral.length} of them show no signal and are included so the picture is balanced.`,
        [
          {
            kind: "OBSERVED",
            title: "Observed data",
            items: groups.map((group) => {
              const records = investigation.evidence.filter((e) => e.group === group);
              return {
                text: `${EVIDENCE_GROUP_META[group].label}: ${records
                  .slice(0, 3)
                  .map((r) => `${r.kind.toLowerCase()} — ${r.relevantValue}`)
                  .join("; ")}${records.length > 3 ? `; and ${records.length - 3} more` : ""}.`,
                refs: records.slice(0, 3).map((r) => r.recordId),
              };
            }),
          },
          {
            kind: "SIGNAL",
            title: "Detected signals",
            items: activeSignals(ctx).slice(0, 6).map((s) => ({ text: s.headline, refs: [s.id] })),
          },
          ...(neutral.length
            ? [
                {
                  kind: "CONTEXT" as const,
                  title: "Records that point the other way",
                  items: neutral.map((e) => ({ text: e.whyItMatters, refs: [e.recordId] })),
                },
              ]
            : []),
          INTERPRETATION,
          limitsBlock(ctx),
        ],
      );
    }

    case "COMPARE_CONTRACTS": {
      if (!tender) return runAssistant("UNKNOWN", ctx);
      const stats = comparableStats(tender);
      const spread = bidSpread(tender.id);
      const comparableSpread = medianComparableSpread(tender);
      const position =
        stats.current > stats.p75 ? "above the upper quartile" : stats.current < stats.p25 ? "below the lower quartile" : "inside the interquartile range";
      const outside = investigation.evidence.find((e) => e.kind === "Tender outcome");
      const applied = investigation.contextChecks.filter((c) => ctx.appliedContext.includes(c.id) && c.factorId === "F-PRICE");
      const available = investigation.contextChecks.filter((c) => c.factorId === "F-PRICE");
      return base(
        "Comparison with similar procurements",
        `${tender.title} is compared with ${stats.count} awarded procurements in the same category, closest in size, within an 18-month window.`,
        [
          {
            kind: "OBSERVED",
            title: "Observed data",
            items: [
              { text: `This procurement: ${formatINR(stats.current)}. Comparable median: ${formatINR(stats.median)}.`, refs: [tender.id] },
              { text: `Interquartile range ${formatINR(stats.p25)} to ${formatINR(stats.p75)}; this award sits ${position}.` },
              { text: `Deviation from the median: ${formatPct(stats.deviationPct, 1, true)}.` },
              ...(spread != null && comparableSpread != null
                ? [{ text: `Bid spread ${spread.toFixed(2)}% against a comparable median of ${comparableSpread.toFixed(1)}%.` }]
                : []),
              { text: `Bid window: ${bidWindowDays(tender)} days.` },
              ...(outside ? [{ text: `${outside.title}: ${outside.relevantValue.toLowerCase()} — ${outside.whyItMatters}`, refs: [outside.recordId] }] : []),
            ],
          },
          ...(available.length
            ? [
                {
                  kind: "CONTEXT" as const,
                  title: applied.length ? "Context applied" : "Context available",
                  items: available.flatMap((c) => [
                    ...c.adjustments.map((a) => ({ text: `${a.label}: ${a.value} (${a.source}).` })),
                    { text: `Adjusted deviation: ${c.adjustedLabel}. ${c.reason}` },
                  ]),
                },
              ]
            : []),
          {
            kind: "INTERPRETATION",
            title: "Interpretation",
            items: [
              { text: "A price outside the comparable range is unusual but not improper. Scope, specification and market movement all change price." },
              { text: "The comparison is a starting point for reviewing the priced bill of quantities, not a conclusion about value for money." },
            ],
          },
          limitsBlock(ctx),
        ],
      );
    }

    case "GENERATE_QUESTIONS": {
      const excluded = new Set(Object.entries(ctx.feedback).filter(([, f]) => f === "NOT_RELEVANT").map(([id]) => id));
      const authored = investigation.questions.map((q) => ({ text: q.text, refs: q.evidenceIds.slice(0, 2) }));
      const generated = activeSignals(ctx)
        .filter((s) => !excluded.has(s.id))
        .slice(0, 3)
        .map((s) => ({ text: `${s.recommendedAction.replace(/\.$/, "")}?`.replace(/^(\w)/, (m) => m.toUpperCase()), refs: [s.id] }))
        .filter((q) => !authored.some((a) => a.text === q.text));
      return base(
        "Potential investigation questions",
        "Each question would confirm or rule out a signal, and names the evidence it tests. Add the ones you intend to pursue to the workspace checklist.",
        [
          { kind: "QUESTIONS", title: "Questions", items: authored.length ? authored : generated },
          ...(authored.length && generated.length ? [{ kind: "NEXT_STEPS" as const, title: "Follow-ups drawn from signal actions", items: generated }] : []),
          {
            kind: "INTERPRETATION",
            title: "Why these questions",
            items: [{ text: "They are framed to test legitimate explanations as seriously as problematic ones." }],
          },
        ],
      );
    }

    case "CONTEXT": {
      const alternatives = [...new Set(activeSignals(ctx).flatMap((s) => s.alternatives))].slice(0, 8);
      const withContext = new Set(investigation.contextChecks.map((c) => c.factorId));
      const unaffected = score.factors.filter((f) => !withContext.has(f.id) && f.current > 0);
      return base(
        "Context check",
        investigation.contextChecks.length
          ? `${investigation.contextChecks.length} context checks apply to this case; ${ctx.appliedContext.filter((id) => investigation.contextChecks.some((c) => c.id === id)).length} are applied to the priority score.`
          : "No quantified context is on file for this case yet. The alternative explanations below still need testing.",
        [
          ...(investigation.contextChecks.length
            ? [
                {
                  kind: "CONTEXT" as const,
                  title: "Quantified context",
                  items: investigation.contextChecks.map((c) => ({
                    text: `${c.title}: ${c.observed} → ${c.adjustedLabel}. ${c.reason} ${ctx.appliedContext.includes(c.id) ? "(applied)" : "(not applied)"}`,
                  })),
                },
              ]
            : []),
          { kind: "OBSERVED", title: "Legitimate explanations to test", items: alternatives.map((text) => ({ text })) },
          {
            kind: "INTERPRETATION",
            title: "What context does not explain",
            items: unaffected.length
              ? unaffected.map((f) => ({ text: `${f.label} (+${f.current}) has no quantified context yet. ${f.rationale}`, refs: f.signalIds.slice(0, 2) }))
              : [{ text: "Every contributing factor has a context check on file." }],
          },
        ],
      );
    }

    case "RELATIONSHIPS": {
      const ids = new Set([investigation.vendorId, ...investigation.relatedVendorIds]);
      const rels = RELATIONSHIPS.filter((r) => r.vendorIds.some((id) => ids.has(id)))
        .sort((a, b) => (a.type === "JOINT_BIDDING" ? 1 : 0) - (b.type === "JOINT_BIDDING" ? 1 : 0))
        .slice(0, 8);
      return base(
        "Vendor relationships",
        rels.length
          ? `${rels.length} relationship records involve the vendors in this case.`
          : "No relationship records involve the vendors in this case.",
        [
          {
            kind: "OBSERVED",
            title: "Relationship records",
            items: rels.map((r) => ({
              text: `${vendor(r.vendorIds[0])} ↔ ${vendor(r.vendorIds[1])}: ${RELATIONSHIP_TYPE_META[r.type].label.toLowerCase()}, ${r.strength.toLowerCase()} strength, ${r.evidenceCount} records, first observed ${formatDate(r.firstObserved)}.${r.context ? ` Context: ${r.context}` : ""}`,
              refs: [r.id],
            })),
          },
          {
            kind: "INTERPRETATION",
            title: "Interpretation",
            items: [
              { text: "A relationship is an investigative lead that requires verification. It is not proof of wrongdoing." },
              { text: "Exact matches across several independent records carry more weight than a single shared contact detail." },
            ],
          },
          limitsBlock(ctx),
        ],
      );
    }

    case "NEXT_STEPS": {
      const unresolved = activeSignals(ctx).filter((s) => !ctx.feedback[s.id]);
      const statusAdvice =
        ctx.status === "NEW"
          ? "Move the case to Under review once the first read is complete."
          : `The case is ${STATUS_META[ctx.status].label.toLowerCase()}. ${STATUS_META[ctx.status].description}`;
      return base(
        "Suggested review actions",
        `${unresolved.length} signals have no investigator feedback yet. ${statusAdvice}`,
        [
          {
            kind: "NEXT_STEPS",
            title: "Actions",
            items: unresolved.slice(0, 5).map((s) => ({ text: s.recommendedAction, refs: [s.id] })),
          },
          ...(ctx.notes.length
            ? [
                {
                  kind: "OBSERVED" as const,
                  title: "Investigator notes on file",
                  items: ctx.notes.slice(0, 3).map((n) => ({ text: `“${n.text}”` })),
                },
              ]
            : []),
          INTERPRETATION,
        ],
      );
    }

    case "MISCONDUCT_GUARDRAIL": {
      return base(
        "I can’t determine whether anyone acted improperly",
        "That judgment belongs to investigators and the competent authority. What I can do is show what the records contain, where they are unusual, and what evidence would tell legitimate and improper explanations apart.",
        [
          {
            kind: "OBSERVED",
            title: "What the records show",
            items: activeSignals(ctx).slice(0, 4).map((s) => ({ text: plainStatement(s, investigation), refs: [s.id] })),
          },
          {
            kind: "QUESTIONS",
            title: "Evidence that would distinguish the explanations",
            items: investigation.questions.slice(0, 4).map((q) => ({ text: q.text, refs: q.evidenceIds.slice(0, 2) })),
          },
          INTERPRETATION,
        ],
      );
    }

    default:
      return base(
        "I answer from this case’s evidence",
        "I can summarize evidence, compare the procurement with similar contracts, explain the priority score, check context, trace vendor relationships, or suggest investigation questions.",
        [
          {
            kind: "NEXT_STEPS",
            title: "Try asking",
            items: QUICK_ACTIONS.map((a) => ({ text: a.prompt })),
          },
        ],
      );
  }
}

/** Scans the generated analysis for language that would state a finding. */
export function languageCheck(analysis: AIAnalysis): string[] {
  const text = [analysis.title, analysis.lead, ...analysis.blocks.flatMap((b) => b.items.map((i) => i.text))].join(" ");
  const flagged: string[] = [];
  const patterns = [
    /\bis corrupt\b/i,
    /\bcommitted fraud\b/i,
    /\bfraud (was )?confirmed\b/i,
    /\bcollusion (is )?(confirmed|proven)\b/i,
    /\bguilty\b/i,
    /\bproves? (that )?.*(wrongdoing|misconduct)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) flagged.push(match[0]);
  }
  return flagged;
}
