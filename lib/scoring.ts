import { levelFromScore } from "@/data/reference";
import type {
  ContextCheck,
  InvestigationCase,
  PriorityLevel,
  SignalFeedback,
} from "@/types";

/** The subset of workspace state that can change a priority score. */
export interface ScoreInputs {
  appliedContext?: string[];
  signalFeedback?: Record<string, SignalFeedback>;
  override?: { value: number; reason: string; at: string } | null;
}

export interface FactorScore {
  id: string;
  label: string;
  base: number;
  current: number;
  signalIds: string[];
  rationale: string;
  adjustments: string[];
}

export interface ScoreResult {
  base: number;
  computed: number;
  total: number;
  level: PriorityLevel;
  baseLevel: PriorityLevel;
  factors: FactorScore[];
  contextApplied: ContextCheck[];
  override?: { value: number; reason: string; at: string } | null;
  delta: number;
  reasons: string[];
}

const FEEDBACK_WEIGHT: Record<SignalFeedback, number> = {
  RELEVANT: 1,
  EXPLAINED: 0.35,
  NOT_RELEVANT: 0,
};

/**
 * Every score is the sum of named factors. Context and investigator feedback
 * can only reduce a factor, never add hidden weight.
 */
export function scoreCase(investigation: InvestigationCase, inputs: ScoreInputs = {}): ScoreResult {
  const applied = new Set(inputs.appliedContext ?? []);
  const feedback = inputs.signalFeedback ?? {};
  const contextApplied = investigation.contextChecks.filter((c) => applied.has(c.id));
  const reasons: string[] = [];

  const factors: FactorScore[] = investigation.factors.map((factor) => {
    let current = factor.points;
    const adjustments: string[] = [];

    for (const check of contextApplied.filter((c) => c.factorId === factor.id)) {
      if (check.adjustedPoints < current) {
        adjustments.push(`Context: ${check.reason}`);
        reasons.push(`${factor.label} ${factor.points} → ${check.adjustedPoints}: ${check.reason}`);
        current = check.adjustedPoints;
      }
    }

    const rated = factor.signalIds.filter((id) => feedback[id]);
    if (rated.length) {
      const weights = factor.signalIds.map((id) => (feedback[id] ? FEEDBACK_WEIGHT[feedback[id]] : 1));
      const multiplier = weights.reduce((s, w) => s + w, 0) / weights.length;
      if (multiplier < 1) {
        const next = Math.round(current * multiplier);
        const kinds = rated.map((id) => feedback[id]);
        const label = kinds.includes("NOT_RELEVANT")
          ? "Investigator marked a contributing signal not relevant"
          : "Investigator marked a contributing signal explained by context";
        adjustments.push(label);
        reasons.push(`${factor.label} ${current} → ${next}: ${label.toLowerCase()}.`);
        current = next;
      }
    }

    return {
      id: factor.id,
      label: factor.label,
      base: factor.points,
      current,
      signalIds: factor.signalIds,
      rationale: factor.rationale,
      adjustments,
    };
  });

  const base = investigation.factors.reduce((s, f) => s + f.points, 0);
  const computed = factors.reduce((s, f) => s + f.current, 0);
  const override = inputs.override ?? null;
  if (override) reasons.push(`Priority set to ${override.value} by investigator: ${override.reason}`);
  const total = override ? override.value : computed;

  return {
    base,
    computed,
    total,
    level: levelFromScore(total),
    baseLevel: levelFromScore(base),
    factors,
    contextApplied,
    override,
    delta: total - base,
    reasons,
  };
}
