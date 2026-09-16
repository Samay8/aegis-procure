import { formatCr, formatDate, formatINR, formatPct } from "@/lib/format";
import { median } from "@/lib/utils";
import type { AnomalySignal, Metric, PriorityLevel, SignalCategory, SignalType } from "@/types";
import { SIGNAL_TYPE_META } from "./reference";
import {
  AWARDED_TENDERS,
  BIDS_BY_TENDER,
  CONTRACTS,
  CONTRACTS_BY_VENDOR,
  CONTRACT_BY_TENDER,
  PAYMENTS_BY_CONTRACT,
  TENDER_BY_ID,
  bidSpread,
  bidWindowDays,
  comparableStats,
  medianComparableSpread,
  tendersForVendor,
} from "./procurement";
import {
  CASE_TENDER,
  CLUSTER_TENDERS,
  HARROW_SPLIT_IDS,
  PAIR_TENDER_IDS,
  SPLIT_TENDER_IDS,
  SUNRISE_SPLIT_IDS,
} from "./story";
import { V, VENDOR_BY_ID } from "./vendors";

const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

interface SignalInput {
  id: string;
  type: SignalType;
  title: string;
  headline: string;
  severity: PriorityLevel;
  confidence: AnomalySignal["confidence"];
  strength: number;
  detectedOn: string;
  vendorIds: string[];
  tenderIds: string[];
  metrics: Metric[];
  comparison?: AnomalySignal["comparison"];
  explanation: string;
  context: string;
  alternatives: string[];
  reasoning: string;
  dataCoverage: string;
  recommendedAction: string;
  actionLabel: string;
  evidenceIds?: string[];
  caseId?: string;
}

