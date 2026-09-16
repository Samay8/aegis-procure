import { addDays, daysBetween, monthKey } from "@/lib/format";
import { mean, median, sum } from "@/lib/utils";
import type {
  CategoryId,
  Contract,
  DepartmentId,
  InvestigationOutcome,
  PriorityLevel,
  RegionId,
  SignalCategory,
  Tender,
} from "@/types";
import { CASES, CLOSED_CASES, ACTIVE_CASES, baseScore } from "./cases";
import {
  AWARDED_TENDERS,
  BIDS,
  BIDS_BY_TENDER,
  BIDS_BY_VENDOR,
  CONTRACTS,
  CONTRACTS_BY_VENDOR,
  PAYMENTS,
  TENDERS,
  TENDER_BY_ID,
  TOTAL_EVENTS,
  TOTAL_VALUE,
  bidSpread,
  tendersForVendor,
} from "./procurement";
import { CATEGORIES, DEPARTMENTS, REGIONS, REGION_BY_ID, SIGNAL_CATEGORY_ORDER, levelFromScore } from "./reference";
import { RELATIONSHIPS, relationshipsForVendor } from "./relationships";
import { SIGNALS, signalsForVendor } from "./signals";
import { VENDORS, VENDOR_BY_ID } from "./vendors";

/* ------------------------------------------------------------------ */
/* Headline figures                                                    */
/* ------------------------------------------------------------------ */

export const PLATFORM = {
  events: TOTAL_EVENTS,
  value: TOTAL_VALUE,
  vendors: VENDORS.length,
  contracts: CONTRACTS.length,
  tenders: TENDERS.length,
  bids: BIDS.length,
  payments: PAYMENTS.length,
  signals: SIGNALS.length,
  activeInvestigations: ACTIVE_CASES.length,
  relationships: RELATIONSHIPS.length,
  activeVendors: new Set(BIDS.map((b) => b.vendorId)).size,
};

/* ------------------------------------------------------------------ */
/* Months                                                              */
/* ------------------------------------------------------------------ */

