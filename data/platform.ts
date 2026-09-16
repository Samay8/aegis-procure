import type { AuditLogEntry, DataSource, NotificationItem } from "@/types";
import { BIDS, CONTRACTS, PAYMENTS, TENDERS, TOTAL_EVENTS } from "./procurement";
import { RELATIONSHIPS } from "./relationships";
import { SIGNALS } from "./signals";
import { VENDORS } from "./vendors";

export const DATA_SOURCES: DataSource[] = [
  {
    id: "DS-PROC",
    name: "Procurement records",
    description: "Tender notices, corrigenda, evaluations and award orders from the e-procurement portal.",
    records: TOTAL_EVENTS,
    unit: `events across ${TENDERS.length} tenders`,
    lastUpdated: "2026-09-15T09:31",
    status: "CONNECTED",
    coverage: "Apr 2024 – Sep 2026",
  },
  {
    id: "DS-VEND",
    name: "Vendor registry",
    description: "Registered vendors, classes of registration, addresses and contact details.",
    records: VENDORS.length,
    unit: "vendors",
    lastUpdated: "2026-09-15T06:00",
    status: "CONNECTED",
    coverage: "All active and lapsed registrations",
  },
  {
    id: "DS-BIDS",
    name: "Bid records",
    description: "Submitted bids with amounts, technical scores and portal timestamps.",
    records: BIDS.length,
    unit: "bids",
    lastUpdated: "2026-09-15T09:31",
    status: "CONNECTED",
    coverage: "Apr 2024 – Sep 2026",
  },
  {
    id: "DS-CONT",
    name: "Contract database",
    description: "Signed contracts, terms, milestones and progress.",
    records: CONTRACTS.length,
    unit: "contracts",
    lastUpdated: "2026-09-15T08:12",
    status: "CONNECTED",
    coverage: "All awarded tenders",
  },
  {
    id: "DS-PAY",
    name: "Payment records",
    description: "Invoices, payment releases and milestone certification flags from the treasury.",
    records: PAYMENTS.length,
    unit: "payments",
    lastUpdated: "2026-09-15T09:30",
    status: "CONNECTED",
    coverage: "Apr 2024 – Sep 2026",
  },
  {
    id: "DS-CORP",
    name: "Corporate filings",
    description: "Director registers, shareholding returns and registration agents used to resolve relationships.",
    records: 2_946,
    unit: `filings · ${RELATIONSHIPS.length} relationships resolved`,
    lastUpdated: "2026-09-14T22:00",
    status: "SYNCING",
    coverage: "Named vendors in the analysis window",
  },
  {
    id: "DS-CTX",
    name: "Market context",
    description: "Construction material price index, schedule-of-rates factors and supply advisories.",
    records: 214,
    unit: "context series",
    lastUpdated: "2026-09-01T10:00",
    status: "CONNECTED",
    coverage: "Monthly, Jan 2024 – Aug 2026",
  },
];

export const DATA_QUALITY = {
  score: 94,
  recordsAnalyzed: TOTAL_EVENTS,
  checks: [
    {
      id: "missing",
      label: "Missing values",
      value: "1.8%",
      status: "ATTENTION" as const,
      detail: "Contract end dates missing on 64 records; GST numbers missing on 22 vendor registrations.",
      impact: "Signals that depend on contract duration carry medium confidence where the date is missing.",
    },
    {
      id: "duplicates",
      label: "Duplicate records",
      value: "37 merged",
      status: "OK" as const,
      detail: "37 tender notices appeared twice after a portal migration and were merged on tender id and date.",
      impact: "No effect on signals after merging.",
    },
    {
      id: "identity",
      label: "Vendor identity matches",
      value: "1,351 → 1,284",
      status: "OK" as const,
      detail: "67 duplicate registrations resolved to a single vendor using GST and registration numbers.",
      impact: "Prevents one vendor appearing as several, which would hide concentration.",
    },
    {
      id: "dates",
      label: "Date consistency",
      value: "99.2%",
      status: "ATTENTION" as const,
      detail: "83 records show an award date before the bid deadline and were held back from timing analysis.",
      impact: "Timing signals exclude these records until the dates are corrected.",
    },
    {
      id: "categories",
      label: "Category consistency",
      value: "97.6%",
      status: "OK" as const,
      detail: "Free-text categories mapped to the standard taxonomy; 98 records mapped with low certainty.",
      impact: "Comparable sets exclude low-certainty category mappings.",
    },
  ],
};

