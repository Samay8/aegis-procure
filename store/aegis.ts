"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CASES, CASE_BY_ID } from "@/data/cases";
import { SEED_AUDIT_LOG, SEED_NOTIFICATIONS } from "@/data/platform";
import { TENDER_BY_ID } from "@/data/procurement";
import { CURRENT_INVESTIGATOR, INVESTIGATOR_BY_ID, OUTCOME_META, SIGNAL_TYPE_META, STATUS_META, type NetworkFilterId } from "@/data/reference";
import { SIGNAL_BY_ID } from "@/data/signals";
import { formatINR, nowIST } from "@/lib/format";
import { scoreCase } from "@/lib/scoring";
import { uid } from "@/lib/utils";
import type {
  AIMessage,
  AnomalySignal,
  AuditLogEntry,
  Collection,
  DataImport,
  InvestigationCase,
  InvestigationOutcome,
  InvestigationStatus,
  InvestigatorNote,
  NoteKind,
  NotificationItem,
  SavedItemKind,
  SignalCategory,
  SignalFeedback,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  questionId?: string;
  addedAt: string;
}

export interface CaseHistoryEntry {
  at: string;
  kind: "STATUS" | "PRIORITY" | "OUTCOME" | "ASSIGNMENT" | "CONTEXT" | "FEEDBACK";
  from?: string;
  to: string;
  note?: string;
}

export interface CaseState {
  status: InvestigationStatus;
  assigneeId?: string;
  appliedContext: string[];
  signalFeedback: Record<string, SignalFeedback>;
  override: { value: number; reason: string; at: string } | null;
  outcome: { outcome: InvestigationOutcome; note: string; at: string } | null;
  notes: InvestigatorNote[];
  checklist: ChecklistItem[];
  history: CaseHistoryEntry[];
}

export interface ExplorerFilters {
  query: string;
  department: string;
  category: string;
  region: string;
  status: string;
  priority: string;
  signalCategory: string;
  vendor: string;
  valueMin: string;
  valueMax: string;
  dateFrom: string;
  dateTo: string;
  flaggedOnly: boolean;
  sort: string;
}

export interface QueueFilters {
  query: string;
  sort: "priority" | "recency" | "evidence" | "department" | "type" | "value";
  status: "ACTIVE" | "ALL" | InvestigationStatus;
  department: string;
  signalCategory: string;
}

export interface FeedbackEvent {
  id: string;
  at: string;
  signalId: string;
  signalType: string;
  value: SignalFeedback | "DISMISSED";
  caseId?: string;
  effect: string;
}

export interface SignalReview {
  status: "EXPLAINED" | "DISMISSED";
  reason: string;
  at: string;
}

interface Data {
  cases: Record<string, CaseState>;
  userCases: InvestigationCase[];
  signalReviews: Record<string, SignalReview>;
  feedbackEvents: FeedbackEvent[];
  saved: Record<SavedItemKind, string[]>;
  collections: Collection[];
  notifications: NotificationItem[];
  audit: AuditLogEntry[];
  ai: Record<string, AIMessage[]>;
  imports: DataImport[];
  importedSignals: AnomalySignal[];
  explorer: ExplorerFilters;
  queue: QueueFilters;
  radarCategory: SignalCategory | "ALL";
  alertFilter: string;
  networkFilters: NetworkFilterId[];
  compare: { a: string; b: string };
  prefs: { sidebarCollapsed: boolean; reducedMotion: boolean };
}