export function monthRange(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export const TREND_MONTHS = monthRange("2025-04", "2026-09");

/**
 * Signal history. Months before today's run come from the review archive;
 * the open queue is the 47 signals in the dataset.
 */
const RAISED = [11, 13, 12, 16, 14, 18, 15, 17, 16, 19, 21, 18, 20, 22, 19, 24, 23, 31];
/** Share of reviewed signals closed as "explained by context" — falls once context checks run first (May 2026). */
const EXPLAINED_SHARE = [0.44, 0.41, 0.43, 0.4, 0.42, 0.39, 0.41, 0.4, 0.42, 0.38, 0.4, 0.39, 0.3, 0.25, 0.23, 0.22, 0.21, 0.2];

export const SIGNAL_TREND = TREND_MONTHS.map((month, index) => {
  const raised = RAISED[index];
  const explained = Math.round(raised * EXPLAINED_SHARE[index]);
  const escalated = Math.max(1, Math.round(raised * (index >= 13 ? 0.21 : 0.13)));
  return {
    month: `${month}-01`,
    raised,
    explained,
    escalated,
    contextChecked: index >= 13,
  };
});

export const SIGNAL_ARCHIVE = {
  raised: sum(RAISED),
  open: SIGNALS.length,
  reviewed: sum(RAISED) - SIGNALS.length,
  explainedByContext: 118,
  noIssueFound: 96,
  needsMoreReview: 41,
  referredForAudit: 27,
  explainedShareBefore: 41,
  explainedShareAfter: 22,
};

export const OUTCOME_TOTALS: { outcome: InvestigationOutcome; count: number }[] = [
  { outcome: "EXPLAINED_BY_CONTEXT", count: SIGNAL_ARCHIVE.explainedByContext },
  { outcome: "NO_ISSUE_FOUND", count: SIGNAL_ARCHIVE.noIssueFound },
  { outcome: "NEEDS_MORE_REVIEW", count: SIGNAL_ARCHIVE.needsMoreReview },
  { outcome: "REFERRED_FOR_AUDIT", count: SIGNAL_ARCHIVE.referredForAudit },
];

/** Procurement activity by month over the same window. */
export const ACTIVITY_TREND = TREND_MONTHS.map((month) => {
  const published = TENDERS.filter((t) => monthKey(t.publishedOn) === month);
  const awarded = AWARDED_TENDERS.filter((t) => t.awardedOn && monthKey(t.awardedOn) === month);
  const spreads = awarded.map((t) => bidSpread(t.id)).filter((s): s is number => s != null);
  return {
    month: `${month}-01`,
    tenders: published.length,
    awards: awarded.length,
    valueCr: Number((sum(awarded.map((t) => t.awardValue ?? 0)) / 1e7).toFixed(2)),
    avgSpread: spreads.length ? Number(mean(spreads).toFixed(2)) : 0,
  };
});

/** Quarterly vendor concentration (Herfindahl–Hirschman index on award value). */
export const CONCENTRATION_TREND = (() => {
  const quarters = ["2024-Q2", "2024-Q3", "2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"];
  return quarters.map((q) => {
    const [y, qq] = q.split("-Q").map(Number);
    const startMonth = (qq - 1) * 3 + 1;
    const contracts = CONTRACTS.filter((c) => {
      const t = TENDER_BY_ID.get(c.tenderId)!;
      const [ay, am] = (t.awardedOn ?? "").split("-").map(Number);
      return ay === y && am >= startMonth && am < startMonth + 3;
    });
    return { quarter: q.replace("-", " "), hhi: Math.round(hhi(contracts)), contracts: contracts.length };
  });
})();

function hhi(contracts: Contract[]) {
  const total = sum(contracts.map((c) => c.value));
  if (!total) return 0;
  const byVendor = new Map<string, number>();
  for (const c of contracts) byVendor.set(c.vendorId, (byVendor.get(c.vendorId) ?? 0) + c.value);
  return sum([...byVendor.values()].map((v) => Math.pow((v / total) * 100, 2)));
}

/* ------------------------------------------------------------------ */
/* Priority distributions                                              */
/* ------------------------------------------------------------------ */

export const SIGNAL_SEVERITY = (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as PriorityLevel[]).map((level) => ({
  level,
  count: SIGNALS.filter((s) => s.severity === level).length,
}));

export const CASE_PRIORITY = (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as PriorityLevel[]).map((level) => ({
  level,
  count: ACTIVE_CASES.filter((c) => levelFromScore(baseScore(c)) === level).length,
}));

export const SIGNAL_CATEGORY_COUNTS = SIGNAL_CATEGORY_ORDER.map((category) => ({
  category,
  count: SIGNALS.filter((s) => s.category === category).length,
}));

/* ------------------------------------------------------------------ */
/* Departments, categories, geography                                  */
/* ------------------------------------------------------------------ */

function topShare(contracts: Contract[], n = 1) {
  const total = sum(contracts.map((c) => c.value));
  const byVendor = new Map<string, number>();
  for (const c of contracts) byVendor.set(c.vendorId, (byVendor.get(c.vendorId) ?? 0) + c.value);
  const sorted = [...byVendor.entries()].sort((a, b) => b[1] - a[1]);
  return {
    share: total ? (sum(sorted.slice(0, n).map(([, v]) => v)) / total) * 100 : 0,
    topVendorId: sorted[0]?.[0],
    vendors: byVendor.size,
  };
}

export interface DepartmentStat {
  id: DepartmentId;
  name: string;
  short: string;
  tenders: number;
  contracts: number;
  value: number;
  averageContract: number;
  top3Share: number;
  vendors: number;
  signals: number;
  anomalyRate: number;
  activeCases: number;
  topVendorId?: string;
}

export const DEPARTMENT_STATS: DepartmentStat[] = DEPARTMENTS.map((d) => {
  const tenders = TENDERS.filter((t) => t.departmentId === d.id);
  const contracts = CONTRACTS.filter((c) => c.departmentId === d.id);
  const value = sum(contracts.map((c) => c.value));
  const signals = SIGNALS.filter((s) => s.departmentId === d.id).length;
  const share = topShare(contracts, 3);
  return {
    id: d.id,
    name: d.name,
    short: d.short,
    tenders: tenders.length,
    contracts: contracts.length,
    value,
    averageContract: contracts.length ? value / contracts.length : 0,
    top3Share: share.share,
    vendors: share.vendors,
    signals,
    anomalyRate: contracts.length ? (signals / contracts.length) * 100 : 0,
    activeCases: ACTIVE_CASES.filter((c) => c.departmentId === d.id).length,
    topVendorId: share.topVendorId,
  };
}).sort((a, b) => b.value - a.value);

export interface CategoryStat {
  id: CategoryId;
  name: string;
  spend: number;
  contracts: number;
  vendors: number;
  averagePrice: number;
  priceVariance: number;
  signals: number;
  top3Share: number;
}

export const CATEGORY_STATS: CategoryStat[] = CATEGORIES.map((c) => {
  const contracts = CONTRACTS.filter((x) => x.categoryId === c.id);
  const values = contracts.map((x) => x.value);
  const avg = mean(values);
  const sd = Math.sqrt(mean(values.map((v) => Math.pow(v - avg, 2))));
  return {
    id: c.id,
    name: c.name,
    spend: sum(values),
    contracts: contracts.length,
    vendors: new Set(contracts.map((x) => x.vendorId)).size,
    averagePrice: avg,
    priceVariance: avg ? (sd / avg) * 100 : 0,
    signals: SIGNALS.filter((s) => s.categoryId === c.id).length,
    top3Share: topShare(contracts, 3).share,
  };
}).sort((a, b) => b.spend - a.spend);

/** Zone for any tender: explicit on zone packages, otherwise its town's position in the region. */
export function zoneOf(tender: Tender) {
  if (tender.zone) return Number(tender.zone.replace(/\D/g, "")) || 1;
  const region = REGION_BY_ID[tender.regionId];
  const index = region.towns.indexOf(tender.location);
  return Math.min(region.zones, Math.max(1, index + 1));
}

export interface ZoneStat {
  regionId: RegionId;
  zone: number;
  tenders: number;
  value: number;
  signals: number;
  signalDensity: number;
}

export const ZONE_STATS: ZoneStat[] = REGIONS.flatMap((region) =>
  Array.from({ length: region.zones }, (_, i) => {
    const zone = i + 1;
    const tenders = TENDERS.filter((t) => t.regionId === region.id && zoneOf(t) === zone);
    const ids = new Set(tenders.map((t) => t.id));
    const value = sum(tenders.map((t) => t.awardValue ?? 0));
    const signals = SIGNALS.filter((s) => s.tenderIds.some((id) => ids.has(id))).length;
    const awarded = tenders.filter((t) => t.awardValue).length;
    return {
      regionId: region.id,
      zone,
      tenders: tenders.length,
      value,
      signals,
      signalDensity: awarded ? (signals / awarded) * 100 : 0,
    };
  }),
);

export const REGION_STATS = REGIONS.map((region) => {
  const zones = ZONE_STATS.filter((z) => z.regionId === region.id);
  const contracts = CONTRACTS.filter((c) => c.regionId === region.id);
  return {
    id: region.id,
    name: region.name,
    tenders: sum(zones.map((z) => z.tenders)),
    value: sum(zones.map((z) => z.value)),
    signals: SIGNALS.filter((s) => s.regionId === region.id).length,
    top3Share: topShare(contracts, 3).share,
  };
});

/* ------------------------------------------------------------------ */
/* Who is winning the work?                                            */
/* ------------------------------------------------------------------ */

export const TOP_VENDORS = (() => {
  const byVendor = new Map<string, { value: number; contracts: number }>();
  for (const c of CONTRACTS) {
    const entry = byVendor.get(c.vendorId) ?? { value: 0, contracts: 0 };
    entry.value += c.value;
    entry.contracts += 1;
    byVendor.set(c.vendorId, entry);
  }
  const sorted = [...byVendor.entries()].sort((a, b) => b[1].value - a[1].value);
  const top = sorted.slice(0, 10).map(([vendorId, entry]) => ({
    vendorId,
    name: VENDOR_BY_ID[vendorId]?.name ?? vendorId,
    value: entry.value,
    contracts: entry.contracts,
    share: (entry.value / TOTAL_VALUE) * 100,
  }));
  const othersValue = TOTAL_VALUE - sum(top.map((t) => t.value));
  return {
    top,
    others: { value: othersValue, share: (othersValue / TOTAL_VALUE) * 100, vendors: sorted.length - top.length },
    winningVendors: sorted.length,
    top10Share: (sum(top.map((t) => t.value)) / TOTAL_VALUE) * 100,
  };
})();

export function concentrationBy(dimension: "department" | "region" | "category") {
  const keys =
    dimension === "department"
      ? DEPARTMENTS.map((d) => ({ id: d.id as string, name: d.short }))
      : dimension === "region"
        ? REGIONS.map((r) => ({ id: r.id as string, name: r.short }))
        : CATEGORIES.map((c) => ({ id: c.id as string, name: c.short }));

  return keys
    .map(({ id, name }) => {
      const contracts = CONTRACTS.filter((c) =>
        dimension === "department" ? c.departmentId === id : dimension === "region" ? c.regionId === id : c.categoryId === id,
      );
      const top1 = topShare(contracts, 1);
      return {
        id,
        name,
        topVendorId: top1.topVendorId,
        topShare: top1.share,
        top3Share: topShare(contracts, 3).share,
        hhi: Math.round(hhi(contracts)),
        vendors: top1.vendors,
        contracts: contracts.length,
      };
    })
    .sort((a, b) => b.topShare - a.topShare);
}

/* ------------------------------------------------------------------ */
/* Vendor profiles                                                     */
/* ------------------------------------------------------------------ */

const QUARTERS = ["2024-Q2", "2024-Q3", "2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"];

function quarterOf(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}

export interface VendorProfile {
  vendorId: string;
  participations: number;
  wins: number;
  cancelled: number;
  concluded: number;
  winRate: number;
  contractValue: number;
  departments: DepartmentId[];
  regions: RegionId[];
  categories: CategoryId[];
  signals: number;
  relationships: number;
  cases: string[];
  quarterly: { quarter: string; bids: number; awards: number; valueCr: number; winRate: number | null }[];
  monthly: { month: string; bids: number }[];
  departmentMix: { departmentId: DepartmentId; value: number; contracts: number }[];
  coBidders: { vendorId: string; count: number }[];
  firstBid?: string;
  lastBid?: string;
  averageBid: number;
  averageContract: number;
}

const profileCache = new Map<string, VendorProfile>();

export function vendorProfile(vendorId: string): VendorProfile {
  const cached = profileCache.get(vendorId);
  if (cached) return cached;

  const tenders = tendersForVendor(vendorId);
  const contracts = CONTRACTS_BY_VENDOR.get(vendorId) ?? [];
  const bids = BIDS_BY_VENDOR.get(vendorId) ?? [];
  const cancelled = tenders.filter((t) => t.status === "CANCELLED").length;
  const pending = tenders.filter((t) => t.status === "EVALUATION" || t.status === "OPEN").length;
  const concluded = tenders.length - cancelled - pending;
  const contractValue = sum(contracts.map((c) => c.value));

  // Wins are counted in the quarter the winning bid was submitted, so a quarter never shows more wins than bids.
  // Contract value is counted when it was awarded.
  const wonTenders = new Set(contracts.map((c) => c.tenderId));
  const quarterly = QUARTERS.map((quarter) => {
    const qBids = bids.filter((b) => quarterOf(b.submittedAt) === quarter);
    const qWins = qBids.filter((b) => wonTenders.has(b.tenderId)).length;
    const qAwarded = contracts.filter((c) => quarterOf(TENDER_BY_ID.get(c.tenderId)!.awardedOn ?? "") === quarter);
    return {
      quarter: quarter.replace("-", " "),
      bids: qBids.length,
      awards: qWins,
      valueCr: Number((sum(qAwarded.map((c) => c.value)) / 1e7).toFixed(2)),
      winRate: qBids.length ? Math.round((qWins / qBids.length) * 100) : null,
    };
  });

  const monthly = monthRange("2024-04", "2026-09").map((month) => ({
    month: `${month}-01`,
    bids: bids.filter((b) => monthKey(b.submittedAt) === month).length,
  }));

  const deptMap = new Map<DepartmentId, { value: number; contracts: number }>();
  for (const c of contracts) {
    const entry = deptMap.get(c.departmentId) ?? { value: 0, contracts: 0 };
    entry.value += c.value;
    entry.contracts += 1;
    deptMap.set(c.departmentId, entry);
  }

  const co = new Map<string, number>();
  for (const t of tenders) {
    for (const b of BIDS_BY_TENDER.get(t.id) ?? []) {
      if (b.vendorId !== vendorId) co.set(b.vendorId, (co.get(b.vendorId) ?? 0) + 1);
    }
  }

  const bidDates = bids.map((b) => b.submittedAt).sort();

  const profile: VendorProfile = {
    vendorId,
    participations: tenders.length,
    wins: contracts.length,
    cancelled,
    concluded,
    winRate: concluded ? (contracts.length / concluded) * 100 : 0,
    contractValue,
    departments: [...new Set(contracts.map((c) => c.departmentId))],
    regions: [...new Set(contracts.map((c) => c.regionId))],
    categories: [...new Set(contracts.map((c) => c.categoryId))],
    signals: signalsForVendor(vendorId).length,
    relationships: relationshipsForVendor(vendorId).length,
    cases: CASES.filter((c) => c.vendorId === vendorId || c.relatedVendorIds.includes(vendorId)).map((c) => c.id),
    quarterly,
    monthly,
    departmentMix: [...deptMap.entries()]
      .map(([departmentId, entry]) => ({ departmentId, ...entry }))
      .sort((a, b) => b.value - a.value),
    coBidders: [...co.entries()]
      .map(([id, count]) => ({ vendorId: id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    firstBid: bidDates[0],
    lastBid: bidDates[bidDates.length - 1],
    averageBid: bids.length ? mean(bids.map((b) => b.amount)) : 0,
    averageContract: contracts.length ? contractValue / contracts.length : 0,
  };
  profileCache.set(vendorId, profile);
  return profile;
}

/** Lightweight stats for directory rows (1,284 vendors). */
export const VENDOR_ROWS = VENDORS.map((v) => {
  const bids = BIDS_BY_VENDOR.get(v.id) ?? [];
  const contracts = CONTRACTS_BY_VENDOR.get(v.id) ?? [];
  return {
    vendor: v,
    bids: bids.length,
    wins: contracts.length,
    value: sum(contracts.map((c) => c.value)),
    signals: SIGNALS.filter((s) => s.vendorIds.includes(v.id)).length,
    lastActivity: bids.map((b) => b.submittedAt).sort().pop(),
  };
});

/* ------------------------------------------------------------------ */
/* Payment behavior                                                   */
/* ------------------------------------------------------------------ */

export const PAYMENT_STATS = (() => {
  const days = PAYMENTS.map((p) => p.daysToPay);
  return {
    count: PAYMENTS.length,
    total: sum(PAYMENTS.map((p) => p.amount)),
    medianDays: median(days),
    flagged: PAYMENTS.filter((p) => p.flagged).length,
    uncertified: PAYMENTS.filter((p) => !p.milestoneCertified).length,
    byType: Object.entries(
      PAYMENTS.reduce<Record<string, number>>((acc, p) => {
        acc[p.type] = (acc[p.type] ?? 0) + p.amount;
        return acc;
      }, {}),
    ).map(([type, amount]) => ({ type, amount })),
  };
})();

export const CLOSED_OUTCOMES = CLOSED_CASES.map((c) => ({
  id: c.id,
  title: c.title,
  outcome: c.historical!.outcome,
  closedOn: c.historical!.closedOn,
  note: c.historical!.note,
  score: baseScore(c),
}));

/** Median days from bid deadline to award, per department. */
export const AWARD_INTERVALS = DEPARTMENTS.map((d) => {
  const intervals = AWARDED_TENDERS.filter((t) => t.departmentId === d.id && t.awardedOn).map((t) =>
    daysBetween(t.bidDeadline.slice(0, 10), t.awardedOn!),
  );
  return { departmentId: d.id, median: median(intervals) };
});

export function categoryCountsFor(categories: SignalCategory[]) {
  return SIGNALS.filter((s) => categories.includes(s.category)).length;
}

export const ANALYSIS_TODAY = addDays("2026-09-15", 0);
