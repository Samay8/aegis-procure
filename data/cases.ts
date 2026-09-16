import { formatCr, formatDate, formatDateTime, formatINR, formatPct, daysBetween } from "@/lib/format";
import type {
  ContextCheck,
  Evidence,
  InvestigationCase,
  InvestigationOutcome,
  InvestigationQuestion,
  PriorityFactor,
} from "@/types";
import {
  BIDS_BY_TENDER,
  CONTRACT_BY_TENDER,
  PAYMENTS_BY_CONTRACT,
  TENDER_BY_ID,
  bidSpread,
  bidWindowDays,
  comparableStats,
} from "./procurement";
import { RELATIONSHIP_BY_ID } from "./relationships";
import {
  CASE_BID_HIGH,
  CASE_BID_LOW,
  CASE_COMPARABLE_SPREAD,
  CASE_SPREAD,
  CASE_STATS,
  CLUSTER_TENDER_SET,
  PWD_MEDIAN_WINDOW,
} from "./signals";
import { CASE_CONTRACT, CASE_TENDER, HARROW_SPLIT_IDS, PAIR_TENDER_IDS, PRIMARY_CASE, SPLIT_TENDER_IDS } from "./story";
import { V, VENDOR_BY_ID } from "./vendors";

const vname = (id: string) => VENDOR_BY_ID[id]?.name ?? id;

function makeEvidence(caseNum: string, items: Omit<Evidence, "id">[]): Evidence[] {
  return items.map((item, index) => ({
    id: `EV-${caseNum}-${String(index + 1).padStart(2, "0")}`,
    ...item,
  }));
}

/* ------------------------------------------------------------------ */
/* Record-backed evidence helpers                                      */
/* ------------------------------------------------------------------ */

function tenderNotice(tenderId: string, signalIds: string[], why: string): Omit<Evidence, "id"> {
  const t = TENDER_BY_ID.get(tenderId)!;
  const window = bidWindowDays(t);
  return {
    group: "PROCUREMENT",
    kind: "Tender notice",
    recordId: t.id,
    title: t.title,
    source: "e-Procurement portal · tender notice",
    date: t.publishedOn,
    fields: [
      { label: "Estimate", value: formatCr(t.estimate) },
      { label: "Bid window", value: `${window} days` },
      { label: "Deadline", value: formatDateTime(t.bidDeadline) },
      { label: "Scope", value: t.scope },
    ],
    relevantValue: `${window}-day bid window`,
    whyItMatters: why,
    signalIds,
    href: `/procurement/${t.id}`,
  };
}

function bidRecords(tenderId: string, signalIds: string[], why: (vendor: string, amount: string) => string) {
  return (BIDS_BY_TENDER.get(tenderId) ?? []).slice(0, 4).map<Omit<Evidence, "id">>((bid) => ({
    group: "BIDS",
    kind: "Bid record",
    recordId: bid.id,
    title: vname(bid.vendorId),
    source: "e-Procurement portal · bid register",
    date: bid.submittedAt.slice(0, 10),
    fields: [
      { label: "Vendor", value: vname(bid.vendorId) },
      { label: "Amount", value: formatINR(bid.amount) },
      { label: "Submitted", value: formatDateTime(bid.submittedAt) },
      { label: "Outcome", value: bid.outcome === "WON" ? "Winner" : bid.outcome === "LOST" ? "Not awarded" : bid.outcome },
    ],
    relevantValue: formatINR(bid.amount),
    whyItMatters: why(vname(bid.vendorId), formatINR(bid.amount)),
    signalIds,
    href: `/procurement/${tenderId}`,
  }));
}

function contractRecord(tenderId: string, signalIds: string[], why: string, neutral = false): Omit<Evidence, "id"> {
  const c = CONTRACT_BY_TENDER.get(tenderId)!;
  return {
    group: "CONTRACT",
    kind: "Signed contract",
    recordId: c.id,
    title: c.title,
    source: "Contract management system",
    date: c.signedOn,
    fields: [
      { label: "Value", value: formatCr(c.value) },
      { label: "Start", value: formatDate(c.startOn) },
      { label: "End", value: formatDate(c.endOn) },
      { label: "Paid to date", value: formatINR(c.paidToDate) },
    ],
    relevantValue: formatCr(c.value),
    whyItMatters: why,
    signalIds,
    neutral,
  };
}

function comparableRecord(tenderId: string, signalIds: string[]): Omit<Evidence, "id"> {
  const t = TENDER_BY_ID.get(tenderId)!;
  const stats = comparableStats(t);
  return {
    group: "COMPARABLE",
    kind: "Comparable procurement set",
    recordId: `CMP-${t.id.slice(-5)}`,
    title: `${stats.count} comparable procurements`,
    source: "Comparable procurement engine",
    date: "2026-09-15",
    fields: [
      { label: "Median", value: formatINR(stats.median) },
      { label: "Lower quartile", value: formatINR(stats.p25) },
      { label: "Upper quartile", value: formatINR(stats.p75) },
      { label: "This procurement", value: formatINR(stats.current) },
    ],
    relevantValue: formatPct(stats.deviationPct, 1, true),
    whyItMatters:
      "The baseline every price measurement on this case is taken against: same category, closest in size, within an 18-month window.",
    signalIds,
    href: `/procurement/${t.id}#comparables`,
  };
}

function relationshipRecord(relId: string, signalIds: string[], why: string): Omit<Evidence, "id"> {
  const r = RELATIONSHIP_BY_ID.get(relId)!;
  return {
    group: "RELATIONSHIP",
    kind: "Relationship record",
    recordId: r.id,
    title: `${vname(r.vendorIds[0])} ↔ ${vname(r.vendorIds[1])}`,
    source: "Relationship resolver",
    date: r.lastObserved,
    fields: [
      { label: "Type", value: r.type.replaceAll("_", " ").toLowerCase() },
      { label: "Strength", value: r.strength.toLowerCase() },
      { label: "Evidence records", value: String(r.evidenceCount) },
      { label: "First observed", value: formatDate(r.firstObserved) },
    ],
    relevantValue: r.via?.label ?? `${r.evidenceCount} records`,
    whyItMatters: why,
    signalIds,
    href: `/relationships?focus=${r.vendorIds[0]}`,
  };
}

function paymentRecords(tenderId: string, signalIds: string[], why: string): Omit<Evidence, "id">[] {
  const contract = CONTRACT_BY_TENDER.get(tenderId)!;
  const payments = PAYMENTS_BY_CONTRACT.get(contract.id) ?? [];
  const flagged = payments.filter((p) => p.flagged);
  const list = flagged.length ? flagged : payments.slice(-2);
  return list.map((p) => ({
    group: "PAYMENT",
    kind: "Payment record",
    recordId: p.id,
    title: `${p.type.replaceAll("_", " ").toLowerCase()} · ${p.invoiceNo}`,
    source: "Treasury payment register",
    date: p.paidOn,
    fields: [
      { label: "Amount", value: formatINR(p.amount) },
      { label: "Invoice date", value: formatDate(p.invoiceOn) },
      { label: "Days to pay", value: String(p.daysToPay) },
      { label: "Milestone certified", value: p.milestoneCertified ? "Yes" : "No" },
    ],
    relevantValue: p.milestoneCertified ? formatINR(p.amount) : "Not certified",
    whyItMatters: why,
    signalIds,
  }));
}

/* ------------------------------------------------------------------ */
/* INV-2026-0042 — the primary demo case                               */
/* ------------------------------------------------------------------ */

const caseTender = TENDER_BY_ID.get(CASE_TENDER)!;
const caseContract = CONTRACT_BY_TENDER.get(CASE_TENDER)!;
const caseAdvance = (PAYMENTS_BY_CONTRACT.get(CASE_CONTRACT) ?? [])[0];

const PRIMARY_FACTORS: PriorityFactor[] = [
  {
    id: "F-PRICE",
    label: "Price deviation",
    points: 24,
    signalIds: ["SIG-2026-0142"],
    rationale: `Winning bid ${formatPct(CASE_STATS.deviationPct, 1, true)} against the comparable median of ${formatCr(CASE_STATS.median)}.`,
  },
  {
    id: "F-AWARDS",
    label: "Repeated awards",
    points: 18,
    signalIds: ["SIG-2026-0144"],
    rationale: "Eight Public Works road awards in fourteen months; no comparable vendor exceeds three.",
  },
  {
    id: "F-BIDDING",
    label: "Bid participation pattern",
    points: 15,
    signalIds: ["SIG-2026-0143", "SIG-2026-0146", "SIG-2026-0138"],
    rationale: `Bids within ${CASE_SPREAD.toFixed(2)}%; the same four vendors in nine packages with winners in a repeating order.`,
  },
  {
    id: "F-RELATIONSHIP",
    label: "Vendor relationship signal",
    points: 12,
    signalIds: ["SIG-2026-0145", "SIG-2026-0139", "SIG-2026-0140"],
    rationale: "Shared registered address between winner and lowest bidder; a shared director between two other bidders.",
  },
  {
    id: "F-TIMING",
    label: "Timing similarity",
    points: 8,
    signalIds: ["SIG-2026-0147"],
    rationale: `A ${bidWindowDays(caseTender)}-day bid window against a ${PWD_MEDIAN_WINDOW}-day median; two bids filed 14 minutes apart.`,
  },
  {
    id: "F-HISTORY",
    label: "Historical context",
    points: 10,
    signalIds: [],
    rationale: "A 2025 price signal on the Zone 5 package in the same program closed as ‘needs more review’ (INV-2025-0187).",
  },
];