interface Actions {
  setStatus: (caseId: string, status: InvestigationStatus, note?: string) => void;
  assign: (caseId: string, investigatorId: string) => void;
  addNote: (caseId: string, text: string, kind?: NoteKind) => void;
  removeNote: (caseId: string, noteId: string) => void;
  setSignalFeedback: (caseId: string, signalId: string, feedback: SignalFeedback | null) => void;
  toggleContext: (caseId: string, contextId: string) => void;
  setOverride: (caseId: string, value: number | null, reason?: string) => void;
  setOutcome: (caseId: string, outcome: InvestigationOutcome, note: string) => void;
  addChecklistItem: (caseId: string, text: string, questionId?: string) => void;
  toggleChecklistItem: (caseId: string, itemId: string) => void;
  removeChecklistItem: (caseId: string, itemId: string) => void;
  reviewSignal: (signalId: string, status: SignalReview["status"] | null, reason?: string) => void;
  createCaseFromSignal: (signalId: string) => string;
  toggleSaved: (kind: SavedItemKind, id: string) => void;
  createCollection: (name: string) => string;
  toggleInCollection: (collectionId: string, item: { kind: SavedItemKind; id: string }) => void;
  deleteCollection: (collectionId: string) => void;
  pushNotification: (item: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  log: (entry: Omit<AuditLogEntry, "id" | "at" | "actor" | "actorKind"> & Partial<Pick<AuditLogEntry, "actor" | "actorKind">>) => void;
  addAIMessage: (caseId: string, message: AIMessage) => void;
  clearAI: (caseId: string) => void;
  addImport: (record: DataImport, signals: AnomalySignal[]) => void;
  setExplorer: (patch: Partial<ExplorerFilters>) => void;
  resetExplorer: () => void;
  setQueue: (patch: Partial<QueueFilters>) => void;
  setRadarCategory: (category: SignalCategory | "ALL") => void;
  setAlertFilter: (filter: string) => void;
  setNetworkFilters: (filters: NetworkFilterId[]) => void;
  setCompare: (patch: Partial<{ a: string; b: string }>) => void;
  setPref: <K extends keyof Data["prefs"]>(key: K, value: Data["prefs"][K]) => void;
  resetDemo: () => void;
}

export type AegisStore = Data & Actions;

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_EXPLORER: ExplorerFilters = {
  query: "",
  department: "ALL",
  category: "ALL",
  region: "ALL",
  status: "ALL",
  priority: "ALL",
  signalCategory: "ALL",
  vendor: "",
  valueMin: "",
  valueMax: "",
  dateFrom: "",
  dateTo: "",
  flaggedOnly: false,
  sort: "date-desc",
};

export const DEFAULT_QUEUE: QueueFilters = {
  query: "",
  sort: "priority",
  status: "ACTIVE",
  department: "ALL",
  signalCategory: "ALL",
};

export function defaultCaseState(investigation?: InvestigationCase): CaseState {
  return {
    status: investigation?.initialStatus ?? "NEW",
    assigneeId: investigation?.initialAssigneeId,
    appliedContext: [],
    signalFeedback: {},
    override: null,
    outcome: investigation?.historical
      ? { outcome: investigation.historical.outcome, note: investigation.historical.note, at: `${investigation.historical.closedOn}T17:00` }
      : null,
    notes: [],
    checklist: [],
    history: [],
  };
}

function initialData(): Data {
  return {
    cases: {},
    userCases: [],
    signalReviews: {},
    feedbackEvents: [],
    saved: { CASE: [], VENDOR: [], PROCUREMENT: [], EVIDENCE: [] },
    collections: [],
    notifications: SEED_NOTIFICATIONS,
    audit: SEED_AUDIT_LOG,
    ai: {},
    imports: [],
    importedSignals: [],
    explorer: DEFAULT_EXPLORER,
    queue: DEFAULT_QUEUE,
    radarCategory: "ALL",
    alertFilter: "all",
    networkFilters: ["all"],
    compare: { a: "V-1042", b: "V-1057" },
    prefs: { sidebarCollapsed: false, reducedMotion: false },
  };
}

const ME = CURRENT_INVESTIGATOR;

export function findCase(id: string, userCases: InvestigationCase[] = []) {
  return CASE_BY_ID.get(id) ?? userCases.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useAegis = create<AegisStore>()(
  persist(
    (set, get) => {
      const audit = (action: string, target?: string, detail?: string): AuditLogEntry => ({
        id: uid("A"),
        at: nowIST(),
        actor: ME.name,
        actorKind: "INVESTIGATOR",
        action,
        target,
        detail,
      });

      const notify = (item: Omit<NotificationItem, "id" | "createdAt" | "read">): NotificationItem => ({
        ...item,
        id: uid("N"),
        createdAt: nowIST(),
        read: false,
      });

      /** Applies a change to one case, recording score movement in history and the audit log. */
      const updateCase = (
        caseId: string,
        change: (current: CaseState) => CaseState,
        options: { action?: string; detail?: string; notify?: Omit<NotificationItem, "id" | "createdAt" | "read"> } = {},
      ) => {
        set((state) => {
          const investigation = findCase(caseId, state.userCases);
          const current = state.cases[caseId] ?? defaultCaseState(investigation);
          const next = change(current);
          const extraAudit: AuditLogEntry[] = [];
          const extraHistory: CaseHistoryEntry[] = [];

          if (investigation) {
            const before = scoreCase(investigation, current).total;
            const after = scoreCase(investigation, next).total;
            if (before !== after) {
              extraAudit.push(audit(`Priority changed ${before} → ${after}`, caseId));
              extraHistory.push({ at: nowIST(), kind: "PRIORITY", from: String(before), to: String(after) });
            }
          }

          return {
            cases: {
              ...state.cases,
              [caseId]: { ...next, history: [...extraHistory, ...next.history] },
            },
            audit: [
              ...extraAudit,
              ...(options.action ? [audit(options.action, caseId, options.detail)] : []),
              ...state.audit,
            ].slice(0, 400),
            notifications: options.notify ? [notify(options.notify), ...state.notifications] : state.notifications,
          };
        });
      };

      return {
        ...initialData(),

        setStatus: (caseId, status, note) =>
          updateCase(
            caseId,
            (c) =>
              c.status === status
                ? c
                : {
                    ...c,
                    status,
                    history: [{ at: nowIST(), kind: "STATUS", from: c.status, to: status, note }, ...c.history],
                    notes: note
                      ? [{ id: uid("NOTE"), caseId, authorId: ME.id, text: note, createdAt: nowIST(), kind: "STATUS" }, ...c.notes]
                      : c.notes,
                  },
            { action: `Status changed to ${STATUS_META[status].label}`, detail: note },
          ),

        assign: (caseId, investigatorId) =>
          updateCase(
            caseId,
            (c) => ({
              ...c,
              assigneeId: investigatorId,
              history: [{ at: nowIST(), kind: "ASSIGNMENT", from: c.assigneeId, to: investigatorId }, ...c.history],
            }),
            {
              action: "Case assigned",
              detail: `Assigned to ${INVESTIGATOR_BY_ID[investigatorId]?.name ?? investigatorId}`,
              notify:
                investigatorId === ME.id
                  ? { kind: "ASSIGNMENT", title: "Investigation assigned to you", body: caseId, href: `/investigations/${caseId}` }
                  : undefined,
            },
          ),

        addNote: (caseId, text, kind = "NOTE") => {
          const trimmed = text.trim();
          if (!trimmed) return;
          updateCase(
            caseId,
            (c) => ({
              ...c,
              notes: [{ id: uid("NOTE"), caseId, authorId: ME.id, text: trimmed, createdAt: nowIST(), kind }, ...c.notes],
            }),
            { action: kind === "CONTEXT" ? "Context note added" : "Investigator note added", detail: trimmed.slice(0, 90) },
          );
        },

        removeNote: (caseId, noteId) =>
          updateCase(caseId, (c) => ({ ...c, notes: c.notes.filter((n) => n.id !== noteId) }), { action: "Investigator note removed" }),

        setSignalFeedback: (caseId, signalId, feedback) => {
          const signal = SIGNAL_BY_ID.get(signalId) ?? get().importedSignals.find((s) => s.id === signalId);
          updateCase(
            caseId,
            (c) => {
              const next = { ...c.signalFeedback };
              if (feedback) next[signalId] = feedback;
              else delete next[signalId];
              return {
                ...c,
                signalFeedback: next,
                history: [
                  { at: nowIST(), kind: "FEEDBACK", to: feedback ?? "CLEARED", note: signal?.title },
                  ...c.history,
                ],
              };
            },
            {
              action:
                feedback === "RELEVANT"
                  ? "Signal marked relevant"
                  : feedback === "NOT_RELEVANT"
                    ? "Signal marked not relevant"
                    : feedback === "EXPLAINED"
                      ? "Signal marked explained by context"
                      : "Signal feedback cleared",
              detail: `${signalId}${signal ? ` · ${signal.title}` : ""}`,
            },
          );
          if (feedback && signal) {
            set((state) => ({
              feedbackEvents: [
                {
                  id: uid("FB"),
                  at: nowIST(),
                  signalId,
                  signalType: signal.type,
                  value: feedback,
                  caseId,
                  effect:
                    feedback === "EXPLAINED"
                      ? `Signal priority reduced. Context explains observed variation; future ${SIGNAL_TYPE_META[signal.type].label.toLowerCase()} signals in this category carry the same context check.`
                      : feedback === "NOT_RELEVANT"
                        ? "Signal removed from this case's score and recorded as a false positive for model calibration."
                        : "Signal confirmed as relevant; its weight is kept.",
                },
                ...state.feedbackEvents,
              ].slice(0, 100),
            }));
          }
        },

        toggleContext: (caseId, contextId) => {
          const investigation = findCase(caseId, get().userCases);
          const check = investigation?.contextChecks.find((c) => c.id === contextId);
          const applied = (get().cases[caseId]?.appliedContext ?? []).includes(contextId);
          updateCase(
            caseId,
            (c) => ({
              ...c,
              appliedContext: applied ? c.appliedContext.filter((id) => id !== contextId) : [...c.appliedContext, contextId],
              history: [
                { at: nowIST(), kind: "CONTEXT", to: applied ? "Context removed" : "Context applied", note: check?.title },
                ...c.history,
              ],
            }),
            {
              action: applied ? "Context adjustment removed" : "Context adjustment applied",
              detail: check?.reason,
              notify: applied
                ? undefined
                : {
                    kind: "REVIEW",
                    title: "Priority lowered after context",
                    body: `${caseId} · ${check?.reason ?? "Context applied"}`,
                    href: `/investigations/${caseId}/context`,
                  },
            },
          );
        },

        setOverride: (caseId, value, reason) =>
          updateCase(
            caseId,
            (c) => ({ ...c, override: value == null ? null : { value, reason: reason?.trim() || "No reason recorded", at: nowIST() } }),
            { action: value == null ? "Priority override removed" : "Priority set manually", detail: reason },
          ),

        setOutcome: (caseId, outcome, note) =>
          updateCase(
            caseId,
            (c) => {
              const status: InvestigationStatus =
                outcome === "REFERRED_FOR_AUDIT" ? "REFERRED" : outcome === "NEEDS_MORE_REVIEW" ? "NEEDS_MORE_EVIDENCE" : outcome === "CLOSED" ? "CLOSED" : "RESOLVED";
              const investigation = findCase(caseId, get().userCases);
              // Explained-by-context outcomes feed back into the case's own signals.
              const feedback = { ...c.signalFeedback };
              if (outcome === "EXPLAINED_BY_CONTEXT" && investigation) {
                for (const id of investigation.primarySignalIds) feedback[id] = feedback[id] ?? "EXPLAINED";
              }
              return {
                ...c,
                outcome: { outcome, note, at: nowIST() },
                status,
                signalFeedback: feedback,
                history: [
                  { at: nowIST(), kind: "OUTCOME", to: OUTCOME_META[outcome].label, note },
                  { at: nowIST(), kind: "STATUS", from: c.status, to: status },
                  ...c.history,
                ],
              };
            },
            { action: `Outcome recorded: ${OUTCOME_META[outcome].label}`, detail: note },
          ),

        addChecklistItem: (caseId, text, questionId) =>
          updateCase(
            caseId,
            (c) =>
              c.checklist.some((item) => item.text === text)
                ? c
                : { ...c, checklist: [...c.checklist, { id: uid("CHK"), text, done: false, questionId, addedAt: nowIST() }] },
            { action: "Question added to checklist", detail: text.slice(0, 90) },
          ),

        toggleChecklistItem: (caseId, itemId) =>
          updateCase(caseId, (c) => ({
            ...c,
            checklist: c.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
          })),

        removeChecklistItem: (caseId, itemId) =>
          updateCase(caseId, (c) => ({ ...c, checklist: c.checklist.filter((item) => item.id !== itemId) })),

        reviewSignal: (signalId, status, reason) => {
          const signal = SIGNAL_BY_ID.get(signalId) ?? get().importedSignals.find((s) => s.id === signalId);
          set((state) => {
            const reviews = { ...state.signalReviews };
            if (status) reviews[signalId] = { status, reason: reason?.trim() || "No reason recorded", at: nowIST() };
            else delete reviews[signalId];
            return {
              signalReviews: reviews,
              audit: [
                audit(
                  status === "EXPLAINED" ? "Signal marked explained by context" : status === "DISMISSED" ? "Signal dismissed" : "Signal reopened",
                  signalId,
                  reason,
                ),
                ...state.audit,
              ],
              feedbackEvents: status
                ? [
                    {
                      id: uid("FB"),
                      at: nowIST(),
                      signalId,
                      signalType: signal?.type ?? "PRICE_OUTLIER",
                      value: status === "EXPLAINED" ? "EXPLAINED" : "DISMISSED",
                      effect:
                        status === "EXPLAINED"
                          ? "Signal priority reduced. Context explains observed variation."
                          : "Signal removed from the queue and recorded for model calibration.",
                    },
                    ...state.feedbackEvents,
                  ]
                : state.feedbackEvents,
            };
          });
        },

        createCaseFromSignal: (signalId) => {
          const state = get();
          const signal = SIGNAL_BY_ID.get(signalId) ?? state.importedSignals.find((s) => s.id === signalId);
          if (!signal) return "";
          if (signal.caseId) return signal.caseId;
          const existing = state.userCases.find((c) => c.signalIds.includes(signalId));
          if (existing) return existing.id;

          const number = 47 + state.userCases.length;
          const id = `INV-2026-${String(number).padStart(4, "0")}`;
          const tender = signal.tenderIds[0] ? TENDER_BY_ID.get(signal.tenderIds[0]) : undefined;
          const investigation: InvestigationCase = {
            id,
            title: tender?.title ?? signal.title,
            tenderId: tender?.id ?? "",
            vendorId: signal.vendorIds[0] ?? "",
            relatedVendorIds: signal.vendorIds.slice(1),
            departmentId: tender?.departmentId ?? signal.departmentId,
            categoryId: tender?.categoryId ?? signal.categoryId,
            regionId: tender?.regionId ?? signal.regionId,
            value: tender?.awardValue ?? 0,
            primarySignal: SIGNAL_TYPE_META[signal.type].label,
            summary: `${signal.explanation} ${signal.context}`,
            openedOn: nowIST(),
            initialStatus: "NEW",
            initialAssigneeId: ME.id,
            primarySignalIds: [signal.id],
            signalIds: [signal.id],
            factors: [
              {
                id: "F-SIGNAL",
                label: SIGNAL_TYPE_META[signal.type].label,
                points: signal.strength,
                signalIds: [signal.id],
                rationale: signal.headline,
              },
            ],
            evidence: tender
              ? [
                  {
                    id: `EV-${id.slice(-4)}-01`,
                    group: "PROCUREMENT",
                    kind: "Tender notice",
                    recordId: tender.id,
                    title: tender.title,
                    source: "e-Procurement portal · tender notice",
                    date: tender.publishedOn,
                    fields: [
                      { label: "Estimate", value: formatINR(tender.estimate) },
                      { label: "Award", value: tender.awardValue ? formatINR(tender.awardValue) : "Not awarded" },
                    ],
                    relevantValue: tender.awardValue ? formatINR(tender.awardValue) : "—",
                    whyItMatters: signal.explanation,
                    signalIds: [signal.id],
                    href: `/procurement/${tender.id}`,
                  },
                ]
              : [],
            contextChecks: [],
            questions: [
              { id: `Q-${id.slice(-4)}-1`, text: `${signal.recommendedAction.replace(/\.$/, "")}?`, rationale: signal.reasoning, evidenceIds: signal.evidenceIds },
              ...signal.alternatives.slice(0, 2).map((alt, i) => ({
                id: `Q-${id.slice(-4)}-${i + 2}`,
                text: `Does “${alt.toLowerCase()}” explain this signal?`,
                rationale: "A legitimate explanation to test before escalating.",
                evidenceIds: [],
              })),
            ],
            userCreated: true,
          };

          set((s) => ({
            userCases: [...s.userCases, investigation],
            audit: [audit("Investigation opened from signal", id, `${signal.id} · ${signal.title}`), ...s.audit],
            notifications: [
              notify({ kind: "ASSIGNMENT", title: "Investigation opened", body: `${id} · ${investigation.title}`, href: `/investigations/${id}` }),
              ...s.notifications,
            ],
          }));
          return id;
        },

        toggleSaved: (kind, id) =>
          set((state) => {
            const list = state.saved[kind];
            const has = list.includes(id);
            return {
              saved: { ...state.saved, [kind]: has ? list.filter((x) => x !== id) : [id, ...list] },
              audit: [audit(has ? "Removed from saved items" : "Saved for review", id), ...state.audit],
            };
          }),

        createCollection: (name) => {
          const id = uid("COL");
          set((state) => ({
            collections: [{ id, name: name.trim() || "Untitled collection", createdAt: nowIST(), items: [] }, ...state.collections],
            audit: [audit("Investigation collection created", undefined, name), ...state.audit],
          }));
          return id;
        },

        toggleInCollection: (collectionId, item) =>
          set((state) => ({
            collections: state.collections.map((col) => {
              if (col.id !== collectionId) return col;
              const has = col.items.some((i) => i.kind === item.kind && i.id === item.id);
              return { ...col, items: has ? col.items.filter((i) => !(i.kind === item.kind && i.id === item.id)) : [...col.items, item] };
            }),
          })),

        deleteCollection: (collectionId) =>
          set((state) => ({ collections: state.collections.filter((c) => c.id !== collectionId) })),

        pushNotification: (item) => set((state) => ({ notifications: [notify(item), ...state.notifications] })),

        markNotificationRead: (id) =>
          set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

        markAllNotificationsRead: () =>
          set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),

        log: (entry) =>
          set((state) => ({
            audit: [
              { id: uid("A"), at: nowIST(), actor: entry.actor ?? ME.name, actorKind: entry.actorKind ?? "INVESTIGATOR", action: entry.action, target: entry.target, detail: entry.detail },
              ...state.audit,
            ].slice(0, 400),
          })),

        addAIMessage: (caseId, message) =>
          set((state) => ({ ai: { ...state.ai, [caseId]: [...(state.ai[caseId] ?? []), message].slice(-40) } })),

        clearAI: (caseId) =>
          set((state) => {
            const next = { ...state.ai };
            delete next[caseId];
            return { ai: next };
          }),

        addImport: (record, signals) =>
          set((state) => ({
            imports: [record, ...state.imports],
            importedSignals: [...signals, ...state.importedSignals],
            audit: [
              { id: uid("A"), at: nowIST(), actor: "Scoring engine", actorKind: "SYSTEM", action: "Imported file analyzed", target: record.fileName, detail: `${record.rows} rows · ${signals.length} signals` },
              audit("Data imported", record.fileName, `${record.rows} rows`),
              ...state.audit,
            ],
            notifications: [
              notify({
                kind: "ANALYSIS",
                title: "Analysis completed",
                body: `${record.fileName} · ${record.rows} rows · ${signals.length} new signal${signals.length === 1 ? "" : "s"}`,
                href: "/alerts",
              }),
              ...state.notifications,
            ],
          })),

        setExplorer: (patch) => set((state) => ({ explorer: { ...state.explorer, ...patch } })),
        resetExplorer: () => set({ explorer: DEFAULT_EXPLORER }),
        setQueue: (patch) => set((state) => ({ queue: { ...state.queue, ...patch } })),
        setRadarCategory: (category) => set({ radarCategory: category }),
        setAlertFilter: (filter) => set({ alertFilter: filter }),
        setNetworkFilters: (filters) => set({ networkFilters: filters.length ? filters : ["all"] }),
        setCompare: (patch) => set((state) => ({ compare: { ...state.compare, ...patch } })),
        setPref: (key, value) => set((state) => ({ prefs: { ...state.prefs, [key]: value } })),

        resetDemo: () => {
          set({
            ...initialData(),
            audit: [
              { id: uid("A"), at: nowIST(), actor: ME.name, actorKind: "INVESTIGATOR", action: "Demo workspace reset" },
              ...SEED_AUDIT_LOG,
            ],
          });
        },
      };
    },
    {
      name: "aegis-procure-workspace",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          ...saved,
          saved: { ...current.saved, ...(saved.saved ?? {}) },
          explorer: { ...current.explorer, ...(saved.explorer ?? {}) },
          queue: { ...current.queue, ...(saved.queue ?? {}) },
          compare: { ...current.compare, ...(saved.compare ?? {}) },
          prefs: { ...current.prefs, ...(saved.prefs ?? {}) },
        };
      },
    },
  ),
);

/** All cases the workspace knows about: authored plus investigator-created. */
export function allCases(userCases: InvestigationCase[]) {
  return userCases.length ? [...CASES, ...userCases] : CASES;
}
