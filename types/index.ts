/**
 * AEGIS PROCURE domain model.
 * Dates are IST wall-clock strings: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm".
 * Money is stored in whole rupees.
 */

export type ISODate = string;
export type ISODateTime = string;

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type SignalType =
  | "PRICE_OUTLIER"
  | "REPEATED_AWARDS"
  | "BID_ROTATION"
  | "CLOSE_BIDS"
  | "SINGLE_BID"
  | "VENDOR_CONCENTRATION"
  | "PARTICIPATION_PATTERN"
  | "SHARED_ENTITY"
  | "CONTRACT_SPLITTING"
  | "TIMING_ANOMALY"
  | "PAYMENT_PATTERN";

export type SignalCategory =
  | "PRICE"
  | "BID_BEHAVIOR"
  | "AWARD_CONCENTRATION"
  | "VENDOR_RELATIONSHIP"
  | "TIMING"
  | "CONTRACT"
  | "PAYMENT"
  | "PARTICIPATION";

export type SignalStatus = "OPEN" | "IN_CASE" | "EXPLAINED" | "DISMISSED";

export type InvestigationStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "EVIDENCE_GATHERING"
  | "CONTEXT_CHECK"
  | "NEEDS_MORE_EVIDENCE"
  | "REFERRED"
  | "RESOLVED"
  | "CLOSED";

export type InvestigationOutcome =
  | "NO_ISSUE_FOUND"
  | "EXPLAINED_BY_CONTEXT"
  | "NEEDS_MORE_REVIEW"
  | "REFERRED_FOR_AUDIT"
  | "CLOSED";

export type SignalFeedback = "RELEVANT" | "NOT_RELEVANT" | "EXPLAINED";

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

export type DepartmentId = "pwd" | "hfw" | "edu" | "trn" | "rdp" | "udd" | "wrd" | "agr";

export interface Department {
  id: DepartmentId;
  code: string;
  name: string;
  short: string;
}

export type CategoryId =
  | "road"
  | "building"
  | "water"
  | "medsup"
  | "medeq"
  | "it"
  | "transport"
  | "agri"
  | "edumat";

export type CategoryFamily = "CIVIL" | "MEDICAL" | "IT" | "TRANSPORT" | "AGRI" | "EDUCATION";

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  family: CategoryFamily;
}

export type RegionId = "coastal" | "malnad" | "bengaluru" | "mysuru" | "kalyana" | "kittur";

export interface Region {
  id: RegionId;
  name: string;
  short: string;
  zones: number;
  towns: string[];
}

export interface Investigator {
  id: string;
  name: string;
  role: string;
  initials: string;
  unit: string;
}

/* ------------------------------------------------------------------ */
/* Procurement records                                                 */
/* ------------------------------------------------------------------ */

export type VerificationStatus = "REGISTERED" | "VERIFIED" | "PENDING_RENEWAL";

export interface Vendor {
  id: string;
  name: string;
  legalForm: string;
  registrationNo: string;
  gstin: string;
  registeredOn: ISODate;
  verification: VerificationStatus;
  regionId: RegionId;
  city: string;
  address: string;
  categories: CategoryId[];
  primaryCategory: CategoryId;
  directors: string[];
  classLabel: string;
  /** Hand-authored profile used in the demo storyline. */
  named: boolean;
}

export type TenderStatus =
  | "OPEN"
  | "EVALUATION"
  | "AWARDED"
  | "IN_EXECUTION"
  | "COMPLETED"
  | "CANCELLED";

export type ProcurementMethod =
  | "OPEN_TENDER"
  | "LIMITED_TENDER"
  | "SINGLE_SOURCE"
  | "RATE_CONTRACT"
  | "DIRECT_PURCHASE";

export type EvaluationMethod = "L1" | "QCBS";

export interface Tender {
  id: string;
  title: string;
  departmentId: DepartmentId;
  categoryId: CategoryId;
  regionId: RegionId;
  zone?: string;
  location: string;
  method: ProcurementMethod;
  evaluation: EvaluationMethod;
  qcbsWeights?: [number, number];
  estimate: number;
  publishedOn: ISODate;
  bidDeadline: ISODateTime;
  evaluatedOn?: ISODate;
  awardedOn?: ISODate;
  status: TenderStatus;
  winnerVendorId?: string;
  awardValue?: number;
  contractId?: string;
  bidIds: string[];
  scope: string;
  eventCount: number;
  comparableIds?: string[];
  story?: boolean;
}

export type BidOutcome = "WON" | "LOST" | "DISQUALIFIED" | "PENDING" | "CANCELLED";

export interface Bid {
  id: string;
  tenderId: string;
  vendorId: string;
  amount: number;
  submittedAt: ISODateTime;
  technicalScore?: number;
  financialScore?: number;
  combinedScore?: number;
  rank: number;
  outcome: BidOutcome;
}