const PRIMARY_EVIDENCE = makeEvidence("0042", [
  {
    group: "PROCUREMENT",
    kind: "Tender notice",
    recordId: CASE_TENDER,
    title: "Road Maintenance — Zone 4",
    source: "e-Procurement portal · tender notice",
    date: caseTender.publishedOn,
    fields: [
      { label: "Estimate", value: formatCr(caseTender.estimate) },
      { label: "Bid window", value: `${bidWindowDays(caseTender)} days (01 Aug – 07 Aug 2026)` },
      { label: "Method", value: "Open e-tender · QCBS 70:30" },
      { label: "Scope", value: "38.6 km periodic maintenance, 24 months" },
    ],
    relevantValue: `${bidWindowDays(caseTender)}-day bid window`,
    whyItMatters: `Establishes the departmental estimate and a bid window well below the ${PWD_MEDIAN_WINDOW}-day departmental median.`,
    signalIds: ["SIG-2026-0147", "SIG-2026-0142"],
    href: `/procurement/${CASE_TENDER}`,
  },
  {
    group: "PROCUREMENT",
    kind: "Technical evaluation report",
    recordId: "EVR-2026-0419",
    title: "Technical and combined scoring",
    source: "Tender evaluation committee",
    date: "2026-08-08",
    fields: [
      { label: "Technical scores", value: "Vertex 92 · Apex 84 · Northstar 81 · BlueGrid 79" },
      { label: "Weighting", value: "Technical 70 · Financial 30" },
      { label: "Combined ranking", value: "Vertex first (94.0)" },
      { label: "Committee members", value: "3" },
    ],
    relevantValue: "Winner ranked first on technical score",
    whyItMatters:
      "Explains how the highest financial bid won under quality-cum-cost weighting. It is an alternative explanation the investigator should test, not a finding either way.",
    signalIds: ["SIG-2026-0142"],
    neutral: true,
  },
  {
    group: "PROCUREMENT",
    kind: "Award order",
    recordId: "AWD-2026-0733",
    title: "Award to Vertex Infra Pvt Ltd",
    source: "Public Works Department · award register",
    date: "2026-08-14",
    fields: [
      { label: "Awarded to", value: "Vertex Infra Pvt Ltd" },
      { label: "Value", value: formatCr(caseTender.awardValue ?? 0) },
      { label: "Evaluation to award", value: "6 days" },
      { label: "Bidder declarations", value: "4 independent-bidder declarations filed" },
    ],
    relevantValue: formatCr(caseTender.awardValue ?? 0),
    whyItMatters: "The formal award value measured against comparable procurements.",
    signalIds: ["SIG-2026-0142", "SIG-2026-0144"],
  },
  {
    group: "BIDS",
    kind: "Bid record",
    recordId: "BID-38271",
    title: "Vertex Infra Pvt Ltd",
    source: "e-Procurement portal · bid register",
    date: "2026-08-04",
    fields: [
      { label: "Vendor", value: "Vertex Infra Pvt Ltd" },
      { label: "Amount", value: "₹8.42 Cr" },
      { label: "Submitted", value: "04 Aug 2026, 16:42" },
      { label: "Outcome", value: "Winner" },
    ],
    relevantValue: "₹8.42 Cr",
    whyItMatters: `Winning bid is ${formatPct(CASE_STATS.deviationPct, 1, true)} against the comparable median.`,
    signalIds: ["SIG-2026-0142", "SIG-2026-0143"],
  },
  {
    group: "BIDS",
    kind: "Bid record",
    recordId: "BID-38304",
    title: "Northstar Roads Ltd",
    source: "e-Procurement portal · bid register",
    date: "2026-08-05",
    fields: [
      { label: "Vendor", value: "Northstar Roads Ltd" },
      { label: "Amount", value: "₹8.31 Cr" },
      { label: "Submitted", value: "05 Aug 2026, 11:08" },
      { label: "Outcome", value: "Not awarded — lowest financial bid" },
    ],
    relevantValue: "₹8.31 Cr",
    whyItMatters: "Lowest financial bid, filed by a vendor registered at the same address as the winner.",
    signalIds: ["SIG-2026-0143", "SIG-2026-0145", "SIG-2026-0147"],
  },
  {
    group: "BIDS",
    kind: "Bid record",
    recordId: "BID-38309",
    title: "Apex Civilworks",
    source: "e-Procurement portal · bid register",
    date: "2026-08-05",
    fields: [
      { label: "Vendor", value: "Apex Civilworks" },
      { label: "Amount", value: "₹8.39 Cr" },
      { label: "Submitted", value: "05 Aug 2026, 11:22" },
      { label: "Outcome", value: "Not awarded" },
    ],
    relevantValue: "Submitted 14 minutes after Northstar",
    whyItMatters: "Filed fourteen minutes after another bidder; lists the same contact number as the winner.",
    signalIds: ["SIG-2026-0147", "SIG-2026-0140"],
  },
  {
    group: "BIDS",
    kind: "Bid record",
    recordId: "BID-38352",
    title: "BlueGrid Infrastructure Pvt Ltd",
    source: "e-Procurement portal · bid register",
    date: "2026-08-06",
    fields: [
      { label: "Vendor", value: "BlueGrid Infrastructure Pvt Ltd" },
      { label: "Amount", value: "₹8.36 Cr" },
      { label: "Submitted", value: "06 Aug 2026, 17:55" },
      { label: "Outcome", value: "Not awarded" },
    ],
    relevantValue: `All bids within ${CASE_SPREAD.toFixed(2)}%`,
    whyItMatters: `Completes a field whose bids span ${formatCr(CASE_BID_LOW.amount)} to ${formatCr(CASE_BID_HIGH.amount)} — a ${CASE_SPREAD.toFixed(2)}% spread against a ${CASE_COMPARABLE_SPREAD.toFixed(1)}% comparable median.`,
    signalIds: ["SIG-2026-0143"],
  },
  {
    group: "VENDOR",
    kind: "Registry filing",
    recordId: "VRF-2025-3318",
    title: "Registered address change — Northstar Roads Ltd",
    source: "Vendor registry · address change filing",
    date: "2025-03-18",
    fields: [
      { label: "Previous address", value: "Door 12, Maruthi Complex, Udupi 576101" },
      { label: "New address", value: "Unit 3B, Seabreeze Trade Center, Mangaluru 575003" },
      { label: "Matches", value: "Registered address of Vertex Infra Pvt Ltd" },
      { label: "Facility type", value: "Single commercial unit (not a shared office)" },
    ],
    relevantValue: "Address identical to winning bidder",
    whyItMatters: "First record in which the two vendors share a registered address.",
    signalIds: ["SIG-2026-0145"],
  },
  {
    group: "VENDOR",
    kind: "Director register",
    recordId: "DIR-REG-2231A",
    title: "Common director — Apex Civilworks and BlueGrid Infrastructure",
    source: "Corporate filings · director register",
    date: "2025-01-12",
    fields: [
      { label: "Director", value: "S. Hegde (identification ••••2231)" },
      { label: "Boards", value: "Apex Civilworks · BlueGrid Infrastructure Pvt Ltd" },
      { label: "Status", value: "Active on both boards" },
    ],
    relevantValue: "Common director across two bidders",
    whyItMatters: "Two bidders that filed independent-bidder declarations share a director.",
    signalIds: ["SIG-2026-0139"],
  },
  {
    group: "VENDOR",
    kind: "Bid contact record",
    recordId: "BID-CORR-1841",
    title: "Shared contact number — Vertex Infra and Apex Civilworks",
    source: "Bid documents · contact blocks",
    date: "2025-06-02",
    fields: [
      { label: "Number", value: "+91 824 ••• 4471" },
      { label: "Documents", value: "Zone 3 package (2025) · Zone 4 package (2026)" },
    ],
    relevantValue: "Same number on two bidders' documents",
    whyItMatters: "A weak identifier on its own; relevant in combination with the address and director links.",
    signalIds: ["SIG-2026-0140"],
  },
  {
    group: "CONTRACT",
    kind: "Signed contract",
    recordId: CASE_CONTRACT,
    title: "Road Maintenance — Zone 4",
    source: "Contract management system",
    date: caseContract.signedOn,
    fields: [
      { label: "Value", value: formatCr(caseContract.value) },
      { label: "Term", value: `${formatDate(caseContract.startOn)} – ${formatDate(caseContract.endOn)}` },
      { label: "Signed after award", value: `${daysBetween("2026-08-14", caseContract.signedOn)} days` },
    ],
    relevantValue: formatCr(caseContract.value),
    whyItMatters: "Links the award to the payment trail. No contract-level signal was raised.",
    signalIds: [],
    neutral: true,
  },
  {
    group: "CONTRACT",
    kind: "Award history",
    recordId: "VEN-HIST-1042",
    title: "Public Works road awards, Jul 2025 – Aug 2026",
    source: "Award register · vendor history",
    date: "2026-09-15",
    fields: [
      { label: "Awards", value: "8" },
      { label: "Value", value: "₹23.68 Cr" },
      { label: "Includes", value: "Zone 5 (Oct 2025), Zone 4 (Aug 2026) and six smaller works" },
      { label: "Peer maximum", value: "3 awards" },
    ],
    relevantValue: "8 awards in 14 months",
    whyItMatters: "Establishes the run of awards behind the repeated-award signal.",
    signalIds: ["SIG-2026-0144"],
    href: `/vendors/${V.vertex}`,
  },
  {
    group: "PAYMENT",
    kind: "Payment record",
    recordId: caseAdvance?.id ?? "PAY-2026-11873",
    title: "Mobilization advance",
    source: "Treasury payment register",
    date: caseAdvance?.paidOn ?? "2026-09-09",
    fields: [
      { label: "Amount", value: formatINR(caseAdvance?.amount ?? 8_420_000) },
      { label: "Share of contract", value: "10%" },
      { label: "Security", value: "Bank guarantee received 05 Sep 2026" },
      { label: "Days to pay", value: String(caseAdvance?.daysToPay ?? 9) },
    ],
    relevantValue: "Within contract terms",
    whyItMatters:
      "No payment signal: the advance matches the contract's 10% mobilization clause and was released against a bank guarantee.",
    signalIds: [],
    neutral: true,
  },
  {
    group: "RELATIONSHIP",
    kind: "Relationship record",
    recordId: "REL-0001",
    title: "Vertex Infra ↔ Northstar Roads — shared address",
    source: "Relationship resolver",
    date: "2026-08-05",
    fields: [
      { label: "Address match", value: "100%" },
      { label: "Evidence records", value: "4" },
      { label: "First observed", value: "18 Mar 2025" },
      { label: "Last observed", value: "05 Aug 2026" },
    ],
    relevantValue: "High strength",
    whyItMatters: "Consolidates the four records behind the shared-address signal.",
    signalIds: ["SIG-2026-0145"],
    href: `/relationships?focus=${V.vertex}`,
  },
  {
    group: "RELATIONSHIP",
    kind: "Participation matrix",
    recordId: "PART-MATRIX-04182",
    title: "Coastal maintenance program — bidder fields and winners",
    source: "Bid register · program view",
    date: "2026-09-15",
    fields: [
      { label: "Packages", value: String(CLUSTER_TENDER_SET.length) },
      { label: "Winner order", value: "Northstar → Apex → BlueGrid → Vertex, repeating" },
      { label: "Follows order", value: "8 of 9" },
      { label: "Exception", value: "Aug 2025 — Karavali Civil Constructions won" },
    ],
    relevantValue: "Same four vendors in 9 packages",
    whyItMatters: "Shows the participation and winner sequence across the whole program rather than one tender.",
    signalIds: ["SIG-2026-0138", "SIG-2026-0146"],
  },
  {
    group: "COMPARABLE",
    kind: "Comparable procurement set",
    recordId: "CMP-04182",
    title: `${CASE_STATS.count} comparable maintenance packages`,
    source: "Comparable procurement engine",
    date: "2026-09-15",
    fields: [
      { label: "Median", value: formatCr(CASE_STATS.median) },
      { label: "Lower quartile", value: formatCr(CASE_STATS.p25) },
      { label: "Upper quartile", value: formatCr(CASE_STATS.p75) },
      { label: "Matched on", value: "Road infrastructure · ₹5–9 Cr · Jan 2025 – Aug 2026 · Public Works" },
    ],
    relevantValue: formatPct(CASE_STATS.deviationPct, 1, true),
    whyItMatters: "The baseline the price and bid-spread signals are both measured against.",
    signalIds: ["SIG-2026-0142", "SIG-2026-0143"],
    href: `/procurement/${CASE_TENDER}#comparables`,
  },
  {
    group: "COMPARABLE",
    kind: "Tender outcome",
    recordId: "TND-2025-02207",
    title: "Zone 4 package, 2025 cycle",
    source: "Award register",
    date: "2025-08-12",
    fields: [
      { label: "Winner", value: "Karavali Civil Constructions" },
      { label: "Award", value: "₹5.97 Cr" },
      { label: "Group bids", value: "₹6.49 – 6.55 Cr" },
      { label: "Group bids above winner", value: "+8.7% to +9.7%" },
    ],
    relevantValue: "The only package won outside the group",
    whyItMatters:
      "When a fifth bidder entered the same package a year earlier, the award came in well below the group's bids.",
    signalIds: ["SIG-2026-0143", "SIG-2026-0146"],
    href: "/procurement/TND-2025-02207",
  },
  {
    group: "COMPARABLE",
    kind: "Market context",
    recordId: "MCI-2026-08",
    title: "Construction material price index",
    source: "State construction material price index",
    date: "2026-08-31",
    fields: [
      { label: "Bitumen VG-30", value: "+22% since Mar 2025" },
      { label: "Aggregates", value: "+11% since Mar 2025" },
      { label: "Weighted index", value: "+18.0%" },
      { label: "Coastal schedule-of-rates factor", value: "+5.0%" },
    ],
    relevantValue: "+18.0% material cost movement",
    whyItMatters: "Context used to test whether the price deviation is explained by market movement.",
    signalIds: ["SIG-2026-0142"],
    neutral: true,
  },
]);

