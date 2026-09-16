import type {
  Category,
  CategoryId,
  Confidence,
  Department,
  DepartmentId,
  EntityKind,
  EvaluationMethod,
  EvidenceGroup,
  InvestigationOutcome,
  InvestigationStatus,
  Investigator,
  PriorityLevel,
  ProcurementMethod,
  Region,
  RegionId,
  RelationshipStrength,
  RelationshipType,
  SignalCategory,
  SignalType,
  TenderStatus,
} from "@/types";

/** Every entity, record and amount in this prototype is synthetic. */
export const SYNTHETIC_NOTICE =
  "Synthetic demo data. All vendors, officers, tenders and payments are fictional.";

export const SCORE_DISCLAIMER =
  "This score prioritizes cases for human review. It does not determine misconduct.";

export const AI_DISCLAIMER =
  "AI-generated analysis is decision support, not a finding of misconduct.";

export const RELATIONSHIP_DISCLAIMER =
  "A relationship signal is an investigative lead that requires verification. It is not proof of wrongdoing.";

export const LEGITIMATE_EXPLANATIONS = [
  "Specialized suppliers in a thin market",
  "Regional price differences and transport cost",
  "Emergency or disaster-response procurement",
  "Material scarcity or an index-linked cost rise",
  "Contract complexity or a different technical specification",
  "Limited vendor availability at the time of tendering",
  "Framework or rate-contract structures that concentrate awards",
];

/* ------------------------------------------------------------------ */
/* Organisation reference                                              */
/* ------------------------------------------------------------------ */

export const DEPARTMENTS: Department[] = [
  { id: "pwd", code: "PWD", name: "Public Works Department", short: "Public Works" },
  { id: "hfw", code: "HFW", name: "Health & Family Welfare", short: "Health" },
  { id: "edu", code: "EDU", name: "School Education Department", short: "Education" },
  { id: "trn", code: "TRN", name: "Transport Department", short: "Transport" },
  { id: "rdp", code: "RDP", name: "Rural Development & Panchayat Raj", short: "Rural Development" },
  { id: "udd", code: "UDD", name: "Urban Development Department", short: "Urban Development" },
  { id: "wrd", code: "WRD", name: "Water Resources Department", short: "Water Resources" },
  { id: "agr", code: "AGR", name: "Agriculture Department", short: "Agriculture" },
];

export const CATEGORIES: Category[] = [
  { id: "road", name: "Road Infrastructure", short: "Roads", family: "CIVIL" },
  { id: "building", name: "Building Construction", short: "Construction", family: "CIVIL" },
  { id: "water", name: "Water & Sanitation Works", short: "Water", family: "CIVIL" },
  { id: "medsup", name: "Medical Supplies", short: "Med supplies", family: "MEDICAL" },
  { id: "medeq", name: "Medical Equipment", short: "Med equipment", family: "MEDICAL" },
  { id: "it", name: "IT Services", short: "IT", family: "IT" },
  { id: "transport", name: "Transportation Services", short: "Transport", family: "TRANSPORT" },
  { id: "agri", name: "Agriculture Inputs", short: "Agriculture", family: "AGRI" },
  { id: "edumat", name: "Education Materials", short: "Education", family: "EDUCATION" },
];

export const REGIONS: Region[] = [
  {
    id: "coastal",
    name: "Coastal Karnataka",
    short: "Coastal",
    zones: 6,
    towns: ["Mangaluru", "Udupi", "Karwar", "Puttur", "Kundapura", "Bhatkal"],
  },
  {
    id: "malnad",
    name: "Malnad",
    short: "Malnad",
    zones: 4,
    towns: ["Shivamogga", "Chikkamagaluru", "Hassan", "Madikeri"],
  },
  {
    id: "bengaluru",
    name: "Bengaluru Region",
    short: "Bengaluru",
    zones: 4,
    towns: ["Bengaluru Urban", "Bengaluru Rural", "Ramanagara", "Tumakuru"],
  },
  {
    id: "mysuru",
    name: "Mysuru Region",
    short: "Mysuru",
    zones: 4,
    towns: ["Mysuru", "Mandya", "Chamarajanagar", "Nanjangud"],
  },
  {
    id: "kalyana",
    name: "Kalyana Karnataka",
    short: "Kalyana",
    zones: 4,
    towns: ["Kalaburagi", "Ballari", "Raichur", "Bidar"],
  },
  {
    id: "kittur",
    name: "Kittur Karnataka",
    short: "Kittur",
    zones: 4,
    towns: ["Belagavi", "Dharwad", "Vijayapura", "Bagalkot"],
  },
];

export const DEPARTMENT_BY_ID = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d]),
) as Record<DepartmentId, Department>;

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>;

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<
  RegionId,
  Region
>;