export const SYSTEM_SERVICES = [
  { id: "ingest", name: "Ingestion pipeline", status: "OPERATIONAL", latency: "4 min behind portal", uptime: "99.96%" },
  { id: "scoring", name: "Signal scoring engine", status: "OPERATIONAL", latency: "Last run 09:42", uptime: "99.99%" },
  { id: "resolver", name: "Relationship resolver", status: "DEGRADED", latency: "Corporate filings syncing", uptime: "99.41%" },
  { id: "context", name: "Context engine", status: "OPERATIONAL", latency: "214 context series loaded", uptime: "99.98%" },
  { id: "assistant", name: "Investigation assistant", status: "OPERATIONAL", latency: "Grounded on case evidence only", uptime: "99.90%" },
  { id: "search", name: "Search index", status: "OPERATIONAL", latency: "Indexed 09:43", uptime: "99.99%" },
];

export const ANALYSIS_JOBS = [
  { id: "JOB-2026-0915-01", name: "Full anomaly analysis", startedAt: "2026-09-15T09:31", duration: "11 min", records: TOTAL_EVENTS, result: `${SIGNALS.length} open signals` },
  { id: "JOB-2026-0915-00", name: "Payment register sync", startedAt: "2026-09-15T09:20", duration: "10 min", records: PAYMENTS.length, result: "3 flagged payments" },
  { id: "JOB-2026-0914-03", name: "Relationship resolution", startedAt: "2026-09-14T22:00", duration: "In progress", records: 2_946, result: `${RELATIONSHIPS.length} relationships` },
  { id: "JOB-2026-0914-02", name: "Comparable set refresh", startedAt: "2026-09-14T21:15", duration: "6 min", records: CONTRACTS.length, result: "376 comparable sets" },
  { id: "JOB-2026-0901-01", name: "Market context refresh", startedAt: "2026-09-01T10:00", duration: "2 min", records: 214, result: "Material index updated to Aug 2026" },
];

export const SIGNAL_MODELS = [
  { id: "price", name: "Price outlier", version: "3.2", calibrated: "2026-05-04", precision: 71, feedback: 212, note: "Material index context applied before alerting since May 2026." },
  { id: "bids", name: "Close bids & rotation", version: "2.4", calibrated: "2026-06-18", precision: 64, feedback: 97, note: "Compares against the same comparable set as price." },
  { id: "awards", name: "Award concentration", version: "2.1", calibrated: "2026-04-22", precision: 58, feedback: 133, note: "Specialized-market adjustment weights concentration down in thin markets." },
  { id: "relationships", name: "Relationship resolver", version: "4.0", calibrated: "2026-07-30", precision: 77, feedback: 81, note: "Shared-office facilities excluded from address matches." },
  { id: "timing", name: "Timing patterns", version: "1.6", calibrated: "2026-03-12", precision: 49, feedback: 64, note: "Emergency circulars are checked before a short window is flagged." },
  { id: "payments", name: "Payment patterns", version: "1.9", calibrated: "2026-08-02", precision: 69, feedback: 58, note: "Fixed-fee contracts excluded from round-sum checks." },
];

export const PLATFORM_USERS = [
  { id: "U-01", name: "A. Rao", role: "Senior Investigator", access: "Cases, evidence, outcomes", lastActive: "Now" },
  { id: "U-02", name: "D. Kulkarni", role: "Procurement Auditor", access: "Cases, evidence, outcomes", lastActive: "18 min ago" },
  { id: "U-03", name: "F. Siddiqui", role: "Forensic Accountant", access: "Cases, payments, outcomes", lastActive: "1 h ago" },
  { id: "U-04", name: "M. Iyer", role: "Data Analyst", access: "Analytics, data sources", lastActive: "Yesterday" },
  { id: "U-05", name: "L. Thomas", role: "Investigation Lead", access: "Cases, assignment, outcomes", lastActive: "2 h ago" },
  { id: "U-09", name: "S. Menon", role: "Platform Administrator", access: "Data sources, users, system — no case outcomes", lastActive: "3 h ago" },
];