const PRIMARY_CONTEXT: ContextCheck[] = [
  {
    id: "CTX-0042-PRICE",
    factorId: "F-PRICE",
    title: "Price signal",
    observed: `${formatPct(CASE_STATS.deviationPct, 1, true)} above comparable median`,
    observedValue: Number(CASE_STATS.deviationPct.toFixed(1)),
    adjustments: [
      {
        label: "Material cost movement",
        value: "+18.0%",
        effect: -18,
        source: "State construction material price index (bitumen VG-30, aggregates), Mar 2025 → Aug 2026",
      },
      {
        label: "Regional adjustment",
        value: "+5.0%",
        effect: -5,
        source: "Schedule of Rates 2026 — coastal region factor",
      },
    ],
    adjustedValue: Number((CASE_STATS.deviationPct - 23).toFixed(1)),
    adjustedLabel: `${formatPct(CASE_STATS.deviationPct - 23, 1, true)} after context`,
    adjustedPoints: 1,
    reason: "Regional pricing adjustment and material cost movement explain most of the price deviation.",
    verdict: "Lowered priority after context",
    recommended: true,
  },
  {
    id: "CTX-0042-AWARDS",
    factorId: "F-AWARDS",
    title: "Repeated-award signal",
    observed: "8 awards against a peer maximum of 3",
    observedValue: 8,
    adjustments: [
      {
        label: "Qualified Class I contractors in the division",
        value: "6 vendors",
        effect: -6,
        source: "Coastal division contractor registration list, 2026",
      },
    ],
    adjustedValue: 8,
    adjustedLabel: "Partly explained by a thin qualified pool",
    adjustedPoints: 12,
    reason:
      "A small pool of qualified contractors explains some concentration, but not a run of eight awards to one of six vendors.",
    verdict: "Partially explained",
    recommended: false,
  },
  {
    id: "CTX-0042-TIMING",
    factorId: "F-TIMING",
    title: "Timing signal",
    observed: `${bidWindowDays(caseTender)}-day window against a ${PWD_MEDIAN_WINDOW}-day median`,
    observedValue: bidWindowDays(caseTender),
    adjustments: [
      {
        label: "Post-monsoon repair order",
        value: "7-day window permitted",
        effect: -5,
        source: "Public Works circular on post-monsoon emergency maintenance, 22 Jul 2026",
      },
    ],
    adjustedValue: bidWindowDays(caseTender),
    adjustedLabel: "Short window explained; submission gap is not",
    adjustedPoints: 3,
    reason:
      "The emergency circular explains the shortened window. It does not explain two bids filed fourteen minutes apart.",
    verdict: "Partially explained",
    recommended: false,
  },
];