export const departmentName = (id: DepartmentId) => DEPARTMENT_BY_ID[id]?.short ?? id;
export const categoryName = (id: CategoryId) => CATEGORY_BY_ID[id]?.name ?? id;
export const regionName = (id: RegionId) => REGION_BY_ID[id]?.name ?? id;

export const INVESTIGATORS: Investigator[] = [
  { id: "U-01", name: "A. Rao", role: "Senior Investigator", initials: "AR", unit: "Procurement Audit Cell" },
  { id: "U-02", name: "D. Kulkarni", role: "Procurement Auditor", initials: "DK", unit: "Procurement Audit Cell" },
  { id: "U-03", name: "F. Siddiqui", role: "Forensic Accountant", initials: "FS", unit: "Financial Review Unit" },
  { id: "U-04", name: "M. Iyer", role: "Data Analyst", initials: "MI", unit: "Analytics" },
  { id: "U-05", name: "L. Thomas", role: "Investigation Lead", initials: "LT", unit: "Procurement Audit Cell" },
];

export const CURRENT_INVESTIGATOR = INVESTIGATORS[0];

export const INVESTIGATOR_BY_ID = Object.fromEntries(INVESTIGATORS.map((i) => [i.id, i]));

/* ------------------------------------------------------------------ */
/* Signal taxonomy                                                     */
/* ------------------------------------------------------------------ */

export const SIGNAL_TYPE_META: Record<
  SignalType,
  { label: string; category: SignalCategory; description: string }
> = {
  PRICE_OUTLIER: {
    label: "Price outlier",
    category: "PRICE",
    description: "A contract price differs materially from comparable procurements.",
  },
  REPEATED_AWARDS: {
    label: "Repeated awards",
    category: "AWARD_CONCENTRATION",
    description: "One vendor repeatedly wins within a department and category.",
  },
  BID_ROTATION: {
    label: "Bid rotation signal",
    category: "BID_BEHAVIOR",
    description: "Winners appear to alternate across similar procurements.",
  },
  CLOSE_BIDS: {
    label: "Unusually close bids",
    category: "BID_BEHAVIOR",
    description: "Bids sit closer together than comparable procurements.",
  },
  SINGLE_BID: {
    label: "Single-bid award",
    category: "BID_BEHAVIOR",
    description: "A tender concluded with one responsive bid.",
  },
  VENDOR_CONCENTRATION: {
    label: "Vendor concentration",
    category: "AWARD_CONCENTRATION",
    description: "A small number of vendors hold most of a category.",
  },
  PARTICIPATION_PATTERN: {
    label: "Participation pattern",
    category: "PARTICIPATION",
    description: "The same vendors repeatedly appear in the same tenders.",
  },
  SHARED_ENTITY: {
    label: "Shared entity signal",
    category: "VENDOR_RELATIONSHIP",
    description: "Vendors share an address, director, contact or registration detail.",
  },
  CONTRACT_SPLITTING: {
    label: "Contract splitting signal",
    category: "CONTRACT",
    description: "Related awards sit close in timing, value and category.",
  },
  TIMING_ANOMALY: {
    label: "Timing anomaly",
    category: "TIMING",
    description: "Procurement steps happen in an unusual temporal pattern.",
  },
  PAYMENT_PATTERN: {
    label: "Payment pattern",
    category: "PAYMENT",
    description: "Payment behavior differs from comparable contracts.",
  },
};

export const SIGNAL_CATEGORY_META: Record<
  SignalCategory,
  { label: string; short: string; question: string }
> = {
  PRICE: {
    label: "Price anomaly",
    short: "Price",
    question: "Is this price explainable against comparable procurements?",
  },
  BID_BEHAVIOR: {
    label: "Bid behavior",
    short: "Bidding",
    question: "Did bidding behave the way a competitive market usually behaves?",
  },
  AWARD_CONCENTRATION: {
    label: "Award concentration",
    short: "Awards",
    question: "Is the work concentrating in a way specialization does not explain?",
  },
  VENDOR_RELATIONSHIP: {
    label: "Vendor relationship",
    short: "Relationships",
    question: "Are supposedly independent bidders connected?",
  },
  TIMING: {
    label: "Timing pattern",
    short: "Timing",
    question: "Do the dates in this procurement follow the normal rhythm?",
  },
  CONTRACT: {
    label: "Contract pattern",
    short: "Contracts",
    question: "Are related contracts structured to stay under a threshold?",
  },
  PAYMENT: {
    label: "Payment pattern",
    short: "Payments",
    question: "Does money move the way comparable contracts pay out?",
  },
  PARTICIPATION: {
    label: "Participation pattern",
    short: "Participation",
    question: "Do the same vendors keep meeting each other in the same tenders?",
  },
};