export const ROLE_PERMISSIONS = [
  { permission: "View signals and evidence", investigator: true, lead: true, analyst: true, admin: false },
  { permission: "Change case status and notes", investigator: true, lead: true, analyst: false, admin: false },
  { permission: "Record investigation outcome", investigator: true, lead: true, analyst: false, admin: false },
  { permission: "Override investigation priority", investigator: true, lead: true, analyst: false, admin: false },
  { permission: "Assign cases", investigator: false, lead: true, analyst: false, admin: false },
  { permission: "Manage data sources", investigator: false, lead: false, analyst: true, admin: true },
  { permission: "Manage users", investigator: false, lead: false, analyst: false, admin: true },
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "N-001",
    kind: "SIGNAL",
    title: "New high-priority signal detected",
    body: "Shared registered address between the winner and lowest bidder on TND-2026-04182.",
    createdAt: "2026-09-15T09:44",
    read: false,
    href: "/investigations/INV-2026-0042",
  },
  {
    id: "N-002",
    kind: "ASSIGNMENT",
    title: "Investigation assigned to you",
    body: "INV-2026-0042 · Road Maintenance — Zone 4 · priority 87.",
    createdAt: "2026-09-15T09:46",
    read: false,
    href: "/investigations/INV-2026-0042",
  },
  {
    id: "N-003",
    kind: "ANALYSIS",
    title: "Analysis completed",
    body: `${TOTAL_EVENTS.toLocaleString("en-US")} procurement events analyzed · ${SIGNALS.length} open signals.`,
    createdAt: "2026-09-15T09:42",
    read: false,
    href: "/radar",
  },
  {
    id: "N-004",
    kind: "DATA",
    title: "Data source updated",
    body: `Payment records synced · ${PAYMENTS.length.toLocaleString("en-US")} payments.`,
    createdAt: "2026-09-15T09:30",
    read: true,
    href: "/data-sources",
  },
  {
    id: "N-005",
    kind: "REVIEW",
    title: "Case requires review",
    body: "INV-2026-0039 has new comparable procurement data.",
    createdAt: "2026-09-14T17:12",
    read: true,
    href: "/investigations/INV-2026-0039",
  },
];

const AUDIT_SEED: AuditLogEntry[] = [
  { id: "A-0001", at: "2026-09-15T09:31", actor: "Ingestion pipeline", actorKind: "SYSTEM", action: "Analysis started", detail: `${TOTAL_EVENTS.toLocaleString("en-US")} events queued` },
  { id: "A-0002", at: "2026-09-15T09:30", actor: "Treasury connector", actorKind: "SYSTEM", action: "Data source synced", target: "Payment records" },
  { id: "A-0003", at: "2026-09-15T09:42", actor: "Scoring engine", actorKind: "SYSTEM", action: "Analysis completed", detail: `${TENDERS.length} tenders · ${CONTRACTS.length} contracts` },
  { id: "A-0004", at: "2026-09-15T09:44", actor: "Scoring engine", actorKind: "SYSTEM", action: `${SIGNALS.length} anomaly signals generated`, detail: "9 linked to a new case" },
  { id: "A-0005", at: "2026-09-15T09:44", actor: "Scoring engine", actorKind: "SYSTEM", action: "Case opened", target: "INV-2026-0042", detail: "Investigation priority 87" },
  { id: "A-0006", at: "2026-09-15T09:46", actor: "L. Thomas", actorKind: "INVESTIGATOR", action: "Case assigned", target: "INV-2026-0042", detail: "Assigned to A. Rao" },
  { id: "A-0007", at: "2026-09-14T22:00", actor: "Relationship resolver", actorKind: "SYSTEM", action: "Corporate filings sync started", detail: "2,946 filings" },
  { id: "A-0008", at: "2026-09-14T17:12", actor: "D. Kulkarni", actorKind: "INVESTIGATOR", action: "Evidence added", target: "INV-2026-0039" },
  { id: "A-0009", at: "2026-09-14T11:05", actor: "S. Menon", actorKind: "ADMIN", action: "User role reviewed", detail: "No change to outcome permissions" },
];

export const SEED_AUDIT_LOG: AuditLogEntry[] = [...AUDIT_SEED].sort((a, b) => (a.at < b.at ? 1 : -1));