const PRIMARY_QUESTIONS: InvestigationQuestion[] = [
  {
    id: "Q-0042-1",
    text: "Are the participating vendors independently controlled?",
    rationale: "A shared registered address and a shared director connect three of the four bidders.",
    evidenceIds: ["REL-0001", "DIR-REG-2231A"],
  },
  {
    id: "Q-0042-2",
    text: "Is the shared address operational or administrative?",
    rationale: "The unit is a single commercial premises, not a shared-office facility.",
    evidenceIds: ["VRF-2025-3318"],
  },
  {
    id: "Q-0042-3",
    text: "Are the contract specifications comparable to the comparable set?",
    rationale: "The package is 38.6 km against a 33 km median scope; scope differences affect price.",
    evidenceIds: ["CMP-04182", CASE_TENDER],
  },
  {
    id: "Q-0042-4",
    text: "Does specialization explain the award concentration?",
    rationale: "Six Class I contractors are registered in the division; the winner holds eight awards in fourteen months.",
    evidenceIds: ["VEN-HIST-1042"],
  },
  {
    id: "Q-0042-5",
    text: "Have the same vendors alternated winning across the program?",
    rationale: "Winners follow a repeating order in eight of nine packages.",
    evidenceIds: ["PART-MATRIX-04182"],
  },
  {
    id: "Q-0042-6",
    text: "Why were losing bids priced within 1.32% of the winner when the 2025 Zone 4 bids were 9% above an outside winner?",
    rationale: "The one package with an outside bidder shows a very different price structure.",
    evidenceIds: ["TND-2025-02207", "BID-38304"],
  },
  {
    id: "Q-0042-7",
    text: "Was the six-day bid window approved under the post-monsoon circular?",
    rationale: "The circular permits seven days; the file noting should show the approval.",
    evidenceIds: [CASE_TENDER],
  },
  {
    id: "Q-0042-8",
    text: "Should the open Zone 3 package (closing 23 Sep 2026) be monitored while this review runs?",
    rationale: "The next package in the same program is open for bids now.",
    evidenceIds: ["TND-2026-04631"],
  },
];

const PRIMARY: InvestigationCase = {
  id: PRIMARY_CASE,
  title: "Road Maintenance — Zone 4",
  tenderId: CASE_TENDER,
  vendorId: V.vertex,
  relatedVendorIds: [V.northstar, V.apex, V.bluegrid],
  departmentId: "pwd",
  categoryId: "road",
  regionId: "coastal",
  value: caseTender.awardValue ?? 0,
  primarySignal: "Price + Relationship",
  summary:
    "Signals across price, awards, bidding and vendor relationships converge on the Zone 4 maintenance package. The winning price is 25.5% above the comparable median, the winner holds eight similar awards in fourteen months, all four bids sit within 1.32%, and the winner shares a registered address with the lowest bidder. Market context is available for the price signal; the relationship and participation signals are not affected by it.",
  openedOn: "2026-09-15T09:44",
  initialStatus: "NEW",
  initialAssigneeId: "U-01",
  primarySignalIds: ["SIG-2026-0142", "SIG-2026-0143", "SIG-2026-0144", "SIG-2026-0145"],
  signalIds: [
    "SIG-2026-0142",
    "SIG-2026-0143",
    "SIG-2026-0144",
    "SIG-2026-0145",
    "SIG-2026-0146",
    "SIG-2026-0147",
    "SIG-2026-0138",
    "SIG-2026-0139",
    "SIG-2026-0140",
  ],
  factors: PRIMARY_FACTORS,
  evidence: PRIMARY_EVIDENCE,
  contextChecks: PRIMARY_CONTEXT,
  questions: PRIMARY_QUESTIONS,
  timelineNotes: {
    [CASE_TENDER]: { annotation: `Bid window of ${bidWindowDays(caseTender)} days against a ${PWD_MEDIAN_WINDOW}-day median`, signalIds: ["SIG-2026-0147"] },
    "BID-38271": { annotation: "Winning bid — 25.5% above comparable median", signalIds: ["SIG-2026-0142"] },
    "BID-38304": { annotation: "Lowest bid; same registered address as the winner", signalIds: ["SIG-2026-0145"] },
    "BID-38309": { annotation: "Filed 14 minutes after the previous bid", signalIds: ["SIG-2026-0147"] },
    "BID-38352": { annotation: `Completes a field within ${CASE_SPREAD.toFixed(2)}%`, signalIds: ["SIG-2026-0143"] },
    "EVR-2026-0419": { annotation: "Highest financial bid ranked first on technical score", signalIds: [] },
    "AWD-2026-0733": { annotation: "Eighth Public Works road award to the vendor in 14 months", signalIds: ["SIG-2026-0144"] },
  },
};

/* ------------------------------------------------------------------ */
/* Other active cases                                                  */
/* ------------------------------------------------------------------ */

function priceContext(
  caseNum: string,
  tenderId: string,
  factorId: string,
  label: string,
  value: string,
  effect: number,
  source: string,
  adjustedPoints: number,
  reason: string,
): ContextCheck {
  const stats = comparableStats(TENDER_BY_ID.get(tenderId)!);
  return {
    id: `CTX-${caseNum}-PRICE`,
    factorId,
    title: "Price signal",
    observed: `${formatPct(stats.deviationPct, 1, true)} above comparable median`,
    observedValue: Number(stats.deviationPct.toFixed(1)),
    adjustments: [{ label, value, effect, source }],
    adjustedValue: Number((stats.deviationPct + effect).toFixed(1)),
    adjustedLabel: `${formatPct(stats.deviationPct + effect, 1, true)} after context`,
    adjustedPoints,
    reason,
    verdict: "Lowered priority after context",
    recommended: true,
  };
}

const MERIDIAN_TENDER = "TND-2026-03914";
const QUILLON_TENDER = "TND-2026-02650";
const STRATUM_TENDER = "TND-2026-01633";
const DEPOT_TENDER = "TND-2026-02480";
const HARROW_TENDER = "TND-2026-03702";
const KESTREL_TENDER = "TND-2026-00988";
const TUNGA_TENDER = "TND-2026-04020";
const CORVID_TENDER = "TND-2025-03302";
const HEARTH_TENDER = "TND-2026-03110";
const APEX_TENDER = "TND-2026-02155";