export type ContractStatus = "ACTIVE" | "COMPLETED";

export interface Contract {
  id: string;
  tenderId: string;
  vendorId: string;
  departmentId: DepartmentId;
  categoryId: CategoryId;
  regionId: RegionId;
  title: string;
  value: number;
  signedOn: ISODate;
  startOn: ISODate;
  endOn: ISODate;
  status: ContractStatus;
  paidToDate: number;
  progress: number;
}

export type PaymentType =
  | "ADVANCE"
  | "RUNNING_BILL"
  | "FINAL_BILL"
  | "RETENTION_RELEASE"
  | "SUPPLY_INVOICE";

export interface Payment {
  id: string;
  contractId: string;
  vendorId: string;
  amount: number;
  type: PaymentType;
  invoiceNo: string;
  invoiceOn: ISODate;
  paidOn: ISODate;
  daysToPay: number;
  milestoneCertified: boolean;
  flagged?: boolean;
}

/* ------------------------------------------------------------------ */
/* Relationships & network                                             */
/* ------------------------------------------------------------------ */

export type EntityKind =
  | "VENDOR"
  | "TENDER"
  | "CONTRACT"
  | "DEPARTMENT"
  | "DIRECTOR"
  | "ADDRESS"
  | "BANK_ACCOUNT"
  | "CONTACT"
  | "OWNER"
  | "REGISTRATION";

export type RelationshipType =
  | "SHARED_ADDRESS"
  | "SHARED_PHONE"
  | "SHARED_EMAIL"
  | "SHARED_DIRECTOR"
  | "SHARED_REGISTRATION"
  | "COMMON_OWNERSHIP"
  | "JOINT_BIDDING"
  | "REPEATED_PARTICIPATION"
  | "PAYMENT_LINK";

export type RelationshipStrength = "HIGH" | "MEDIUM" | "LOW";

export interface RelationshipEvidence {
  recordId: string;
  source: string;
  date: ISODate;
  detail: string;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  vendorIds: [string, string];
  via?: { kind: EntityKind; id: string; label: string };
  strength: RelationshipStrength;
  evidenceCount: number;
  firstObserved: ISODate;
  lastObserved: ISODate;
  summary: string;
  evidence: RelationshipEvidence[];
  context?: string;
  verification: "REQUIRES_VERIFICATION" | "CONTEXT_EXPLAINED";
  matchScore?: number;
  signalId?: string;
}

export type NetworkEdgeType =
  | RelationshipType
  | "BID"
  | "AWARD"
  | "CONTRACT"
  | "ISSUED_BY";