function makeSignal(input: SignalInput): AnomalySignal {
  const primaryTender = TENDER_BY_ID.get(input.tenderIds[0]);
  const contractIds = input.tenderIds
    .map((id) => CONTRACT_BY_TENDER.get(id)?.id)
    .filter((id): id is string => Boolean(id));
  return {
    ...input,
    category: SIGNAL_TYPE_META[input.type].category,
    contractIds,
    departmentId: primaryTender?.departmentId ?? "pwd",
    categoryId: primaryTender?.categoryId ?? "road",
    regionId: primaryTender?.regionId ?? "coastal",
    evidenceIds: input.evidenceIds ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Measurements used by the authored signals                           */
/* ------------------------------------------------------------------ */

const caseTender = TENDER_BY_ID.get(CASE_TENDER)!;
export const CASE_STATS = comparableStats(caseTender);
export const CASE_SPREAD = bidSpread(CASE_TENDER) ?? 0;
export const CASE_COMPARABLE_SPREAD = medianComparableSpread(caseTender) ?? 0;
export const CASE_WINDOW = bidWindowDays(caseTender);
export const PWD_MEDIAN_WINDOW = median(
  AWARDED_TENDERS.filter((t) => t.departmentId === "pwd").map(bidWindowDays),
);

const caseBids = [...(BIDS_BY_TENDER.get(CASE_TENDER) ?? [])].sort((a, b) => a.amount - b.amount);
export const CASE_BID_LOW = caseBids[0];
export const CASE_BID_HIGH = caseBids[caseBids.length - 1];

/** The coastal maintenance packages the same four vendors all bid for. */
export const CLUSTER_TENDER_SET = CLUSTER_TENDERS.filter((t) => (t.bids?.length ?? 0) > 0)
  .map((t) => TENDER_BY_ID.get(t.id)!)
  .sort((a, b) => ((a.awardedOn ?? "") < (b.awardedOn ?? "") ? -1 : 1));

export const CLUSTER_WINNERS = CLUSTER_TENDER_SET.map((t) => t.winnerVendorId!);

/** Awards to one vendor inside a department + category since a date. */
function awardsSince(vendorId: string, departmentId: string, categoryId: string, since: string) {
  return (CONTRACTS_BY_VENDOR.get(vendorId) ?? []).filter((c) => {
    const tender = TENDER_BY_ID.get(c.tenderId)!;
    return (
      c.departmentId === departmentId &&
      c.categoryId === categoryId &&
      (tender.awardedOn ?? "") >= since
    );
  });
}

function peerAwardProfile(departmentId: string, categoryId: string, since: string, exclude: string) {
  const counts = new Map<string, number>();
  for (const contract of CONTRACTS) {
    const tender = TENDER_BY_ID.get(contract.tenderId)!;
    if (
      contract.departmentId === departmentId &&
      contract.categoryId === categoryId &&
      (tender.awardedOn ?? "") >= since &&
      contract.vendorId !== exclude
    ) {
      counts.set(contract.vendorId, (counts.get(contract.vendorId) ?? 0) + 1);
    }
  }
  const values = [...counts.values()];
  return {
    vendors: values.length,
    average: values.length ? values.reduce((s, n) => s + n, 0) / values.length : 0,
    max: values.length ? Math.max(...values) : 0,
  };
}

function categoryShare(departmentId: string, categoryId: string, vendorId: string) {
  const group = CONTRACTS.filter(
    (c) => c.departmentId === departmentId && c.categoryId === categoryId,
  );
  const total = group.reduce((s, c) => s + c.value, 0);
  const mine = group.filter((c) => c.vendorId === vendorId);
  return {
    contracts: mine.length,
    groupContracts: group.length,
    value: mine.reduce((s, c) => s + c.value, 0),
    groupValue: total,
    sharePct: total ? (mine.reduce((s, c) => s + c.value, 0) / total) * 100 : 0,
  };
}

const VERTEX_WINDOW_AWARDS = awardsSince(V.vertex, "pwd", "road", "2025-07-01");
const VERTEX_PEERS = peerAwardProfile("pwd", "road", "2025-07-01", V.vertex);
const VERTEX_WINDOW_VALUE = VERTEX_WINDOW_AWARDS.reduce((s, c) => s + c.value, 0);

const MERIDIAN_SHARE = categoryShare("hfw", "medeq", V.meridian);
const KESTREL_SHARE = categoryShare("hfw", "medsup", V.kestrel);
const APEX_BUILDING = (CONTRACTS_BY_VENDOR.get(V.apex) ?? []).filter((c) => c.categoryId === "building");

/* ------------------------------------------------------------------ */
/* Authored signals                                                    */
/* ------------------------------------------------------------------ */

const AUTHORED: AnomalySignal[] = [
  /* ---------------- INV-2026-0042 · Road Maintenance Zone 4 ------- */
  makeSignal({
    id: "SIG-2026-0142",
    type: "PRICE_OUTLIER",
    title: "Winning price above comparable median",
    headline: `Winning bid is ${formatPct(CASE_STATS.deviationPct, 1, true)} against the median of ${CASE_STATS.count} comparable procurements.`,
    severity: "HIGH",
    confidence: "HIGH",
    strength: 78,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Winning bid", value: formatCr(CASE_STATS.current) },
      { label: "Comparable median", value: formatCr(CASE_STATS.median) },
      { label: "Deviation", value: formatPct(CASE_STATS.deviationPct, 1, true) },
      { label: "Comparable procurements", value: String(CASE_STATS.count) },
      { label: "Departmental estimate", value: formatCr(caseTender.estimate) },
      {
        label: "Bid against estimate",
        value: formatPct(((CASE_STATS.current - caseTender.estimate) / caseTender.estimate) * 100, 1, true),
      },
    ],
    comparison: {
      label: "Contract value",
      current: CASE_STATS.current,
      baseline: CASE_STATS.median,
      unit: "INR",
      baselineLabel: "Comparable median",
    },
    explanation:
      "The winning price is materially above the median of comparable procurements matched on category, contract size, department and time period. The interquartile range of that comparable set is " +
      `${formatCr(CASE_STATS.p25)} to ${formatCr(CASE_STATS.p75)}; this award sits above the upper quartile.`,
    context:
      "Material cost movement and regional cost adjustment have not been applied to this measurement. The context check on this case quantifies both and reduces the contribution of this signal.",
    alternatives: [
      "Bitumen and aggregate prices rose over the comparison window",
      "Coastal packages carry higher transport and monsoon-season costs",
      "This package covers 38.6 km against a 33 km median scope in the comparable set",
    ],
    reasoning:
      "Deviation is measured against the median of awarded procurements in the same category and size band within an 18-month window — not against the departmental estimate, which is itself a prediction.",
    dataCoverage: `${CASE_STATS.count} of ${CASE_STATS.count} comparable awards have complete price records.`,
    recommendedAction:
      "Compare the priced bill of quantities against two comparable packages of similar length and terrain.",
    actionLabel: "View comparable procurement",
    evidenceIds: ["BID-38271", "CMP-04182", "TND-2026-04182"],
  }),
  makeSignal({
    id: "SIG-2026-0143",
    type: "CLOSE_BIDS",
    title: "Bids unusually close to each other",
    headline: `All four bids sit within ${pct(CASE_SPREAD, 2)} of each other, against a comparable median of ${pct(CASE_COMPARABLE_SPREAD, 1)}.`,
    severity: "HIGH",
    confidence: "HIGH",
    strength: 74,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex, V.northstar, V.apex, V.bluegrid],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Bid spread", value: pct(CASE_SPREAD, 2) },
      { label: "Comparable median spread", value: pct(CASE_COMPARABLE_SPREAD, 1) },
      { label: "Bids received", value: String(caseBids.length) },
      {
        label: "Range",
        value: `${formatCr(CASE_BID_LOW.amount)} – ${formatCr(CASE_BID_HIGH.amount)}`,
      },
      { label: "Bids above estimate", value: `4 of 4 (+17.0% to +18.6%)` },
    ],
    comparison: {
      label: "Bid spread",
      current: CASE_SPREAD,
      baseline: CASE_COMPARABLE_SPREAD,
      unit: "PCT",
      baselineLabel: "Comparable median",
    },
    explanation:
      "The distance between the highest and lowest bid is a fraction of what comparable procurements show. Every bid also lands in a narrow band above the departmental estimate.",
    context:
      "Seven of the eight tightest bid spreads in the comparable set involve the same four bidders. When a fifth bidder entered this program in August 2025, the spread widened to 9.7%.",
    alternatives: [
      "Published schedules of rates anchor pricing in maintenance packages",
      "A small pool of qualified bidders narrows the plausible price range",
      "Standard quantities across zone packages produce similar estimates",
    ],
    reasoning:
      "Spread is compared against the same 18 comparable procurements used for price, so scope and period are held constant.",
    dataCoverage: "Bid amounts are complete for all four bids and for 18 of 18 comparable procurements.",
    recommendedAction:
      "Review bidder participation history and the rate analysis behind each bid before drawing any inference.",
    actionLabel: "Open bid analysis",
    evidenceIds: ["BID-38271", "BID-38304", "BID-38309", "BID-38352"],
  }),
  makeSignal({
    id: "SIG-2026-0144",
    type: "REPEATED_AWARDS",
    title: "Repeated awards within one department and category",
    headline: `${VERTEX_WINDOW_AWARDS.length} Public Works road awards in 14 months, worth ${formatCr(VERTEX_WINDOW_VALUE)}.`,
    severity: "HIGH",
    confidence: "HIGH",
    strength: 80,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex],
    tenderIds: [CASE_TENDER, ...VERTEX_WINDOW_AWARDS.map((c) => c.tenderId)],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Awards in window", value: String(VERTEX_WINDOW_AWARDS.length) },
      { label: "Window", value: "Jul 2025 – Aug 2026" },
      { label: "Value awarded", value: formatCr(VERTEX_WINDOW_VALUE) },
      { label: "Comparable vendors", value: String(VERTEX_PEERS.vendors) },
      { label: "Peer average awards", value: VERTEX_PEERS.average.toFixed(1) },
      { label: "Peer maximum", value: String(VERTEX_PEERS.max) },
    ],
    comparison: {
      label: "Awards in 14 months",
      current: VERTEX_WINDOW_AWARDS.length,
      baseline: Number(VERTEX_PEERS.average.toFixed(1)),
      unit: "COUNT",
      baselineLabel: "Peer average",
    },
    explanation:
      "One vendor holds a run of awards in the same department and category that no comparable vendor approaches over the same window.",
    context:
      "Coastal division lists a limited number of Class I contractors qualified for performance-based maintenance work. Specialization can explain part of a concentration of this kind.",
    alternatives: [
      "A thin pool of qualified Class I contractors in the division",
      "Performance-based contracts favor incumbents with local plant and equipment",
      "Packages were tendered in quick succession after monsoon damage",
    ],
    reasoning:
      "Counts are taken from award records in the same department and category, restricted to a 14-month window, and compared with every other vendor that won work in the same slice.",
    dataCoverage: "Award records are complete for the window; sub-contracting records are not available.",
    recommendedAction:
      "Review the qualified-bidder list for the division and the award history of each package in the run.",
    actionLabel: "Review award history",
    evidenceIds: ["AWD-2026-0733", "VEN-HIST-1042"],
  }),
  makeSignal({
    id: "SIG-2026-0145",
    type: "SHARED_ENTITY",
    title: "Winner and lowest bidder share a registered address",
    headline:
      "Two bidders in the same tender are registered at the same address, with a 100% match across four records.",
    severity: "CRITICAL",
    confidence: "HIGH",
    strength: 86,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex, V.northstar],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Relationship", value: "Shared address" },
      { label: "Address match", value: "100%" },
      { label: "Evidence records", value: "4" },
      { label: "First observed", value: "18 Mar 2025" },
      { label: "Last observed", value: "05 Aug 2026" },
      { label: "Joint tenders", value: "9" },
    ],
    explanation:
      "The awarded vendor and the lowest financial bidder in the same tender give an identical registered address, including unit and floor. Both filed independent-bidder declarations.",
    context:
      "Address matches can be administrative: shared office facilities, common accountants or a former premises that was never updated. This address is a single commercial unit, not a shared-office facility.",
    alternatives: [
      "A registered office service shared by unrelated companies",
      "A stale registry record that was never updated after a move",
      "Premises sub-let between unrelated tenants",
    ],
    reasoning:
      "The address string matched exactly across registry filings and both bid documents. The facility check found no evidence of a shared-office arrangement at this unit.",
    dataCoverage:
      "Registry filings and bid documents are complete. Ownership and beneficial-interest records are not available in this dataset.",
    recommendedAction:
      "Verify whether the two vendors are independently controlled: ownership records, statutory filings and a site check of the registered premises.",
    actionLabel: "Open relationship graph",
    evidenceIds: ["VRF-2025-3318", "BID-38271", "BID-38304", "REL-0001"],
  }),
  makeSignal({
    id: "SIG-2026-0146",
    type: "BID_ROTATION",
    title: "Winners alternate across a program of similar packages",
    headline:
      "Across nine packages where the same four vendors bid, the winner follows a repeating order in eight of them.",
    severity: "HIGH",
    confidence: "MEDIUM",
    strength: 72,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex, V.northstar, V.apex, V.bluegrid],
    tenderIds: CLUSTER_TENDER_SET.map((t) => t.id),
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Packages in program", value: String(CLUSTER_TENDER_SET.length) },
      { label: "Following the order", value: "8 of 9" },
      { label: "Exception", value: "Aug 2025 — a fifth bidder won" },
      { label: "Program value", value: formatCr(CLUSTER_TENDER_SET.reduce((s, t) => s + (t.awardValue ?? 0), 0)) },
    ],
    explanation:
      "Each of the four vendors wins in turn across the program. The single exception is the package where a fifth vendor entered and won at a price 8.7% below the group's bids.",
    context:
      "Rotation can also arise from capacity: a contractor already executing one zone may bid higher on the next. This system does not treat the sequence as proof of an arrangement.",
    alternatives: [
      "Capacity constraints — a vendor mid-execution prices the next package higher",
      "Zone familiarity, plant location and haulage distance",
      "Coincidence across a small number of packages",
    ],
    reasoning:
      "The sequence is read from award dates and winners in a single program with an identical bidder set; it is descriptive, not causal.",
    dataCoverage: "All nine packages have complete bid and award records.",
    recommendedAction:
      "Compare rate analyses across the program and check whether losing bids were priced to lose.",
    actionLabel: "View participation matrix",
    evidenceIds: ["PART-MATRIX-04182", "TND-2025-02207"],
  }),
  makeSignal({
    id: "SIG-2026-0147",
    type: "TIMING_ANOMALY",
    title: "Short bid window and near-simultaneous submissions",
    headline: `A ${CASE_WINDOW}-day bid window against a departmental median of ${PWD_MEDIAN_WINDOW} days, with two bids filed 14 minutes apart.`,
    severity: "MEDIUM",
    confidence: "HIGH",
    strength: 58,
    detectedOn: "2026-09-15",
    vendorIds: [V.northstar, V.apex],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Bid window", value: `${CASE_WINDOW} days` },
      { label: "Departmental median", value: `${PWD_MEDIAN_WINDOW} days` },
      { label: "Closest submissions", value: "14 minutes apart" },
      { label: "Pattern in program", value: "5 of 9 packages" },
      { label: "Award after evaluation", value: "6 days" },
    ],
    explanation:
      "The tender was open for six days. Two bidders filed within fourteen minutes of each other, a pattern that repeats in five of the nine packages in this program.",
    context:
      "Short windows are permitted for urgent post-monsoon repairs, and portal submissions cluster near deadlines for every bidder. Both facts weaken this signal on their own.",
    alternatives: [
      "Urgent post-monsoon repair timelines allow a shortened window",
      "Submissions naturally cluster in the final hours before a deadline",
      "A shared consultant preparing documents for multiple bidders",
    ],
    reasoning:
      "Window length is compared with the median across all Public Works awards in the dataset; submission gaps are read from portal timestamps.",
    dataCoverage: "Portal timestamps are complete for all four bids.",
    recommendedAction:
      "Check the file noting for the shortened window and the submission metadata for both bids.",
    actionLabel: "Open timeline",
    evidenceIds: ["TND-2026-04182", "BID-38304", "BID-38309"],
  }),
  makeSignal({
    id: "SIG-2026-0138",
    type: "PARTICIPATION_PATTERN",
    title: "The same four vendors appear together",
    headline: "Four vendors have bid as a complete field in nine packages of one program since January 2025.",
    severity: "MEDIUM",
    confidence: "HIGH",
    strength: 64,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex, V.northstar, V.apex, V.bluegrid],
    tenderIds: CLUSTER_TENDER_SET.map((t) => t.id),
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Packages", value: String(CLUSTER_TENDER_SET.length) },
      { label: "Vendors in every field", value: "4" },
      { label: "Outside bidders", value: "1 (Aug 2025)" },
      { label: "Window", value: "Jan 2025 – Aug 2026" },
    ],
    explanation:
      "The bidder field for this program has been identical in nine tenders, with one exception when a fifth vendor participated.",
    context:
      "A stable field is normal where qualification requirements are demanding and few contractors hold the required class of registration.",
    alternatives: [
      "Only a handful of contractors hold the required registration class",
      "Geographic proximity restricts who can mobilize plant",
      "Smaller contractors avoid performance-based maintenance risk",
    ],
    reasoning: "Participation is read directly from bid registers across the program.",
    dataCoverage: "Bid registers are complete for all nine packages.",
    recommendedAction: "Check whether other qualified contractors were notified and why they did not bid.",
    actionLabel: "View participation matrix",
    evidenceIds: ["PART-MATRIX-04182"],
  }),
  makeSignal({
    id: "SIG-2026-0139",
    type: "SHARED_ENTITY",
    title: "Two other bidders share a director",
    headline: "A director is common to two further bidders in the same tender, active on both boards since January 2025.",
    severity: "HIGH",
    confidence: "HIGH",
    strength: 70,
    detectedOn: "2026-09-15",
    vendorIds: [V.apex, V.bluegrid],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Relationship", value: "Shared director" },
      { label: "Evidence records", value: "4" },
      { label: "First observed", value: "12 Jan 2025" },
      { label: "Last observed", value: "14 Aug 2026" },
      { label: "Joint tenders", value: "9" },
    ],
    explanation:
      "Corporate filings place the same individual on both vendors' boards throughout the period in which both bid for the same packages.",
    context:
      "Common directorships are lawful and often disclosed. They matter here because both entities bid in the same tender as independent parties.",
    alternatives: [
      "A non-executive role with no involvement in bidding",
      "A directorship held historically and disclosed to the department",
    ],
    reasoning: "Read from director registers and annual returns for both vendors.",
    dataCoverage: "Director registers are complete; shareholding detail is partial.",
    recommendedAction: "Verify whether the shared directorship was disclosed with the bids.",
    actionLabel: "Open relationship graph",
    evidenceIds: ["DIR-REG-2231A", "DIR-REG-2231B", "REL-0002"],
  }),
  makeSignal({
    id: "SIG-2026-0140",
    type: "SHARED_ENTITY",
    title: "Contact number repeats across two bidders",
    headline: "The same phone number appears on bid documents filed by two separate bidders.",
    severity: "MEDIUM",
    confidence: "MEDIUM",
    strength: 52,
    detectedOn: "2026-09-15",
    vendorIds: [V.vertex, V.apex],
    tenderIds: [CASE_TENDER],
    caseId: "INV-2026-0042",
    metrics: [
      { label: "Relationship", value: "Shared contact number" },
      { label: "Evidence records", value: "2" },
      { label: "First observed", value: "02 Jun 2025" },
      { label: "Last observed", value: "05 Aug 2026" },
    ],
    explanation: "Two bidders list an identical contact number in their bid documents in two tenders.",
    context:
      "Contact numbers are weak identifiers. A shared site engineer, consultant or clerical reuse of a template can explain a match.",
    alternatives: [
      "A shared consultant preparing bid documents",
      "A clerical copy from an earlier document template",
    ],
    reasoning: "String match on the contact block of submitted bid documents.",
    dataCoverage: "Contact blocks are present in both documents; no telecom records are available.",
    recommendedAction: "Ask both vendors to confirm the contact person named against this number.",
    actionLabel: "Open relationship graph",
    evidenceIds: ["BID-CORR-1841", "BID-38309", "REL-0003"],
  }),

  /* ---------------- INV-2026-0039 · Oxygen concentrators ---------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-03914")!;
    const stats = comparableStats(tender);
    const awards = awardsSince(V.meridian, "hfw", "medeq", "2025-09-01");
    return [
      makeSignal({
        id: "SIG-2026-0131",
        type: "PRICE_OUTLIER",
        title: "Equipment price above comparable median",
        headline: `Award is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable equipment procurements.`,
        severity: "HIGH",
        confidence: "MEDIUM",
        strength: 71,
        detectedOn: "2026-08-12",
        vendorIds: [V.meridian],
        tenderIds: [tender.id],
        caseId: "INV-2026-0039",
        metrics: [
          { label: "Award value", value: formatCr(stats.current) },
          { label: "Comparable median", value: formatCr(stats.median) },
          { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
          { label: "Comparable procurements", value: String(stats.count) },
          { label: "Unit price", value: "₹1.59 L per concentrator" },
        ],
        comparison: {
          label: "Contract value",
          current: stats.current,
          baseline: stats.median,
          unit: "INR",
          baselineLabel: "Comparable median",
        },
        explanation:
          "The award sits above the comparable median for medical equipment procurements of similar size in the same period.",
        context:
          "A national supply advisory in June 2026 reported constrained availability of oxygen concentrators. Scarcity of this kind moves prices for every buyer.",
        alternatives: [
          "Supply scarcity following the June 2026 advisory",
          "A three-year maintenance component bundled into the price",
          "Higher specification (flow rate, altitude rating) than comparable units",
        ],
        reasoning:
          "Comparison uses awarded equipment procurements in the same size band and period; bundled service components are not separated in the price records.",
        dataCoverage: "Line-item breakdowns are missing for 4 of the comparable awards, so confidence is medium.",
        recommendedAction:
          "Separate the equipment and maintenance components before comparing unit prices.",
        actionLabel: "View comparable procurement",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0132",
        type: "REPEATED_AWARDS",
        title: "Concentration of equipment awards",
        headline: `${MERIDIAN_SHARE.contracts} of ${MERIDIAN_SHARE.groupContracts} medical equipment contracts, ${pct(MERIDIAN_SHARE.sharePct)} by value.`,
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 66,
        detectedOn: "2026-08-12",
        vendorIds: [V.meridian],
        tenderIds: [tender.id, ...awards.map((c) => c.tenderId)].slice(0, 8),
        caseId: "INV-2026-0039",
        metrics: [
          { label: "Contracts held", value: `${MERIDIAN_SHARE.contracts} of ${MERIDIAN_SHARE.groupContracts}` },
          { label: "Share by value", value: pct(MERIDIAN_SHARE.sharePct) },
          { label: "Value awarded", value: formatCr(MERIDIAN_SHARE.value) },
          { label: "Awards since Sep 2025", value: String(awards.length) },
        ],
        explanation:
          "One supplier holds the majority of medical equipment contracts by value in this department.",
        context:
          "Equipment categories concentrate naturally where few suppliers hold authorized-distributor status for a product line.",
        alternatives: [
          "Authorised distributorship limits who can bid",
          "Installed-base compatibility favors the incumbent",
          "Other suppliers did not meet turnover requirements",
        ],
        reasoning: "Share is computed across all awarded contracts in the department and category.",
        dataCoverage: "Award records are complete; distributor authorizations are not in the dataset.",
        recommendedAction: "Check authorized-distributor declarations for the last four equipment tenders.",
        actionLabel: "Review award history",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0133",
        type: "SHARED_ENTITY",
        title: "Two suppliers share a contact number",
        headline: "Supplier registrations for two bidders in this category carry the same phone number.",
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 48,
        detectedOn: "2026-08-12",
        vendorIds: [V.meridian, V.carewell],
        tenderIds: [tender.id],
        caseId: "INV-2026-0039",
        metrics: [
          { label: "Relationship", value: "Shared contact number" },
          { label: "Evidence records", value: "2" },
          { label: "First observed", value: "08 Nov 2024" },
        ],
        explanation: "Two suppliers registered in the same category list an identical contact number.",
        context: "Both suppliers did not bid in this tender; the link is to a separate rate contract.",
        alternatives: ["A shared distributor or agent", "A registration entry copied between records"],
        reasoning: "String match across supplier registration records.",
        dataCoverage: "Registration records are complete for both suppliers.",
        recommendedAction: "Confirm the contact person registered against each supplier account.",
        actionLabel: "Open relationship graph",
        evidenceIds: ["VRF-2024-7712", "REL-0008"],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0044 · Learning kits ----------------- */
  ...(() => {
    const tenders = SPLIT_TENDER_IDS.map((id) => TENDER_BY_ID.get(id)!);
    const total = tenders.reduce((s, t) => s + (t.awardValue ?? 0), 0);
    const first = tenders[0].awardedOn!;
    const last = tenders[tenders.length - 1].awardedOn!;
    return [
      makeSignal({
        id: "SIG-2026-0151",
        type: "CONTRACT_SPLITTING",
        title: "Five purchases just under the tender threshold",
        headline: `${tenders.length} direct purchases to one supplier within 19 days, each below ₹25 L, together ${formatCr(total)}.`,
        severity: "CRITICAL",
        confidence: "HIGH",
        strength: 82,
        detectedOn: "2026-07-28",
        vendorIds: [V.lumen],
        tenderIds: tenders.map((t) => t.id),
        caseId: "INV-2026-0044",
        metrics: [
          { label: "Purchases", value: String(tenders.length) },
          { label: "Window", value: `${formatDate(first)} – ${formatDate(last)}` },
          { label: "Each below", value: "₹25.00 L" },
          { label: "Largest", value: formatINR(Math.max(...tenders.map((t) => t.awardValue ?? 0))) },
          { label: "Combined value", value: formatCr(total) },
          { label: "Supplier", value: VENDOR_BY_ID[V.lumen].name },
        ],
        explanation:
          "Five direct purchases of the same item category went to one supplier inside nineteen days. Each sits below the open-tender threshold; together they exceed it several times over.",
        context:
          "Splitting can be procedural rather than deliberate: school clusters raise separate indents, and budget releases arrive in tranches.",
        alternatives: [
          "Separate indents raised by different school clusters",
          "Budget released in tranches with expiry dates",
          "Urgent replacement of damaged stock",
        ],
        reasoning:
          "Purchases were grouped by supplier, department, category and a 45-day window; the group total was compared with the delegated threshold.",
        dataCoverage: "Purchase orders and approvals are complete for all five.",
        recommendedAction:
          "Check the indents and sanction notes behind each purchase, and whether a consolidated tender was considered.",
        actionLabel: "View purchase orders",
        evidenceIds: tenders.map((t) => t.id),
      }),
      makeSignal({
        id: "SIG-2026-0152",
        type: "SHARED_ENTITY",
        title: "Quotations sent from one email address",
        headline: "Competing quotations for these purchases were sent from a single email address.",
        severity: "HIGH",
        confidence: "HIGH",
        strength: 68,
        detectedOn: "2026-07-28",
        vendorIds: [V.lumen, V.brightdesk],
        tenderIds: tenders.map((t) => t.id),
        caseId: "INV-2026-0044",
        metrics: [
          { label: "Relationship", value: "Shared email address" },
          { label: "Evidence records", value: "3" },
          { label: "Purchases affected", value: String(tenders.length) },
        ],
        explanation:
          "The comparative quotations used to justify each direct purchase were sent from the same email address as the winning supplier's correspondence.",
        context: "A shared address can indicate a common agent rather than common ownership.",
        alternatives: ["A common sales agent representing both suppliers", "An office assistant sending on behalf of both"],
        reasoning: "Read from the procurement portal's correspondence log and purchase order files.",
        dataCoverage: "Correspondence logs are complete for the five purchases.",
        recommendedAction: "Ask for independent confirmation of the comparative quotations.",
        actionLabel: "Open relationship graph",
        evidenceIds: ["MAIL-LOG-8841", "REL-0007"],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0037 · Hospital IT AMC --------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-02650")!;
    const window = bidWindowDays(tender);
    const quillonContracts = (CONTRACTS_BY_VENDOR.get(V.quillon) ?? []).filter((c) => c.categoryId === "it");
    return [
      makeSignal({
        id: "SIG-2026-0121",
        type: "TIMING_ANOMALY",
        title: "Bid window well below the norm",
        headline: `A ${window}-day window on a limited tender worth ${formatCr(tender.awardValue ?? 0)}.`,
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 62,
        detectedOn: "2026-06-30",
        vendorIds: [V.quillon],
        tenderIds: [tender.id],
        caseId: "INV-2026-0037",
        metrics: [
          { label: "Bid window", value: `${window} days` },
          { label: "Median for IT services", value: "21 days" },
          { label: "Method", value: "Limited tender" },
          { label: "Bids received", value: "1" },
        ],
        explanation:
          "The tender was open for a week, below the norm for services of this value, and drew a single bid.",
        context:
          "Continuity of a live hospital system can justify a shortened window where an interruption would affect services.",
        alternatives: [
          "Continuity requirement for a live clinical system",
          "An expiring contract with no gap permitted",
        ],
        reasoning: "Window length is compared with the median for the same category across the dataset.",
        dataCoverage: "Publication and deadline records are complete.",
        recommendedAction: "Read the approval note for the shortened window and the limited-tender route.",
        actionLabel: "Open timeline",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0122",
        type: "SINGLE_BID",
        title: "Single responsive bid",
        headline: "One bid received; the award value sits 2.1% above the departmental estimate.",
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 57,
        detectedOn: "2026-06-30",
        vendorIds: [V.quillon],
        tenderIds: [tender.id],
        caseId: "INV-2026-0037",
        metrics: [
          { label: "Bids received", value: "1" },
          { label: "Estimate", value: formatCr(tender.estimate) },
          { label: "Award", value: formatCr(tender.awardValue ?? 0) },
          { label: "Above estimate", value: "+2.1%" },
        ],
        explanation: "No competitive tension is visible in the record: one bid, priced just above the estimate.",
        context:
          "Single bids are common in maintenance of bespoke systems where the incumbent holds source code and data.",
        alternatives: [
          "Vendor lock-in on a bespoke platform",
          "Short window discouraged other bidders",
          "Low margin on annual maintenance",
        ],
        reasoning: "Bid count is read from the bid register; the comparison is with the published estimate.",
        dataCoverage: "Bid register is complete.",
        recommendedAction: "Check whether source code and data escrow allow a competitive re-tender.",
        actionLabel: "Open bid analysis",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0123",
        type: "REPEATED_AWARDS",
        title: "Consecutive awards to the same IT vendor",
        headline: `${quillonContracts.length} IT contracts held by one vendor across departments.`,
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 54,
        detectedOn: "2026-06-30",
        vendorIds: [V.quillon],
        tenderIds: [tender.id, ...quillonContracts.map((c) => c.tenderId)].slice(0, 6),
        caseId: "INV-2026-0037",
        metrics: [
          { label: "Contracts held", value: String(quillonContracts.length) },
          { label: "Value", value: formatCr(quillonContracts.reduce((s, c) => s + c.value, 0)) },
          { label: "Departments", value: String(new Set(quillonContracts.map((c) => c.departmentId)).size) },
        ],
        explanation: "The same vendor holds a run of IT service contracts across more than one department.",
        context: "Empanelment frameworks concentrate IT awards by design.",
        alternatives: ["Empanelment framework with a limited vendor list", "Platform familiarity across departments"],
        reasoning: "Counts are taken from awarded IT contracts in the dataset.",
        dataCoverage: "Award records are complete.",
        recommendedAction: "Check the empanelment list and rotation policy for IT services.",
        actionLabel: "Review award history",
        evidenceIds: [tender.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0041 · Culverts payments ------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-01633")!;
    const contract = CONTRACT_BY_TENDER.get(tender.id)!;
    const payments = PAYMENTS_BY_CONTRACT.get(contract.id) ?? [];
    const paidPct = (contract.paidToDate / contract.value) * 100;
    const uncertified = payments.filter((p) => !p.milestoneCertified);
    return [
      makeSignal({
        id: "SIG-2026-0157",
        type: "PAYMENT_PATTERN",
        title: "Payments ahead of milestone certification",
        headline: `${pct(paidPct)} of the contract is paid with ${payments.length - uncertified.length} of ${payments.length} claims certified.`,
        severity: "HIGH",
        confidence: "HIGH",
        strength: 76,
        detectedOn: "2026-08-22",
        vendorIds: [V.stratum],
        tenderIds: [tender.id],
        caseId: "INV-2026-0041",
        metrics: [
          { label: "Paid to date", value: formatCr(contract.paidToDate) },
          { label: "Share of contract", value: pct(paidPct) },
          { label: "Certified claims", value: `${payments.length - uncertified.length} of ${payments.length}` },
          { label: "Uncertified value", value: formatINR(uncertified.reduce((s, p) => s + p.amount, 0)) },
          { label: "Average days to pay", value: `${Math.round(median(payments.map((p) => p.daysToPay)))} days` },
        ],
        explanation:
          "Running account bills were released without recorded measurement certification, and released faster than comparable contracts in the same category.",
        context:
          "Certification can lag payment in records where measurement books are filed late. That is a record-keeping issue rather than a payment issue.",
        alternatives: [
          "Measurement books filed after payment processing",
          "Certification recorded in a separate register not in this dataset",
          "Advance against a bank guarantee misclassified as a running bill",
        ],
        reasoning:
          "Payment records are matched against milestone certification flags and compared with the payment profile of comparable contracts.",
        dataCoverage: "Payment records are complete; measurement books are not included in the dataset.",
        recommendedAction: "Request measurement books for the three uncertified claims.",
        actionLabel: "Open payment records",
        evidenceIds: [contract.id],
      }),
      makeSignal({
        id: "SIG-2026-0158",
        type: "SHARED_ENTITY",
        title: "Two bidders share a shareholder",
        headline: "A shareholder of the winning vendor is a partner of record in a competing bidder.",
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 60,
        detectedOn: "2026-08-22",
        vendorIds: [V.stratum, V.terracebeam],
        tenderIds: [tender.id],
        caseId: "INV-2026-0041",
        metrics: [
          { label: "Relationship", value: "Common ownership indicator" },
          { label: "Stake", value: "26%" },
          { label: "Evidence records", value: "3" },
        ],
        explanation:
          "Shareholding records connect the awarded vendor and one competing bidder in the same tender.",
        context: "A 26% holding is a minority stake and does not by itself establish control.",
        alternatives: ["A passive minority investment", "A family shareholding with no operational role"],
        reasoning: "Read from annual returns and the partnership deed.",
        dataCoverage: "Shareholding returns are available for both vendors.",
        recommendedAction: "Check whether the shareholding was disclosed in bidder declarations.",
        actionLabel: "Open relationship graph",
        evidenceIds: ["AR-2024-4417", "REL-0006"],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0035 · Bus depot --------------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-02480")!;
    const stats = comparableStats(tender);
    const spread = bidSpread(tender.id) ?? 0;
    return [
      makeSignal({
        id: "SIG-2026-0118",
        type: "CLOSE_BIDS",
        title: "Three bids within one percent",
        headline: `Bid spread of ${pct(spread, 2)} across three bidders from the same coastal group.`,
        severity: "HIGH",
        confidence: "HIGH",
        strength: 69,
        detectedOn: "2026-06-02",
        vendorIds: [V.northstar, V.vertex, V.apex],
        tenderIds: [tender.id],
        caseId: "INV-2026-0035",
        metrics: [
          { label: "Bid spread", value: pct(spread, 2) },
          { label: "Bids", value: "3" },
          { label: "Award", value: formatCr(tender.awardValue ?? 0) },
          { label: "Shared-address pair present", value: "Yes" },
        ],
        explanation:
          "Three bids for a depot resurfacing package sit within one percent of each other. Two of the bidders are linked by a shared registered address.",
        context: "The same bidder group appears in the coastal maintenance program under investigation.",
        alternatives: ["Standard rates for resurfacing work", "Common quantity estimates from the tender documents"],
        reasoning: "Spread is computed across all submitted bids and compared with the category median.",
        dataCoverage: "Bid records are complete.",
        recommendedAction: "Cross-check against the coastal maintenance case before drawing conclusions.",
        actionLabel: "Open bid analysis",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0119",
        type: "PRICE_OUTLIER",
        title: "Award above comparable median",
        headline: `Award is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable procurements.`,
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 55,
        detectedOn: "2026-06-02",
        vendorIds: [V.northstar],
        tenderIds: [tender.id],
        caseId: "INV-2026-0035",
        metrics: [
          { label: "Award value", value: formatCr(tender.awardValue ?? 0) },
          { label: "Comparable median", value: formatCr(stats.median) },
          { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
          { label: "Comparable procurements", value: String(stats.count) },
        ],
        comparison: {
          label: "Contract value",
          current: stats.current,
          baseline: stats.median,
          unit: "INR",
          baselineLabel: "Comparable median",
        },
        explanation: "The award sits above the median for comparable resurfacing work in the same period.",
        context: "Depot yards carry heavier axle loads than road packages, which affects pavement design and cost.",
        alternatives: ["Heavier pavement specification for depot yards", "Night working restrictions at an operating depot"],
        reasoning: "Comparison against awarded procurements in the same category and size band.",
        dataCoverage: "Complete price records for the comparable set.",
        recommendedAction: "Compare the pavement specification with the comparable packages.",
        actionLabel: "View comparable procurement",
        evidenceIds: [tender.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0045 · Drip irrigation --------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-03702")!;
    const stats = comparableStats(tender);
    return [
      makeSignal({
        id: "SIG-2026-0161",
        type: "PRICE_OUTLIER",
        title: "Per-kit price above comparable supply orders",
        headline: `Award is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable supply orders.`,
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 59,
        detectedOn: "2026-08-04",
        vendorIds: [V.harrow],
        tenderIds: [tender.id],
        caseId: "INV-2026-0045",
        metrics: [
          { label: "Award value", value: formatCr(tender.awardValue ?? 0) },
          { label: "Comparable median", value: formatCr(stats.median) },
          { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
          { label: "Kits supplied", value: "1,240" },
          { label: "Price per kit", value: "₹9,032" },
        ],
        comparison: {
          label: "Contract value",
          current: stats.current,
          baseline: stats.median,
          unit: "INR",
          baselineLabel: "Comparable median",
        },
        explanation: "The order is priced above comparable subsidy-scheme supply orders in the same period.",
        context:
          "Kit specifications vary by crop and plot size. Without line-item data, per-kit comparison is indicative only.",
        alternatives: [
          "Larger plot specification with more emitters per kit",
          "Inclusion of installation and farmer training",
          "Transport to remote blocks",
        ],
        reasoning: "Comparison against awarded supply orders in the same category and period.",
        dataCoverage: "Line-item detail is missing for 6 of the comparable orders; confidence is medium.",
        recommendedAction: "Obtain the kit specification and compare emitter counts per kit.",
        actionLabel: "View comparable procurement",
        evidenceIds: [tender.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0032 · Reagents rate contract -------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-00988")!;
    const stats = comparableStats(tender);
    return [
      makeSignal({
        id: "SIG-2026-0109",
        type: "VENDOR_CONCENTRATION",
        title: "One supplier holds most of a category",
        headline: `${pct(KESTREL_SHARE.sharePct)} of medical supplies by value sit with one supplier.`,
        severity: "HIGH",
        confidence: "HIGH",
        strength: 73,
        detectedOn: "2026-03-04",
        vendorIds: [V.kestrel],
        tenderIds: [tender.id],
        caseId: "INV-2026-0032",
        metrics: [
          { label: "Share by value", value: pct(KESTREL_SHARE.sharePct) },
          { label: "Contracts", value: `${KESTREL_SHARE.contracts} of ${KESTREL_SHARE.groupContracts}` },
          { label: "Value held", value: formatCr(KESTREL_SHARE.value) },
          { label: "Category value", value: formatCr(KESTREL_SHARE.groupValue) },
        ],
        comparison: {
          label: "Category share",
          current: KESTREL_SHARE.sharePct,
          baseline: 100 / Math.max(1, KESTREL_SHARE.groupContracts / 6),
          unit: "PCT",
          baselineLabel: "Even split across active suppliers",
        },
        explanation:
          "A single supplier holds the majority of medical supply awards by value in this department across the analysis window.",
        context:
          "High concentration can be legitimate in specialized markets. This system therefore combines concentration with other signals rather than treating it as suspicious on its own.",
        alternatives: [
          "Few suppliers hold the required cold-chain and licensing capability",
          "A rate contract concentrates volume by design",
          "Other suppliers failed technical qualification",
        ],
        reasoning:
          "Share is computed by value across all awarded contracts in the department and category; no inference is drawn from share alone.",
        dataCoverage: "Award records are complete for the window.",
        recommendedAction:
          "Review qualification criteria and how many suppliers cleared the technical stage in the last three tenders.",
        actionLabel: "Open vendor concentration",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0110",
        type: "PRICE_OUTLIER",
        title: "Rate contract above comparable median",
        headline: `Rate contract value is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable procurements.`,
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 51,
        detectedOn: "2026-03-04",
        vendorIds: [V.kestrel],
        tenderIds: [tender.id],
        caseId: "INV-2026-0032",
        metrics: [
          { label: "Contract value", value: formatCr(tender.awardValue ?? 0) },
          { label: "Comparable median", value: formatCr(stats.median) },
          { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
        ],
        explanation: "The annual rate contract is priced above comparable supply arrangements.",
        context: "Rate contracts bundle many line items; a single headline value is a coarse comparison.",
        alternatives: ["A wider basket of reagents than comparable contracts", "Guaranteed delivery windows"],
        reasoning: "Headline value comparison only; line items are not available.",
        dataCoverage: "Line-item schedules are not included in this dataset, so confidence is medium.",
        recommendedAction: "Compare the reagent basket line by line with the previous year's contract.",
        actionLabel: "View comparable procurement",
        evidenceIds: [tender.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0046 · Pipeline timing --------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-04020")!;
    return [
      makeSignal({
        id: "SIG-2026-0163",
        type: "TIMING_ANOMALY",
        title: "Award issued the day after evaluation",
        headline: "Evaluation and award were recorded on consecutive days, against a 24-day median.",
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 56,
        detectedOn: "2026-08-08",
        vendorIds: [V.tunga],
        tenderIds: [tender.id],
        caseId: "INV-2026-0046",
        metrics: [
          { label: "Deadline to award", value: "2 days" },
          { label: "Category median", value: "24 days" },
          { label: "Evaluation to award", value: "1 day" },
          { label: "Bids received", value: "3" },
        ],
        explanation:
          "The gap between bid opening, evaluation and award is far shorter than comparable water works procurements.",
        context:
          "Fast awards are not irregular. Pre-monsoon deadlines and standing evaluation committees compress timelines legitimately.",
        alternatives: [
          "Pre-monsoon completion deadline",
          "Evaluation committee met before the deadline closed",
          "Small bidder field with straightforward evaluation",
        ],
        reasoning: "Intervals are compared with the median across the same category in the dataset.",
        dataCoverage: "Dates are complete for the tender file.",
        recommendedAction: "Read the evaluation committee minutes and confirm the meeting date.",
        actionLabel: "Open timeline",
        evidenceIds: [tender.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0038 · Fleet payments ---------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2025-03302")!;
    const contract = CONTRACT_BY_TENDER.get(tender.id)!;
    const payments = PAYMENTS_BY_CONTRACT.get(contract.id) ?? [];
    const duplicates = payments.filter((p) => p.flagged);
    return [
      makeSignal({
        id: "SIG-2026-0125",
        type: "PAYMENT_PATTERN",
        title: "Invoices in round amounts",
        headline: `${payments.length} of ${payments.length} invoices are exact round sums.`,
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 58,
        detectedOn: "2026-08-30",
        vendorIds: [V.corvid],
        tenderIds: [tender.id],
        caseId: "INV-2026-0038",
        metrics: [
          { label: "Invoices", value: String(payments.length) },
          { label: "Round amounts", value: `${payments.length} of ${payments.length}` },
          { label: "Total paid", value: formatINR(contract.paidToDate) },
          { label: "Comparable contracts with round sums", value: "3%" },
        ],
        explanation:
          "Every claim under this service contract is an exact round figure, unlike comparable maintenance contracts where amounts follow measured work.",
        context:
          "Round sums are normal where a contract is priced as a fixed monthly or quarterly fee rather than measured work.",
        alternatives: ["A fixed quarterly fee structure", "Lump-sum milestones agreed in the contract"],
        reasoning: "Amounts are tested for exact divisibility and compared against the category's payment profile.",
        dataCoverage: "Invoice records are complete; the contract's fee schedule is not in the dataset.",
        recommendedAction: "Check the contract's payment schedule — a fixed fee would explain this pattern.",
        actionLabel: "Open payment records",
        evidenceIds: [contract.id],
      }),
      makeSignal({
        id: "SIG-2026-0126",
        type: "PAYMENT_PATTERN",
        title: "Invoice number reused",
        headline: "Two claims two months apart carry the same invoice number.",
        severity: "CRITICAL",
        confidence: "HIGH",
        strength: 79,
        detectedOn: "2026-08-30",
        vendorIds: [V.corvid],
        tenderIds: [tender.id],
        caseId: "INV-2026-0038",
        metrics: [
          { label: "Duplicate invoice numbers", value: String(Math.max(1, duplicates.length)) },
          { label: "Invoice number", value: duplicates[0]?.invoiceNo ?? "CFS/2026/0418" },
          { label: "Value involved", value: formatINR(duplicates.reduce((s, p) => s + p.amount, 0) || 400_000) },
        ],
        explanation:
          "The same invoice number appears against two separate payments. Either a claim was recorded twice or the supplier's numbering repeated.",
        context:
          "Duplicate numbering is often a data-entry issue. It matters because the second claim was paid.",
        alternatives: ["Clerical re-use of a number in the supplier's own system", "Data entry error at the treasury"],
        reasoning: "Exact match on invoice number within the same contract with different payment dates.",
        dataCoverage: "Invoice register is complete; scanned invoices are not available.",
        recommendedAction: "Retrieve both invoices and confirm the work claimed in each.",
        actionLabel: "Open payment records",
        evidenceIds: [contract.id],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0043 · Kitchen equipment ------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-03110")!;
    const pairTenders = [...PAIR_TENDER_IDS, tender.id];
    return [
      makeSignal({
        id: "SIG-2026-0149",
        type: "PARTICIPATION_PATTERN",
        title: "The same two suppliers are the entire field",
        headline: `Two suppliers are the only bidders in ${pairTenders.length} of ${pairTenders.length} kitchen equipment tenders.`,
        severity: "MEDIUM",
        confidence: "HIGH",
        strength: 63,
        detectedOn: "2026-07-01",
        vendorIds: [V.hearth, V.pantry],
        tenderIds: pairTenders,
        caseId: "INV-2026-0043",
        metrics: [
          { label: "Tenders", value: String(pairTenders.length) },
          { label: "Bidders in each", value: "2" },
          { label: "Wins split", value: "3 / 2 (+1 current)" },
          { label: "Window", value: "Feb 2025 – Jun 2026" },
        ],
        explanation:
          "Every tender in this category over eighteen months drew exactly the same two bidders, who alternate as winner.",
        context:
          "School kitchen equipment is a small market. A two-supplier field may reflect the size of the market rather than an arrangement.",
        alternatives: [
          "A genuinely small regional supplier base",
          "Specification favors fabricators with steam-unit experience",
        ],
        reasoning: "Bidder fields are read from the bid register across the category and district.",
        dataCoverage: "Bid registers are complete for all six tenders.",
        recommendedAction: "Check whether the tender was advertised beyond the district supplier list.",
        actionLabel: "View participation matrix",
        evidenceIds: pairTenders,
      }),
      makeSignal({
        id: "SIG-2026-0150",
        type: "SHARED_ENTITY",
        title: "Both suppliers list one contact number",
        headline: "Bid covering letters from both suppliers carry the same phone number.",
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 55,
        detectedOn: "2026-07-01",
        vendorIds: [V.hearth, V.pantry],
        tenderIds: [tender.id],
        caseId: "INV-2026-0043",
        metrics: [
          { label: "Relationship", value: "Shared contact number" },
          { label: "Evidence records", value: "2" },
          { label: "Joint tenders", value: String(pairTenders.length) },
        ],
        explanation: "The only two bidders in this category share a contact number on their covering letters.",
        context: "A shared number alongside a two-supplier field is a stronger lead than either fact alone.",
        alternatives: ["A shared fabrication unit", "One family running both firms with disclosure"],
        reasoning: "String match on covering letters in the bid files.",
        dataCoverage: "Covering letters are on file for both suppliers.",
        recommendedAction: "Ask both suppliers to confirm their contact persons and premises.",
        actionLabel: "Open relationship graph",
        evidenceIds: ["BID-COV-4471", "REL-0009"],
      }),
    ];
  })(),

  /* ---------------- INV-2026-0040 · PHC renovation ---------------- */
  ...(() => {
    const tender = TENDER_BY_ID.get("TND-2026-02155")!;
    const stats = comparableStats(tender);
    return [
      makeSignal({
        id: "SIG-2026-0116",
        type: "PRICE_OUTLIER",
        title: "Renovation priced above comparable work",
        headline: `Award is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable building works.`,
        severity: "MEDIUM",
        confidence: "MEDIUM",
        strength: 50,
        detectedOn: "2026-05-14",
        vendorIds: [V.apex],
        tenderIds: [tender.id],
        caseId: "INV-2026-0040",
        metrics: [
          { label: "Award value", value: formatCr(tender.awardValue ?? 0) },
          { label: "Comparable median", value: formatCr(stats.median) },
          { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
          { label: "Comparable procurements", value: String(stats.count) },
        ],
        comparison: {
          label: "Contract value",
          current: stats.current,
          baseline: stats.median,
          unit: "INR",
          baselineLabel: "Comparable median",
        },
        explanation: "The renovation package is priced above comparable building works of similar size.",
        context: "Health facility renovation carries infection-control requirements absent from other building work.",
        alternatives: ["Infection-control and phased-working requirements", "Occupied-site working restrictions"],
        reasoning: "Comparison against awarded building works in the same size band and period.",
        dataCoverage: "Complete price records for the comparable set.",
        recommendedAction: "Compare the scope schedule with two comparable renovation packages.",
        actionLabel: "View comparable procurement",
        evidenceIds: [tender.id],
      }),
      makeSignal({
        id: "SIG-2026-0117",
        type: "REPEATED_AWARDS",
        title: "Repeat awards to a coastal contractor",
        headline: `${APEX_BUILDING.length + 2} awards to one contractor across coastal building and road work.`,
        severity: "LOW",
        confidence: "MEDIUM",
        strength: 42,
        detectedOn: "2026-05-14",
        vendorIds: [V.apex],
        tenderIds: [tender.id],
        caseId: "INV-2026-0040",
        metrics: [
          { label: "Awards", value: String(APEX_BUILDING.length + 2) },
          { label: "Region", value: "Coastal Karnataka" },
          { label: "Also in", value: "Coastal maintenance program" },
        ],
        explanation:
          "The contractor holds awards across two categories in the same region and appears in the coastal maintenance program under investigation.",
        context: "Two categories with a shared workforce is ordinary for a Class I civil contractor.",
        alternatives: ["A contractor qualified in both categories", "Local presence reduces mobilization cost"],
        reasoning: "Counts are taken from award records by vendor, region and category.",
        dataCoverage: "Award records are complete.",
        recommendedAction: "Cross-reference with the coastal maintenance case before acting.",
        actionLabel: "Review award history",
        evidenceIds: [tender.id],
      }),
    ];
  })(),
];

/* ------------------------------------------------------------------ */
/* Detected signals — computed directly from the record set            */
/* ------------------------------------------------------------------ */

const generatedAwarded = AWARDED_TENDERS.filter((t) => !t.story);

function detectPriceOutliers(count: number): AnomalySignal[] {
  const candidates = generatedAwarded
    .map((tender) => ({ tender, stats: comparableStats(tender) }))
    .filter((c) => c.stats.count >= 12 && c.stats.deviationPct >= 24 && c.stats.deviationPct <= 68)
    .sort((a, b) => b.stats.deviationPct - a.stats.deviationPct);

  const picked: typeof candidates = [];
  const perCategory = new Map<string, number>();
  for (const candidate of candidates) {
    const used = perCategory.get(candidate.tender.categoryId) ?? 0;
    if (used >= 2) continue;
    perCategory.set(candidate.tender.categoryId, used + 1);
    picked.push(candidate);
    if (picked.length === count) break;
  }

  return picked.map(({ tender, stats }, index) =>
    makeSignal({
      id: `SIG-2026-02${String(11 + index).padStart(2, "0")}`,
      type: "PRICE_OUTLIER",
      title: "Award above comparable median",
      headline: `Award is ${formatPct(stats.deviationPct, 1, true)} against ${stats.count} comparable procurements.`,
      severity: stats.deviationPct >= 55 ? "HIGH" : "MEDIUM",
      confidence: stats.count >= 16 ? "HIGH" : "MEDIUM",
      strength: Math.round(Math.min(88, 34 + stats.deviationPct)),
      detectedOn: "2026-09-15",
      vendorIds: [tender.winnerVendorId!],
      tenderIds: [tender.id],
      metrics: [
        { label: "Award value", value: formatINR(stats.current) },
        { label: "Comparable median", value: formatINR(stats.median) },
        { label: "Deviation", value: formatPct(stats.deviationPct, 1, true) },
        { label: "Comparable procurements", value: String(stats.count) },
        { label: "Interquartile range", value: `${formatINR(stats.p25)} – ${formatINR(stats.p75)}` },
      ],
      comparison: {
        label: "Contract value",
        current: stats.current,
        baseline: stats.median,
        unit: "INR",
        baselineLabel: "Comparable median",
      },
      explanation:
        "The award sits above the median of comparable procurements matched on category, size band and an 18-month window.",
      context:
        "No context adjustment has been applied yet. Scope, specification and regional cost differences are the usual explanations at this level of deviation.",
      alternatives: [
        "A larger or more complex scope than the comparable set",
        "Regional cost differences within the same category",
        "Specification changes between comparable procurements",
      ],
      reasoning: "Measured against the median of the comparable set, with the interquartile range shown alongside.",
      dataCoverage: `${stats.count} comparable awards with complete price records.`,
      recommendedAction: "Check the scope schedule against two comparable procurements before escalating.",
      actionLabel: "View comparable procurement",
      evidenceIds: [tender.id],
    }),
  );
}

function detectCloseBids(count: number): AnomalySignal[] {
  const candidates = generatedAwarded
    .map((tender) => ({ tender, spread: bidSpread(tender.id) ?? 99, bids: BIDS_BY_TENDER.get(tender.id)?.length ?? 0 }))
    .filter((c) => c.bids >= 3 && c.spread < 4)
    .sort((a, b) => a.spread - b.spread)
    .slice(0, count);

  return candidates.map(({ tender, spread, bids }, index) => {
    const comparable = medianComparableSpread(tender) ?? 0;
    return makeSignal({
      id: `SIG-2026-02${String(31 + index).padStart(2, "0")}`,
      type: "CLOSE_BIDS",
      title: "Bids closer than comparable procurements",
      headline: `Bid spread of ${pct(spread, 2)} against a comparable median of ${pct(comparable, 1)}.`,
      severity: spread < 2.45 ? "HIGH" : "MEDIUM",
      confidence: "HIGH",
      strength: Math.round(72 - spread * 6),
      detectedOn: "2026-09-15",
      vendorIds: (BIDS_BY_TENDER.get(tender.id) ?? []).map((b) => b.vendorId),
      tenderIds: [tender.id],
      metrics: [
        { label: "Bid spread", value: pct(spread, 2) },
        { label: "Comparable median spread", value: pct(comparable, 1) },
        { label: "Bids received", value: String(bids) },
        { label: "Award value", value: formatINR(tender.awardValue ?? 0) },
      ],
      comparison: {
        label: "Bid spread",
        current: spread,
        baseline: comparable,
        unit: "PCT",
        baselineLabel: "Comparable median",
      },
      explanation: "Submitted bids sit closer together than comparable procurements in the same category.",
      context:
        "Tight clustering is expected where a published schedule of rates governs pricing; that applies to much of this category.",
      alternatives: [
        "A published schedule of rates anchors every bid",
        "Standard quantities produce similar estimates",
        "A small qualified-bidder pool",
      ],
      reasoning: "Spread is measured across submitted bids and compared with the comparable set for the same tender.",
      dataCoverage: "Bid amounts are complete for this tender.",
      recommendedAction: "Look at the bidder set's history before treating closeness as meaningful.",
      actionLabel: "Open bid analysis",
      evidenceIds: [tender.id],
    });
  });
}

function detectConcentration(count: number): AnomalySignal[] {
  const groups = new Map<string, { value: number; contracts: number; byVendor: Map<string, number> }>();
  for (const contract of CONTRACTS) {
    const key = `${contract.departmentId}|${contract.categoryId}`;
    const entry = groups.get(key) ?? { value: 0, contracts: 0, byVendor: new Map() };
    entry.value += contract.value;
    entry.contracts += 1;
    entry.byVendor.set(contract.vendorId, (entry.byVendor.get(contract.vendorId) ?? 0) + contract.value);
    groups.set(key, entry);
  }

  const candidates = [...groups.entries()]
    .filter(([key, entry]) => entry.contracts >= 8 && key !== "hfw|medsup" && key !== "hfw|medeq")
    .map(([key, entry]) => {
      const [vendorId, value] = [...entry.byVendor.entries()].sort((a, b) => b[1] - a[1])[0];
      return { key, entry, vendorId, sharePct: (value / entry.value) * 100, value };
    })
    .filter((c) => c.sharePct >= 30)
    .sort((a, b) => b.sharePct - a.sharePct)
    .slice(0, count);

  return candidates.map((c, index) => {
    const [departmentId, categoryId] = c.key.split("|");
    const tender = CONTRACTS.find((x) => x.vendorId === c.vendorId && x.departmentId === departmentId)!;
    return makeSignal({
      id: `SIG-2026-02${String(41 + index).padStart(2, "0")}`,
      type: "VENDOR_CONCENTRATION",
      title: "Category concentrated in one vendor",
      headline: `${pct(c.sharePct)} of this category's value sits with a single vendor.`,
      severity: c.sharePct >= 45 ? "MEDIUM" : "LOW",
      confidence: "HIGH",
      strength: Math.round(30 + c.sharePct / 2),
      detectedOn: "2026-09-15",
      vendorIds: [c.vendorId],
      tenderIds: [tender.tenderId],
      metrics: [
        { label: "Share by value", value: pct(c.sharePct) },
        { label: "Category value", value: formatCr(c.entry.value) },
        { label: "Contracts in category", value: String(c.entry.contracts) },
        { label: "Active vendors", value: String(c.entry.byVendor.size) },
      ],
      explanation: "One vendor holds a disproportionate share of awards by value in this department and category.",
      context:
        "Concentration alone is a weak signal. It is reported so that it can be combined with price, bidding and relationship evidence.",
      alternatives: [
        "A specialized market with few qualified vendors",
        "A framework or rate contract that concentrates volume",
        "Geography — one vendor covers the region",
      ],
      reasoning: "Share is computed by value across awarded contracts in the department and category.",
      dataCoverage: "Award records are complete for the analysis window.",
      recommendedAction: "Check how many vendors cleared technical qualification in recent tenders.",
      actionLabel: "Open vendor concentration",
      evidenceIds: [tender.tenderId],
    });
  });
}

function detectShortWindows(count: number): AnomalySignal[] {
  const candidates = generatedAwarded
    .filter((t) => (t.awardValue ?? 0) > 5_000_000)
    .map((tender) => ({ tender, days: bidWindowDays(tender) }))
    .sort((a, b) => a.days - b.days || (b.tender.awardValue ?? 0) - (a.tender.awardValue ?? 0))
    .slice(0, count);

  return candidates.map(({ tender, days }, index) =>
    makeSignal({
      id: `SIG-2026-02${String(51 + index).padStart(2, "0")}`,
      type: "TIMING_ANOMALY",
      title: "Bid window shorter than the norm",
      headline: `${days}-day bid window on an award of ${formatINR(tender.awardValue ?? 0)}.`,
      severity: "MEDIUM",
      confidence: "HIGH",
      strength: 53,
      detectedOn: "2026-09-15",
      vendorIds: [tender.winnerVendorId!],
      tenderIds: [tender.id],
      metrics: [
        { label: "Bid window", value: `${days} days` },
        { label: "Dataset median", value: "21 days" },
        { label: "Award value", value: formatINR(tender.awardValue ?? 0) },
        { label: "Bids received", value: String(tender.bidIds.length) },
      ],
      explanation: "The window between publication and the bid deadline is materially shorter than the norm.",
      context: "Urgency, re-tendering and seasonal deadlines all shorten windows legitimately.",
      alternatives: ["Re-tender after an earlier failure", "Seasonal or weather deadline", "Emergency sanction"],
      reasoning: "Window length compared with the median across the dataset.",
      dataCoverage: "Publication and deadline dates are complete.",
      recommendedAction: "Read the approval note for the shortened window.",
      actionLabel: "Open timeline",
      evidenceIds: [tender.id],
    }),
  );
}

function detectSplitting(): AnomalySignal[] {
  const groups = [
    { ids: HARROW_SPLIT_IDS, vendorId: V.harrow, id: "SIG-2026-0171" },
    { ids: SUNRISE_SPLIT_IDS, vendorId: V.sunrise, id: "SIG-2026-0172" },
  ];

  return groups.map(({ ids, vendorId, id }) => {
    const tenders = ids.map((t) => TENDER_BY_ID.get(t)!);
    const total = tenders.reduce((s, t) => s + (t.awardValue ?? 0), 0);
    const span = tenders.map((t) => t.awardedOn!).sort();
    return makeSignal({
      id,
      type: "CONTRACT_SPLITTING",
      title: "Consecutive purchases below the threshold",
      headline: `${tenders.length} direct purchases to one supplier, together ${formatINR(total)}.`,
      severity: "MEDIUM",
      confidence: "HIGH",
      strength: 64,
      detectedOn: "2026-09-15",
      vendorIds: [vendorId],
      tenderIds: tenders.map((t) => t.id),
      metrics: [
        { label: "Purchases", value: String(tenders.length) },
        { label: "Window", value: `${formatDate(span[0])} – ${formatDate(span[span.length - 1])}` },
        { label: "Each below", value: "₹25.00 L" },
        { label: "Combined value", value: formatINR(total) },
      ],
      explanation:
        "Purchases of the same category to the same supplier sit just below the delegated threshold and cluster inside a short window.",
      context: "Separate indents and staggered budget releases produce the same pattern without any intent to split.",
      alternatives: ["Separate block-level indents", "Budget released in tranches", "Replacement of damaged stock"],
      reasoning: "Grouped by supplier, department and category inside a 45-day window; compared with the threshold.",
      dataCoverage: "Purchase orders are complete for the group.",
      recommendedAction: "Check the indents and whether consolidation was considered.",
      actionLabel: "View purchase orders",
      evidenceIds: tenders.map((t) => t.id),
    });
  });
}

const DETECTED = [
  ...detectPriceOutliers(8),
  ...detectCloseBids(4),
  ...detectConcentration(1),
  ...detectShortWindows(1),
  ...detectSplitting(),
];

/** Detected signals an investigator has already pulled into a case. */
const CASE_LINKS: Record<string, string> = {
  "SIG-2026-0171": "INV-2026-0045",
};

export const SIGNALS: AnomalySignal[] = [...AUTHORED, ...DETECTED]
  .map((signal) => (CASE_LINKS[signal.id] ? { ...signal, caseId: CASE_LINKS[signal.id] } : signal))
  .sort((a, b) => b.strength - a.strength);

export const SIGNAL_BY_ID = new Map(SIGNALS.map((s) => [s.id, s]));

export function signalsForCase(caseId: string) {
  return SIGNALS.filter((s) => s.caseId === caseId);
}

export function signalsForTender(tenderId: string) {
  return SIGNALS.filter((s) => s.tenderIds.includes(tenderId));
}

export function signalsForVendor(vendorId: string) {
  return SIGNALS.filter((s) => s.vendorIds.includes(vendorId));
}

export function signalCountsByCategory(signals: AnomalySignal[] = SIGNALS) {
  const counts = {} as Record<SignalCategory, number>;
  for (const signal of signals) counts[signal.category] = (counts[signal.category] ?? 0) + 1;
  return counts;
}

export const UNASSIGNED_SIGNALS = SIGNALS.filter((s) => !s.caseId);