export const SIGNAL_CATEGORY_ORDER: SignalCategory[] = [
  "PRICE",
  "BID_BEHAVIOR",
  "AWARD_CONCENTRATION",
  "VENDOR_RELATIONSHIP",
  "TIMING",
  "CONTRACT",
  "PAYMENT",
  "PARTICIPATION",
];

/** Signal Center filter groups (a filter can cover more than one category). */
export const ALERT_FILTERS: { id: string; label: string; categories: SignalCategory[] }[] = [
  { id: "all", label: "All", categories: SIGNAL_CATEGORY_ORDER },
  { id: "price", label: "Price", categories: ["PRICE"] },
  { id: "bidding", label: "Bidding", categories: ["BID_BEHAVIOR", "PARTICIPATION"] },
  { id: "relationships", label: "Relationships", categories: ["VENDOR_RELATIONSHIP"] },
  { id: "awards", label: "Awards", categories: ["AWARD_CONCENTRATION", "CONTRACT"] },
  { id: "payments", label: "Payments", categories: ["PAYMENT"] },
  { id: "timing", label: "Timing", categories: ["TIMING"] },
];

/* ------------------------------------------------------------------ */
/* Priority, status, outcome                                           */
/* ------------------------------------------------------------------ */

export const PRIORITY_META: Record<
  PriorityLevel,
  { label: string; tone: "slate" | "warn" | "risk" | "critical"; band: string }
> = {
  LOW: { label: "Low", tone: "slate", band: "0–44" },
  MEDIUM: { label: "Medium", tone: "warn", band: "45–69" },
  HIGH: { label: "High", tone: "risk", band: "70–89" },
  CRITICAL: { label: "Critical", tone: "critical", band: "90–100" },
};

export const PRIORITY_ORDER: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function levelFromScore(score: number): PriorityLevel {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export const STATUS_META: Record<
  InvestigationStatus,
  { label: string; description: string; step: number }
> = {
  NEW: { label: "New", description: "Queued for a first read by an investigator.", step: 0 },
  UNDER_REVIEW: { label: "Under review", description: "An investigator is reading the signals and evidence.", step: 1 },
  EVIDENCE_GATHERING: { label: "Evidence gathering", description: "Supporting records are being collected.", step: 2 },
  CONTEXT_CHECK: { label: "Context check", description: "Testing whether context explains the observed variation.", step: 3 },
  NEEDS_MORE_EVIDENCE: { label: "Needs more evidence", description: "Current records are not sufficient to conclude.", step: 4 },
  REFERRED: { label: "Referred", description: "Handed to audit or the competent authority.", step: 5 },
  RESOLVED: { label: "Resolved", description: "Review complete with a recorded outcome.", step: 6 },
  CLOSED: { label: "Closed", description: "Closed in the queue; record retained.", step: 7 },
};

export const STATUS_ORDER: InvestigationStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "EVIDENCE_GATHERING",
  "CONTEXT_CHECK",
  "NEEDS_MORE_EVIDENCE",
  "REFERRED",
  "RESOLVED",
  "CLOSED",
];

export const ACTIVE_STATUSES: InvestigationStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "EVIDENCE_GATHERING",
  "CONTEXT_CHECK",
  "NEEDS_MORE_EVIDENCE",
  "REFERRED",
];

export const OUTCOME_META: Record<
  InvestigationOutcome,
  { label: string; description: string; tone: "ok" | "accent" | "warn" | "risk" | "slate" }
> = {
  NO_ISSUE_FOUND: {
    label: "No issue found",
    description: "Records reviewed; the pattern is consistent with normal procurement.",
    tone: "ok",
  },
  EXPLAINED_BY_CONTEXT: {
    label: "Explained by context",
    description: "Market, regional or specification context accounts for the variation.",
    tone: "accent",
  },
  NEEDS_MORE_REVIEW: {
    label: "Needs more review",
    description: "Evidence is inconclusive; keep the case under monitoring.",
    tone: "warn",
  },
  REFERRED_FOR_AUDIT: {
    label: "Referred for audit",
    description: "Passed to audit or the competent authority for a formal examination.",
    tone: "risk",
  },
  CLOSED: {
    label: "Closed",
    description: "Closed without further action.",
    tone: "slate",
  },
};

export const CONFIDENCE_META: Record<Confidence, { label: string; description: string }> = {
  HIGH: { label: "High", description: "Complete records for every field this signal depends on." },
  MEDIUM: { label: "Medium", description: "Some supporting fields are incomplete or unverified." },
  LOW: { label: "Low", description: "Sparse comparable data; treat the measurement as indicative." },
};

/* ------------------------------------------------------------------ */
/* Relationships & network                                             */
/* ------------------------------------------------------------------ */

export type NetworkFilterId =
  | "all"
  | "ownership"
  | "management"
  | "address"
  | "contact"
  | "bidding"
  | "awards"
  | "contracts"
  | "payments";

export const RELATIONSHIP_TYPE_META: Record<
  RelationshipType,
  { label: string; filter: NetworkFilterId; description: string }