export interface NetworkNode {
  id: string;
  kind: EntityKind;
  label: string;
  sublabel?: string;
  flagged?: boolean;
  x: number;
  y: number;
  degree: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: NetworkEdgeType;
  strength?: RelationshipStrength;
  relationshipId?: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Signals, evidence, cases                                            */
/* ------------------------------------------------------------------ */

export interface Metric {
  label: string;
  value: string;
  note?: string;
}

export interface SignalComparison {
  label: string;
  current: number;
  baseline: number;
  unit: "INR" | "PCT" | "COUNT" | "DAYS";
  baselineLabel: string;
}

export interface AnomalySignal {
  id: string;
  type: SignalType;
  category: SignalCategory;
  title: string;
  headline: string;
  severity: PriorityLevel;
  confidence: Confidence;
  strength: number;
  detectedOn: ISODate;
  vendorIds: string[];
  tenderIds: string[];
  contractIds: string[];
  departmentId: DepartmentId;
  categoryId: CategoryId;
  regionId: RegionId;
  metrics: Metric[];
  comparison?: SignalComparison;
  explanation: string;
  context: string;
  alternatives: string[];
  reasoning: string;
  dataCoverage: string;
  recommendedAction: string;
  actionLabel: string;
  evidenceIds: string[];
  caseId?: string;
  /** Signals produced from an investigator's imported file. */
  imported?: boolean;
}

export type EvidenceGroup =
  | "PROCUREMENT"
  | "BIDS"
  | "VENDOR"
  | "CONTRACT"
  | "PAYMENT"
  | "RELATIONSHIP"
  | "COMPARABLE";

export interface Evidence {
  id: string;
  group: EvidenceGroup;
  kind: string;
  recordId: string;
  title: string;
  source: string;
  date: ISODate;
  fields: Metric[];
  relevantValue: string;
  whyItMatters: string;
  signalIds: string[];
  neutral?: boolean;
  href?: string;
}

export interface PriorityFactor {
  id: string;
  label: string;
  points: number;
  signalIds: string[];
  rationale: string;
}

export interface ContextAdjustment {
  label: string;
  value: string;
  effect: number;
  source: string;
}

export interface ContextCheck {
  id: string;
  factorId: string;
  title: string;
  observed: string;
  observedValue: number;
  adjustments: ContextAdjustment[];
  adjustedValue: number;
  adjustedLabel: string;
  adjustedPoints: number;
  reason: string;
  verdict: string;
  recommended: boolean;
}

export interface InvestigationQuestion {
  id: string;
  text: string;
  rationale: string;
  evidenceIds: string[];
}

export type TimelineKind =
  | "TENDER"
  | "CORRIGENDUM"
  | "BID"
  | "EVALUATION"
  | "AWARD"
  | "CONTRACT"
  | "INVOICE"
  | "PAYMENT"
  | "INSPECTION";

export interface TimelineEvent {
  id: string;
  at: ISODateTime;
  kind: TimelineKind;
  label: string;
  detail: string;
  recordId?: string;
  signalIds?: string[];
  unusual?: boolean;
  annotation?: string;
}

export interface InvestigationCase {
  id: string;
  title: string;
  tenderId: string;
  vendorId: string;
  relatedVendorIds: string[];
  departmentId: DepartmentId;
  categoryId: CategoryId;
  regionId: RegionId;
  value: number;
  primarySignal: string;
  summary: string;
  openedOn: ISODateTime;
  initialStatus: InvestigationStatus;
  initialAssigneeId?: string;
  primarySignalIds: string[];
  signalIds: string[];
  factors: PriorityFactor[];
  evidence: Evidence[];
  contextChecks: ContextCheck[];
  questions: InvestigationQuestion[];
  timelineNotes?: Record<string, { annotation: string; signalIds: string[] }>;
  historical?: {
    outcome: InvestigationOutcome;
    closedOn: ISODate;
    note: string;
  };
  /** Created by an investigator from a signal inside the prototype. */
  userCreated?: boolean;
}

/* ------------------------------------------------------------------ */
/* Workspace state                                                     */
/* ------------------------------------------------------------------ */

export type NoteKind = "NOTE" | "CONTEXT" | "EVIDENCE" | "FEEDBACK" | "STATUS";

export interface InvestigatorNote {
  id: string;
  caseId: string;
  authorId: string;
  text: string;
  createdAt: ISODateTime;
  kind: NoteKind;
}

export type NotificationKind = "SIGNAL" | "ASSIGNMENT" | "DATA" | "REVIEW" | "ANALYSIS";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: ISODateTime;
  read: boolean;
  href?: string;
}

export type AuditActorKind = "SYSTEM" | "INVESTIGATOR" | "ADMIN" | "AI";

export interface AuditLogEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  actorKind: AuditActorKind;
  action: string;
  target?: string;
  detail?: string;
}

export type DataSourceStatus = "CONNECTED" | "SYNCING" | "ATTENTION";

export interface DataSource {
  id: string;
  name: string;
  description: string;
  records: number;
  unit: string;
  lastUpdated: ISODateTime;
  status: DataSourceStatus;
  coverage: string;
}

export type AIIntent =
  | "SUMMARIZE_EVIDENCE"
  | "COMPARE_CONTRACTS"
  | "EXPLAIN_SCORE"
  | "GENERATE_QUESTIONS"
  | "CONTEXT"
  | "RELATIONSHIPS"
  | "NEXT_STEPS"
  | "MISCONDUCT_GUARDRAIL"
  | "UNKNOWN";

export type AIBlockKind =
  | "OBSERVED"
  | "SIGNAL"
  | "CONTEXT"
  | "INTERPRETATION"
  | "QUESTIONS"
  | "LIMITS"
  | "NEXT_STEPS";

export interface AIBlockItem {
  text: string;
  refs?: string[];
}

export interface AIBlock {
  kind: AIBlockKind;
  title: string;
  items: AIBlockItem[];
}

export interface AIAnalysis {
  intent: AIIntent;
  title: string;
  lead: string;
  blocks: AIBlock[];
  disclaimer: string;
}

export interface AIMessage {
  id: string;
  role: "INVESTIGATOR" | "ASSISTANT";
  text: string;
  analysis?: AIAnalysis;
  createdAt: ISODateTime;
}

export interface DataImport {
  id: string;
  fileName: string;
  format: "CSV" | "JSON";
  rows: number;
  columns: string[];
  issues: string[];
  importedAt: ISODateTime;
  signalsGenerated: number;
  status: "ANALYZED" | "FAILED";
}

export type SavedItemKind = "CASE" | "VENDOR" | "PROCUREMENT" | "EVIDENCE";

export interface Collection {
  id: string;
  name: string;
  createdAt: ISODateTime;
  items: { kind: SavedItemKind; id: string }[];
}