const ACTIVE: InvestigationCase[] = [
  PRIMARY,
  {
    id: "INV-2026-0039",
    title: "Oxygen Concentrators & Consumables",
    tenderId: MERIDIAN_TENDER,
    vendorId: V.meridian,
    relatedVendorIds: [V.carewell, V.lifeline, V.aurora],
    departmentId: "hfw",
    categoryId: "medeq",
    regionId: "bengaluru",
    value: TENDER_BY_ID.get(MERIDIAN_TENDER)!.awardValue ?? 0,
    primarySignal: "Price + Award concentration",
    summary:
      "An equipment award priced above comparable procurements, placed with a supplier that holds most of the category by value. A national supply advisory is available as market context for the price signal.",
    openedOn: "2026-08-12T11:20",
    initialStatus: "UNDER_REVIEW",
    initialAssigneeId: "U-02",
    primarySignalIds: ["SIG-2026-0131", "SIG-2026-0132"],
    signalIds: ["SIG-2026-0131", "SIG-2026-0132", "SIG-2026-0133"],
    factors: [
      { id: "F-PRICE", label: "Price deviation", points: 34, signalIds: ["SIG-2026-0131"], rationale: "Award above the comparable median for equipment of similar size." },
      { id: "F-CONCENTRATION", label: "Award concentration", points: 28, signalIds: ["SIG-2026-0132"], rationale: "Supplier holds most medical equipment contracts by value." },
      { id: "F-RELATIONSHIP", label: "Vendor relationship signal", points: 16, signalIds: ["SIG-2026-0133"], rationale: "Shared contact number with another supplier in the category." },
    ],
    evidence: makeEvidence("0039", [
      tenderNotice(MERIDIAN_TENDER, ["SIG-2026-0131"], "Sets the estimate and specification the award is measured against."),
      ...bidRecords(MERIDIAN_TENDER, ["SIG-2026-0131"], (v, a) => `${v} bid ${a}; the award is compared with the comparable set.`),
      contractRecord(MERIDIAN_TENDER, ["SIG-2026-0132"], "Bundles three years of maintenance with the equipment price."),
      comparableRecord(MERIDIAN_TENDER, ["SIG-2026-0131"]),
      relationshipRecord("REL-0008", ["SIG-2026-0133"], "A shared contact number with another supplier in the same category."),
    ]),
    contextChecks: [
      priceContext(
        "0039",
        MERIDIAN_TENDER,
        "F-PRICE",
        "National supply advisory",
        "Scarcity premium +20%",
        -20,
        "Supply advisory on oxygen concentrators, June 2026",
        14,
        "Constrained supply after the June 2026 advisory explains most of the price difference.",
      ),
    ],
    questions: [
      { id: "Q-0039-1", text: "Does the price include three years of maintenance that comparable awards did not?", rationale: "Bundled service changes the headline value.", evidenceIds: [MERIDIAN_TENDER] },
      { id: "Q-0039-2", text: "Is the supplier the authorized distributor for this product line?", rationale: "Authorisation limits the bidder pool legitimately.", evidenceIds: [MERIDIAN_TENDER] },
      { id: "Q-0039-3", text: "Did other buyers pay a similar premium after the June 2026 advisory?", rationale: "Market-wide price movement would explain the deviation.", evidenceIds: [`CMP-${MERIDIAN_TENDER.slice(-5)}`] },
      { id: "Q-0039-4", text: "Who uses the shared contact number, and for which supplier?", rationale: "The link is weak on its own.", evidenceIds: ["REL-0008"] },
    ],
  },
  {
    id: "INV-2026-0044",
    title: "Learning Kits — Direct Purchases",
    tenderId: SPLIT_TENDER_IDS[0],
    vendorId: V.lumen,
    relatedVendorIds: [V.brightdesk],
    departmentId: "edu",
    categoryId: "edumat",
    regionId: "bengaluru",
    value: SPLIT_TENDER_IDS.reduce((s, id) => s + (TENDER_BY_ID.get(id)!.awardValue ?? 0), 0),
    primarySignal: "Contract splitting + Relationship",
    summary:
      "Five direct purchases to one supplier in nineteen days, each just under the open-tender threshold, justified by comparative quotations sent from the winning supplier's own email address.",
    openedOn: "2026-07-28T15:05",
    initialStatus: "NEW",
    primarySignalIds: ["SIG-2026-0151"],
    signalIds: ["SIG-2026-0151", "SIG-2026-0152"],
    factors: [
      { id: "F-SPLITTING", label: "Contract splitting pattern", points: 44, signalIds: ["SIG-2026-0151"], rationale: "Five purchases below the threshold in nineteen days." },
      { id: "F-RELATIONSHIP", label: "Vendor relationship signal", points: 28, signalIds: ["SIG-2026-0152"], rationale: "Comparative quotations sent from the same email address." },
    ],
    evidence: makeEvidence(
      "0044",
      SPLIT_TENDER_IDS.map<Omit<Evidence, "id">>((id) => {
        const t = TENDER_BY_ID.get(id)!;
        return {
          group: "PROCUREMENT",
          kind: "Purchase order",
          recordId: id,
          title: t.title,
          source: "Direct purchase register",
          date: t.awardedOn!,
          fields: [
            { label: "Value", value: formatINR(t.awardValue ?? 0) },
            { label: "Threshold", value: "₹25.00 L" },
            { label: "Supplier", value: vname(V.lumen) },
          ],
          relevantValue: formatINR(t.awardValue ?? 0),
          whyItMatters: "One of five purchases that together exceed the open-tender threshold.",
          signalIds: ["SIG-2026-0151"],
          href: `/procurement/${id}`,
        };
      }).concat([
        relationshipRecord("REL-0007", ["SIG-2026-0152"], "Comparative quotations came from the winning supplier's email address."),
      ]),
    ),
    contextChecks: [
      {
        id: "CTX-0044-INDENTS",
        factorId: "F-SPLITTING",
        title: "Splitting signal",
        observed: "5 purchases in 19 days",
        observedValue: 5,
        adjustments: [
          { label: "Separate cluster indents on file", value: "2 of 5 purchases", effect: -2, source: "Block education office indent register" },
        ],
        adjustedValue: 3,
        adjustedLabel: "3 purchases remain unexplained",
        adjustedPoints: 30,
        reason: "Two purchases trace to separate cluster indents; three do not.",
        verdict: "Partially explained",
        recommended: true,
      },
    ],
    questions: [
      { id: "Q-0044-1", text: "Were separate indents raised for each purchase?", rationale: "Independent indents would explain the split.", evidenceIds: SPLIT_TENDER_IDS },
      { id: "Q-0044-2", text: "Why were comparative quotations sent from the winning supplier's email address?", rationale: "Quotations must be independent.", evidenceIds: ["REL-0007"] },
      { id: "Q-0044-3", text: "Was a consolidated tender considered and rejected?", rationale: "The file should record the decision.", evidenceIds: SPLIT_TENDER_IDS.slice(0, 1) },
    ],
  },
  {
    id: "INV-2026-0037",
    title: "Hospital Management System AMC",
    tenderId: QUILLON_TENDER,
    vendorId: V.quillon,
    relatedVendorIds: [V.datastream],
    departmentId: "hfw",
    categoryId: "it",
    regionId: "bengaluru",
    value: TENDER_BY_ID.get(QUILLON_TENDER)!.awardValue ?? 0,
    primarySignal: "Timing + Single bid",
    summary:
      "A limited tender open for seven days drew one bid from the incumbent vendor. Continuity of a live clinical system is the stated reason and is available as context.",
    openedOn: "2026-06-30T10:10",
    initialStatus: "EVIDENCE_GATHERING",
    initialAssigneeId: "U-03",
    primarySignalIds: ["SIG-2026-0121", "SIG-2026-0122"],
    signalIds: ["SIG-2026-0121", "SIG-2026-0122", "SIG-2026-0123"],
    factors: [
      { id: "F-TIMING", label: "Timing pattern", points: 24, signalIds: ["SIG-2026-0121"], rationale: "Seven-day window against a 21-day norm." },
      { id: "F-SINGLE", label: "Single-bid award", points: 25, signalIds: ["SIG-2026-0122"], rationale: "One bid received, priced just above the estimate." },
      { id: "F-AWARDS", label: "Repeated awards", points: 20, signalIds: ["SIG-2026-0123"], rationale: "Same vendor holds consecutive IT awards." },
    ],
    evidence: makeEvidence("0037", [
      tenderNotice(QUILLON_TENDER, ["SIG-2026-0121"], "Records the seven-day window and limited-tender route."),
      ...bidRecords(QUILLON_TENDER, ["SIG-2026-0122"], (v, a) => `The only bid received: ${v} at ${a}.`),
      contractRecord(QUILLON_TENDER, ["SIG-2026-0123"], "Extends the incumbent's hold on the platform for another year."),
      comparableRecord(QUILLON_TENDER, []),
    ]),
    contextChecks: [
      {
        id: "CTX-0037-CONTINUITY",
        factorId: "F-TIMING",
        title: "Timing signal",
        observed: "7-day window",
        observedValue: 7,
        adjustments: [
          { label: "Clinical continuity requirement", value: "Contract expiring 30 Jun 2026", effect: -16, source: "Health department approval note, 02 Jun 2026" },
        ],
        adjustedValue: 7,
        adjustedLabel: "Short window explained by continuity",
        adjustedPoints: 8,
        reason: "An expiring contract on a live hospital system justifies an accelerated window.",
        verdict: "Lowered priority after context",
        recommended: true,
      },
    ],
    questions: [
      { id: "Q-0037-1", text: "Do escrow terms allow another vendor to take over the platform?", rationale: "Lock-in explains single bids.", evidenceIds: [QUILLON_TENDER] },
      { id: "Q-0037-2", text: "Was the expiry of the previous contract foreseeable in time for an open tender?", rationale: "A planned re-tender would avoid the short window.", evidenceIds: [QUILLON_TENDER] },
      { id: "Q-0037-3", text: "Is the price consistent with the previous year's maintenance contract?", rationale: "A year-on-year comparison is more precise than category comparables.", evidenceIds: [`CMP-${QUILLON_TENDER.slice(-5)}`] },
    ],
  },
  {
    id: "INV-2026-0041",
    title: "Rural Road Culverts — Payments",
    tenderId: STRATUM_TENDER,
    vendorId: V.stratum,
    relatedVendorIds: [V.terracebeam],
    departmentId: "rdp",
    categoryId: "road",
    regionId: "kalyana",
    value: TENDER_BY_ID.get(STRATUM_TENDER)!.awardValue ?? 0,
    primarySignal: "Payment pattern + Ownership",
    summary:
      "Running bills released without recorded measurement certification, on a contract won by a vendor that shares a shareholder with a competing bidder.",
    openedOn: "2026-08-22T14:32",
    initialStatus: "NEW",
    initialAssigneeId: "U-03",
    primarySignalIds: ["SIG-2026-0157"],
    signalIds: ["SIG-2026-0157", "SIG-2026-0158"],
    factors: [
      { id: "F-PAYMENT", label: "Payment pattern", points: 42, signalIds: ["SIG-2026-0157"], rationale: "Three of five claims paid without certification." },
      { id: "F-RELATIONSHIP", label: "Vendor relationship signal", points: 24, signalIds: ["SIG-2026-0158"], rationale: "Common shareholder with a competing bidder." },
    ],
    evidence: makeEvidence("0041", [
      tenderNotice(STRATUM_TENDER, [], "Sets the scope the milestones are defined against."),
      contractRecord(STRATUM_TENDER, ["SIG-2026-0157"], "The contract value the payment share is measured against."),
      ...paymentRecords(STRATUM_TENDER, ["SIG-2026-0157"], "Released without a recorded milestone certification."),
      relationshipRecord("REL-0006", ["SIG-2026-0158"], "Shareholding links the winner to a competing bidder."),
    ]),
    contextChecks: [
      {
        id: "CTX-0041-RECORDS",
        factorId: "F-PAYMENT",
        title: "Payment signal",
        observed: "3 of 5 claims uncertified",
        observedValue: 3,
        adjustments: [
          { label: "Measurement books filed late", value: "Unverified", effect: 0, source: "Division office — not yet received" },
        ],
        adjustedValue: 3,
        adjustedLabel: "No context verified yet",
        adjustedPoints: 42,
        reason: "Late filing of measurement books would explain the pattern, but the books have not been received.",
        verdict: "Context not yet verified",
        recommended: false,
      },
    ],
    questions: [
      { id: "Q-0041-1", text: "Do measurement books exist for the three uncertified claims?", rationale: "Books filed late would explain the pattern.", evidenceIds: [] },
      { id: "Q-0041-2", text: "Was the shareholding disclosed in the bidder declaration?", rationale: "Disclosure changes how the relationship should be read.", evidenceIds: ["REL-0006"] },
      { id: "Q-0041-3", text: "Has physical progress been inspected against the amounts paid?", rationale: "Site progress is the direct test.", evidenceIds: [] },
    ],
  },
  {
    id: "INV-2026-0035",
    title: "Bus Depot Resurfacing — Mangaluru",
    tenderId: DEPOT_TENDER,
    vendorId: V.northstar,
    relatedVendorIds: [V.vertex, V.apex],
    departmentId: "trn",
    categoryId: "road",
    regionId: "coastal",
    value: TENDER_BY_ID.get(DEPOT_TENDER)!.awardValue ?? 0,
    primarySignal: "Close bids + Relationship",
    summary:
      "Three bids within one percent from vendors that also appear in the coastal maintenance program, including the shared-address pair.",
    openedOn: "2026-06-02T09:15",
    initialStatus: "CONTEXT_CHECK",
    initialAssigneeId: "U-02",
    primarySignalIds: ["SIG-2026-0118"],
    signalIds: ["SIG-2026-0118", "SIG-2026-0119"],
    factors: [
      { id: "F-BIDDING", label: "Bid participation pattern", points: 34, signalIds: ["SIG-2026-0118"], rationale: `Bid spread of ${(bidSpread(DEPOT_TENDER) ?? 0).toFixed(2)}%.` },
      { id: "F-PRICE", label: "Price deviation", points: 18, signalIds: ["SIG-2026-0119"], rationale: "Award above the comparable median." },
      { id: "F-RELATIONSHIP", label: "Linked relationship signal", points: 12, signalIds: [], rationale: "Two bidders share a registered address (see INV-2026-0042)." },
    ],
    evidence: makeEvidence("0035", [
      tenderNotice(DEPOT_TENDER, [], "Sets the specification for the depot yard."),
      ...bidRecords(DEPOT_TENDER, ["SIG-2026-0118"], (v, a) => `${v} bid ${a}; all three bids sit within one percent.`),
      comparableRecord(DEPOT_TENDER, ["SIG-2026-0119"]),
      relationshipRecord("REL-0001", [], "Two of the three bidders share a registered address."),
    ]),
    contextChecks: [
      priceContext(
        "0035",
        DEPOT_TENDER,
        "F-PRICE",
        "Heavier pavement specification",
        "Depot axle loads",
        -12,
        "Transport department pavement design note",
        6,
        "Depot yards need a heavier pavement than the road packages in the comparable set.",
      ),
    ],
    questions: [
      { id: "Q-0035-1", text: "Should this tender be reviewed together with INV-2026-0042?", rationale: "The same bidder group appears in both.", evidenceIds: ["REL-0001"] },
      { id: "Q-0035-2", text: "Does the pavement specification explain the price?", rationale: "Depot loads are heavier than road loads.", evidenceIds: [DEPOT_TENDER] },
    ],
  },
  {
    id: "INV-2026-0045",
    title: "Drip Irrigation Kits — Raichur",
    tenderId: HARROW_TENDER,
    vendorId: V.harrow,
    relatedVendorIds: [V.kisandrip, V.greenfurrow],
    departmentId: "agr",
    categoryId: "agri",
    regionId: "kalyana",
    value: TENDER_BY_ID.get(HARROW_TENDER)!.awardValue ?? 0,
    primarySignal: "Price + Contract splitting",
    summary:
      "A subsidy-scheme supply order priced above comparable orders, from a supplier that also received three consecutive direct purchases just under the threshold.",
    openedOn: "2026-08-04T16:40",
    initialStatus: "NEW",
    primarySignalIds: ["SIG-2026-0161"],
    signalIds: ["SIG-2026-0161", "SIG-2026-0171"],
    factors: [
      { id: "F-PRICE", label: "Price deviation", points: 36, signalIds: ["SIG-2026-0161"], rationale: "Order priced above comparable supply orders." },
      { id: "F-SPLITTING", label: "Contract splitting pattern", points: 25, signalIds: ["SIG-2026-0171"], rationale: "Three direct purchases below the threshold in 26 days." },
    ],
    evidence: makeEvidence("0045", [
      tenderNotice(HARROW_TENDER, ["SIG-2026-0161"], "Defines the kit specification the price covers."),
      ...bidRecords(HARROW_TENDER, ["SIG-2026-0161"], (v, a) => `${v} bid ${a}.`),
      comparableRecord(HARROW_TENDER, ["SIG-2026-0161"]),
      ...HARROW_SPLIT_IDS.map<Omit<Evidence, "id">>((id) => {
        const t = TENDER_BY_ID.get(id)!;
        return {
          group: "PROCUREMENT",
          kind: "Purchase order",
          recordId: id,
          title: t.title,
          source: "Direct purchase register",
          date: t.awardedOn!,
          fields: [
            { label: "Value", value: formatINR(t.awardValue ?? 0) },
            { label: "Threshold", value: "₹25.00 L" },
          ],
          relevantValue: formatINR(t.awardValue ?? 0),
          whyItMatters: "Part of a run of purchases just under the threshold.",
          signalIds: ["SIG-2026-0171"],
          href: `/procurement/${id}`,
        };
      }),
      relationshipRecord("REL-0011", [], "A former shared director with a competing bidder — resigned before the tenders in scope."),
    ]),
    contextChecks: [
      priceContext(
        "0045",
        HARROW_TENDER,
        "F-PRICE",
        "Larger-plot kit specification",
        "More emitters per kit",
        -14,
        "Scheme guideline — kit sizes by plot area",
        20,
        "The specification covers larger plots than most comparable orders.",
      ),
    ],
    questions: [
      { id: "Q-0045-1", text: "How many emitters does each kit include compared with the comparable orders?", rationale: "Kit size drives price.", evidenceIds: [HARROW_TENDER] },
      { id: "Q-0045-2", text: "Were the three soil-testing purchases raised by separate blocks?", rationale: "Separate indents would explain the split.", evidenceIds: HARROW_SPLIT_IDS },
    ],
  },
  {
    id: "INV-2026-0032",
    title: "Diagnostic Reagents Rate Contract",
    tenderId: KESTREL_TENDER,
    vendorId: V.kestrel,
    relatedVendorIds: [V.meridian, V.sunrise, V.carewell, V.aurora],
    departmentId: "hfw",
    categoryId: "medsup",
    regionId: "bengaluru",
    value: TENDER_BY_ID.get(KESTREL_TENDER)!.awardValue ?? 0,
    primarySignal: "Vendor concentration",
    summary:
      "One supplier holds the majority of medical supplies by value. Concentration can be legitimate in specialized markets, so this case tests it against qualification and price evidence.",
    openedOn: "2026-03-04T12:00",
    initialStatus: "NEEDS_MORE_EVIDENCE",
    initialAssigneeId: "U-05",
    primarySignalIds: ["SIG-2026-0109"],
    signalIds: ["SIG-2026-0109", "SIG-2026-0110"],
    factors: [
      { id: "F-CONCENTRATION", label: "Vendor concentration", points: 36, signalIds: ["SIG-2026-0109"], rationale: "Majority share of category value." },
      { id: "F-PRICE", label: "Price deviation", points: 22, signalIds: ["SIG-2026-0110"], rationale: "Rate contract above comparable median." },
    ],
    evidence: makeEvidence("0032", [
      tenderNotice(KESTREL_TENDER, [], "Defines the reagent basket and qualification criteria."),
      ...bidRecords(KESTREL_TENDER, ["SIG-2026-0110"], (v, a) => `${v} bid ${a}.`),
      comparableRecord(KESTREL_TENDER, ["SIG-2026-0110"]),
      relationshipRecord("REL-0004", [], "A shared address with another supplier — explained by a shared-office facility."),
    ]),
    contextChecks: [
      {
        id: "CTX-0032-MARKET",
        factorId: "F-CONCENTRATION",
        title: "Concentration signal",
        observed: "Majority of category value",
        observedValue: 58,
        adjustments: [
          { label: "Suppliers with cold-chain license", value: "4 in the state", effect: -20, source: "Drug control licensing register" },
        ],
        adjustedValue: 58,
        adjustedLabel: "Explained by a licensed-supplier market",
        adjustedPoints: 16,
        reason: "Only four suppliers hold the cold-chain license these reagents require.",
        verdict: "Lowered priority after context",
        recommended: true,
      },
    ],
    questions: [
      { id: "Q-0032-1", text: "How many suppliers cleared technical qualification in the last three tenders?", rationale: "Qualification limits competition legitimately.", evidenceIds: [KESTREL_TENDER] },
      { id: "Q-0032-2", text: "Does the reagent basket differ from comparable rate contracts?", rationale: "Basket composition drives headline value.", evidenceIds: [`CMP-${KESTREL_TENDER.slice(-5)}`] },
    ],
  },
  {
    id: "INV-2026-0046",
    title: "Water Supply Pipeline — Shivamogga",
    tenderId: TUNGA_TENDER,
    vendorId: V.tunga,
    relatedVendorIds: [V.riverbend, V.monsoonline],
    departmentId: "wrd",
    categoryId: "water",
    regionId: "malnad",
    value: TENDER_BY_ID.get(TUNGA_TENDER)!.awardValue ?? 0,
    primarySignal: "Timing + Ownership",
    summary:
      "An award issued the day after evaluation, in a tender where two of three bidders are linked through a common holding entity.",
    openedOn: "2026-08-08T10:25",
    initialStatus: "NEW",
    primarySignalIds: ["SIG-2026-0163"],
    signalIds: ["SIG-2026-0163"],
    factors: [
      { id: "F-TIMING", label: "Timing pattern", points: 31, signalIds: ["SIG-2026-0163"], rationale: "Two days from deadline to award against a 24-day median." },
      { id: "F-RELATIONSHIP", label: "Vendor relationship", points: 24, signalIds: [], rationale: "Two bidders share a holding entity (REL-0012)." },
    ],
    evidence: makeEvidence("0046", [
      tenderNotice(TUNGA_TENDER, ["SIG-2026-0163"], "Records the deadline the award interval is measured from."),
      ...bidRecords(TUNGA_TENDER, [], (v, a) => `${v} bid ${a}.`),
      contractRecord(TUNGA_TENDER, ["SIG-2026-0163"], "Signed shortly after an unusually fast award."),
      relationshipRecord("REL-0012", [], "Two of three bidders share a holding entity."),
    ]),
    contextChecks: [
      {
        id: "CTX-0046-MONSOON",
        factorId: "F-TIMING",
        title: "Timing signal",
        observed: "2 days from deadline to award",
        observedValue: 2,
        adjustments: [
          { label: "Pre-monsoon completion target", value: "Works to start before 1 Aug", effect: -18, source: "District water supply action plan 2026" },
        ],
        adjustedValue: 2,
        adjustedLabel: "Fast award explained by a seasonal deadline",
        adjustedPoints: 13,
        reason: "The action plan required works to begin before August.",
        verdict: "Lowered priority after context",
        recommended: true,
      },
    ],
    questions: [
      { id: "Q-0046-1", text: "When did the evaluation committee actually meet?", rationale: "Minutes confirm the interval.", evidenceIds: [TUNGA_TENDER] },
      { id: "Q-0046-2", text: "Did both linked bidders disclose the common holding entity?", rationale: "Disclosure changes how the link reads.", evidenceIds: ["REL-0012"] },
    ],
  },
  {
    id: "INV-2026-0038",
    title: "Fleet Maintenance Services — Payments",
    tenderId: CORVID_TENDER,
    vendorId: V.corvid,
    relatedVendorIds: [V.roadrunner],
    departmentId: "trn",
    categoryId: "transport",
    regionId: "bengaluru",
    value: TENDER_BY_ID.get(CORVID_TENDER)!.awardValue ?? 0,
    primarySignal: "Payment pattern",
    summary:
      "A reused invoice number on a paid claim, alongside invoices in exact round sums and sub-contract payments to another fleet vendor.",
    openedOn: "2026-08-30T17:05",
    initialStatus: "REFERRED",
    initialAssigneeId: "U-03",
    primarySignalIds: ["SIG-2026-0126"],
    signalIds: ["SIG-2026-0126", "SIG-2026-0125"],
    factors: [
      { id: "F-DUPLICATE", label: "Duplicate invoice", points: 30, signalIds: ["SIG-2026-0126"], rationale: "Two paid claims share one invoice number." },
      { id: "F-ROUND", label: "Round-sum invoices", points: 14, signalIds: ["SIG-2026-0125"], rationale: "Every invoice is an exact round figure." },
      { id: "F-RELATIONSHIP", label: "Payment relationship", points: 8, signalIds: [], rationale: "Sub-contract payments to another fleet vendor (REL-0013)." },
    ],
    evidence: makeEvidence("0038", [
      contractRecord(CORVID_TENDER, ["SIG-2026-0125"], "Defines whether fees are fixed or measured."),
      ...paymentRecords(CORVID_TENDER, ["SIG-2026-0126"], "Carries an invoice number already used on an earlier paid claim."),
      relationshipRecord("REL-0013", [], "Sub-contract payments flow to another fleet vendor that bid for the same contract."),
    ]),
    contextChecks: [
      {
        id: "CTX-0038-FEES",
        factorId: "F-ROUND",
        title: "Round-sum signal",
        observed: "All invoices round",
        observedValue: 5,
        adjustments: [
          { label: "Fixed quarterly fee schedule", value: "Clause 7.2", effect: -12, source: "Contract payment schedule" },
        ],
        adjustedValue: 5,
        adjustedLabel: "Round sums explained by fixed fees",
        adjustedPoints: 2,
        reason: "The contract prices maintenance as a fixed fee, so round sums are expected.",
        verdict: "Lowered priority after context",
        recommended: true,
      },
    ],
    questions: [
      { id: "Q-0038-1", text: "Do the two invoices with the same number claim the same period of work?", rationale: "The direct test of a duplicate claim.", evidenceIds: [] },
      { id: "Q-0038-2", text: "Was the sub-contractor approved under the contract?", rationale: "Unapproved sub-contracting is a separate compliance issue.", evidenceIds: ["REL-0013"] },
    ],
  },
  {
    id: "INV-2026-0043",
    title: "Mid-day Meal Kitchen Equipment — Hassan",
    tenderId: HEARTH_TENDER,
    vendorId: V.hearth,
    relatedVendorIds: [V.pantry],
    departmentId: "edu",
    categoryId: "edumat",
    regionId: "malnad",
    value: TENDER_BY_ID.get(HEARTH_TENDER)!.awardValue ?? 0,
    primarySignal: "Participation + Relationship",
    summary:
      "The same two suppliers form the entire bidder field in six kitchen-equipment tenders and share a contact number.",
    openedOn: "2026-07-01T11:45",
    initialStatus: "NEW",
    initialAssigneeId: "U-04",
    primarySignalIds: ["SIG-2026-0149"],
    signalIds: ["SIG-2026-0149", "SIG-2026-0150"],
    factors: [
      { id: "F-PARTICIPATION", label: "Participation pattern", points: 27, signalIds: ["SIG-2026-0149"], rationale: "Two-supplier field in six of six tenders." },
      { id: "F-RELATIONSHIP", label: "Vendor relationship signal", points: 20, signalIds: ["SIG-2026-0150"], rationale: "Shared contact number on covering letters." },
    ],
    evidence: makeEvidence("0043", [
      tenderNotice(HEARTH_TENDER, ["SIG-2026-0149"], "Shows how widely the tender was advertised."),
      ...bidRecords(HEARTH_TENDER, ["SIG-2026-0149"], (v, a) => `${v} bid ${a}; the field has not changed in six tenders.`),
      ...PAIR_TENDER_IDS.slice(0, 3).map<Omit<Evidence, "id">>((id) => {
        const t = TENDER_BY_ID.get(id)!;
        return {
          group: "COMPARABLE",
          kind: "Earlier tender",
          recordId: id,
          title: t.title,
          source: "Bid register",
          date: t.awardedOn!,
          fields: [
            { label: "Winner", value: vname(t.winnerVendorId!) },
            { label: "Bidders", value: "Hearth Institutional Kitchens · Pantry Steel Fabricators" },
          ],
          relevantValue: "Same two bidders",
          whyItMatters: "One of six tenders with an identical two-supplier field.",
          signalIds: ["SIG-2026-0149"],
          href: `/procurement/${id}`,
        };
      }),
      relationshipRecord("REL-0009", ["SIG-2026-0150"], "The only two bidders share a contact number."),
    ]),
    contextChecks: [],
    questions: [
      { id: "Q-0043-1", text: "Was the tender advertised beyond the district supplier list?", rationale: "Advertising scope determines the bidder pool.", evidenceIds: [HEARTH_TENDER] },
      { id: "Q-0043-2", text: "Do the two suppliers operate from separate premises?", rationale: "A shared number may indicate shared premises.", evidenceIds: ["REL-0009"] },
    ],
  },
  {
    id: "INV-2026-0040",
    title: "PHC Building Renovation — Udupi",
    tenderId: APEX_TENDER,
    vendorId: V.apex,
    relatedVendorIds: [V.karavali, V.monsoonline],
    departmentId: "hfw",
    categoryId: "building",
    regionId: "coastal",
    value: TENDER_BY_ID.get(APEX_TENDER)!.awardValue ?? 0,
    primarySignal: "Price",
    summary:
      "A health-facility renovation priced above comparable building works, awarded to a contractor that also appears in the coastal maintenance program.",
    openedOn: "2026-05-14T13:30",
    initialStatus: "EVIDENCE_GATHERING",
    initialAssigneeId: "U-02",
    primarySignalIds: ["SIG-2026-0116"],
    signalIds: ["SIG-2026-0116", "SIG-2026-0117"],
    factors: [
      { id: "F-PRICE", label: "Price deviation", points: 26, signalIds: ["SIG-2026-0116"], rationale: "Renovation above the comparable median." },
      { id: "F-AWARDS", label: "Repeated awards", points: 10, signalIds: ["SIG-2026-0117"], rationale: "Awards across two categories in one region." },
      { id: "F-LINK", label: "Linked relationship", points: 8, signalIds: [], rationale: "Shared director with another bidder in the coastal program (REL-0002)." },
    ],
    evidence: makeEvidence("0040", [
      tenderNotice(APEX_TENDER, [], "Defines the renovation scope."),
      ...bidRecords(APEX_TENDER, ["SIG-2026-0116"], (v, a) => `${v} bid ${a}.`),
      comparableRecord(APEX_TENDER, ["SIG-2026-0116"]),
      relationshipRecord("REL-0002", [], "The contractor shares a director with another coastal bidder."),
    ]),
    contextChecks: [
      priceContext(
        "0040",
        APEX_TENDER,
        "F-PRICE",
        "Infection-control requirements",
        "Phased working in occupied facilities",
        -15,
        "Health facility renovation guideline",
        12,
        "Occupied health facilities require phased work and infection control that other building works do not.",
      ),
    ],
    questions: [
      { id: "Q-0040-1", text: "Does the scope include infection-control and phased working?", rationale: "Both add cost legitimately.", evidenceIds: [APEX_TENDER] },
      { id: "Q-0040-2", text: "Should this case be linked to INV-2026-0042?", rationale: "The contractor appears in the coastal program.", evidenceIds: ["REL-0002"] },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Closed cases — the outcomes that calibrate future scoring           */
/* ------------------------------------------------------------------ */

function closedCase(input: {
  id: string;
  title: string;
  tenderId: string;
  vendorId: string;
  primarySignal: string;
  summary: string;
  openedOn: string;
  score: number;
  outcome: InvestigationOutcome;
  closedOn: string;
  note: string;
}): InvestigationCase {
  const tender = TENDER_BY_ID.get(input.tenderId)!;
  return {
    id: input.id,
    title: input.title,
    tenderId: input.tenderId,
    vendorId: input.vendorId,
    relatedVendorIds: [],
    departmentId: tender.departmentId,
    categoryId: tender.categoryId,
    regionId: tender.regionId,
    value: tender.awardValue ?? 0,
    primarySignal: input.primarySignal,
    summary: input.summary,
    openedOn: input.openedOn,
    initialStatus: input.outcome === "REFERRED_FOR_AUDIT" ? "RESOLVED" : "CLOSED",
    initialAssigneeId: "U-05",
    primarySignalIds: [],
    signalIds: [],
    factors: [
      { id: "F-RECORDED", label: "Priority at review", points: input.score, signalIds: [], rationale: input.primarySignal },
    ],
    evidence: makeEvidence(input.id.slice(-4), [
      tenderNotice(input.tenderId, [], "The procurement the review examined."),
      comparableRecord(input.tenderId, []),
    ]),
    contextChecks: [],
    questions: [],
    historical: { outcome: input.outcome, closedOn: input.closedOn, note: input.note },
  };
}

const CLOSED: InvestigationCase[] = [
  closedCase({
    id: "INV-2025-0187",
    title: "Road Maintenance — Zone 5",
    tenderId: "TND-2025-02684",
    vendorId: V.vertex,
    primarySignal: "Price deviation",
    summary: "Price signal on the Zone 5 maintenance package in the coastal program.",
    openedOn: "2025-10-20T10:00",
    score: 58,
    outcome: "NEEDS_MORE_REVIEW",
    closedOn: "2025-12-02",
    note: "Price deviation partly explained by scope. Recommended monitoring of the coastal maintenance program.",
  }),
  closedCase({
    id: "INV-2025-0171",
    title: "Emergency Medical Consumables — Dengue Response",
    tenderId: "TND-2025-02011",
    vendorId: V.tidewater,
    primarySignal: "Single-source award",
    summary: "Single-source purchase during an outbreak response.",
    openedOn: "2025-07-18T09:30",
    score: 52,
    outcome: "EXPLAINED_BY_CONTEXT",
    closedOn: "2025-10-18",
    note: "Emergency procurement under a declared outbreak; single-source route was authorized.",
  }),
  closedCase({
    id: "INV-2025-0164",
    title: "Laptops for Secondary Schools — Phase 2",
    tenderId: "TND-2025-02466",
    vendorId: V.datastream,
    primarySignal: "Price deviation",
    summary: "Laptop supply priced above comparable IT procurements.",
    openedOn: "2025-09-15T15:10",
    score: 49,
    outcome: "NO_ISSUE_FOUND",
    closedOn: "2025-09-30",
    note: "Higher specification and on-site warranty explain the price. No issue found.",
  }),
  closedCase({
    id: "INV-2026-0012",
    title: "Bridge Repairs — Netravati Crossing",
    tenderId: "TND-2025-03501",
    vendorId: V.karavali,
    primarySignal: "Payment pattern",
    summary: "Payments released ahead of structural inspection sign-off.",
    openedOn: "2026-01-27T11:00",
    score: 71,
    outcome: "REFERRED_FOR_AUDIT",
    closedOn: "2026-03-11",
    note: "Inspection sign-off missing for two claims. Referred to audit for a formal examination.",
  }),
  closedCase({
    id: "INV-2026-0021",
    title: "GPS Tracking for Ambulances",
    tenderId: "TND-2026-00475",
    vendorId: V.silverline,
    primarySignal: "Price deviation",
    summary: "Monitoring contract priced above comparable transport services.",
    openedOn: "2026-02-20T14:20",
    score: 46,
    outcome: "EXPLAINED_BY_CONTEXT",
    closedOn: "2026-05-22",
    note: "Price includes 24-hour monitoring center staffing absent from comparable contracts.",
  }),
];

export const CASES: InvestigationCase[] = [...ACTIVE, ...CLOSED];
export const ACTIVE_CASES = ACTIVE;
export const CLOSED_CASES = CLOSED;
export const CASE_BY_ID = new Map(CASES.map((c) => [c.id, c]));

export function baseScore(investigation: InvestigationCase) {
  return investigation.factors.reduce((s, f) => s + f.points, 0);
}

export function casesForVendor(vendorId: string) {
  return CASES.filter((c) => c.vendorId === vendorId || c.relatedVendorIds.includes(vendorId));
}

export function caseForTender(tenderId: string) {
  return CASES.find((c) => c.tenderId === tenderId);
}