> = {
  SHARED_ADDRESS: {
    label: "Shared address",
    filter: "address",
    description: "Two vendors are registered at the same address.",
  },
  SHARED_PHONE: {
    label: "Shared phone",
    filter: "contact",
    description: "The same contact number appears in both vendors' records.",
  },
  SHARED_EMAIL: {
    label: "Shared email",
    filter: "contact",
    description: "The same email address appears in both vendors' records.",
  },
  SHARED_DIRECTOR: {
    label: "Shared director",
    filter: "management",
    description: "A director is common to both vendors.",
  },
  SHARED_REGISTRATION: {
    label: "Shared registration detail",
    filter: "ownership",
    description: "Registration filings share an identifier, agent or document set.",
  },
  COMMON_OWNERSHIP: {
    label: "Common ownership indicator",
    filter: "ownership",
    description: "Shareholding records point to a common owner.",
  },
  JOINT_BIDDING: {
    label: "Joint participation",
    filter: "bidding",
    description: "Both vendors bid in the same tenders.",
  },
  REPEATED_PARTICIPATION: {
    label: "Repeated participation",
    filter: "bidding",
    description: "The pair appears together far more often than the market average.",
  },
  PAYMENT_LINK: {
    label: "Payment relationship",
    filter: "payments",
    description: "Payments flow between the two vendors.",
  },
};

export const NETWORK_FILTERS: { id: NetworkFilterId; label: string }[] = [
  { id: "all", label: "All relationships" },
  { id: "ownership", label: "Ownership" },
  { id: "management", label: "Management" },
  { id: "address", label: "Address" },
  { id: "contact", label: "Contact" },
  { id: "bidding", label: "Bidding" },
  { id: "awards", label: "Awards" },
  { id: "contracts", label: "Contracts" },
  { id: "payments", label: "Payments" },
];

export const STRENGTH_META: Record<
  RelationshipStrength,
  { label: string; description: string }
> = {
  HIGH: { label: "High", description: "Exact match across multiple independent records." },
  MEDIUM: { label: "Medium", description: "Consistent match in more than one record." },
  LOW: { label: "Low", description: "Single or partial match; verify before relying on it." },
};

export const ENTITY_KIND_META: Record<EntityKind, { label: string }> = {
  VENDOR: { label: "Vendor" },
  TENDER: { label: "Tender" },
  CONTRACT: { label: "Contract" },
  DEPARTMENT: { label: "Department" },
  DIRECTOR: { label: "Director" },
  ADDRESS: { label: "Address" },
  BANK_ACCOUNT: { label: "Bank account" },
  CONTACT: { label: "Contact" },
  OWNER: { label: "Owner" },
  REGISTRATION: { label: "Registration" },
};

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export const EVIDENCE_GROUP_META: Record<EvidenceGroup, { label: string; description: string }> = {
  PROCUREMENT: { label: "Procurement records", description: "Tender notice, evaluation and award documents." },
  BIDS: { label: "Bid history", description: "Submitted bids, amounts and submission times." },
  VENDOR: { label: "Vendor records", description: "Registry filings, directors and contact details." },
  CONTRACT: { label: "Contract data", description: "Signed contract, scope and award history." },
  PAYMENT: { label: "Payment data", description: "Invoices, releases and certification status." },
  RELATIONSHIP: { label: "Relationship data", description: "Links between vendors and shared entities." },
  COMPARABLE: { label: "Comparable contracts", description: "The procurement set this case is measured against." },
};

export const METHOD_LABEL: Record<ProcurementMethod, string> = {
  OPEN_TENDER: "Open e-tender",
  LIMITED_TENDER: "Limited tender",
  SINGLE_SOURCE: "Single source",
  RATE_CONTRACT: "Rate contract",
  DIRECT_PURCHASE: "Direct purchase",
};

export const EVALUATION_LABEL: Record<EvaluationMethod, string> = {
  L1: "Lowest evaluated bid (L1)",
  QCBS: "Quality-cum-cost (QCBS)",
};

export const TENDER_STATUS_META: Record<TenderStatus, { label: string; tone: "ok" | "accent" | "warn" | "slate" }> = {
  OPEN: { label: "Open for bids", tone: "accent" },
  EVALUATION: { label: "Under evaluation", tone: "accent" },
  AWARDED: { label: "Awarded", tone: "ok" },
  IN_EXECUTION: { label: "In execution", tone: "ok" },
  COMPLETED: { label: "Completed", tone: "slate" },
  CANCELLED: { label: "Cancelled", tone: "warn" },
};

/** The analysis window every aggregate on the platform is computed over. */
export const ANALYSIS_WINDOW = { from: "2024-04-01", to: "2026-09-15" };
export const LAST_ANALYSIS_AT = "2026-09-15T09:42";
