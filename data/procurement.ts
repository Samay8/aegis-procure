import { addDays, daysBetween, minuteNumber } from "@/lib/format";
import { createRng, type Rng } from "@/lib/random";
import { clamp, median, percentile } from "@/lib/utils";
import type {
  Bid,
  CategoryId,
  Contract,
  DepartmentId,
  EvaluationMethod,
  Payment,
  PaymentType,
  ProcurementMethod,
  RegionId,
  Tender,
  TenderStatus,
} from "@/types";
import { REGION_BY_ID } from "./reference";
import { CASE_CONTRACT, CASE_TENDER, CLUSTER_VENDORS, STORY_TENDERS, type TenderSeed } from "./story";
import { V, VENDORS, VENDOR_BY_ID } from "./vendors";

export const TODAY = "2026-09-15";
const CR = 10_000_000;
const cr = (value: number) => Math.round(value * CR);

/** Platform totals the overview reports; the builder matches them exactly. */
export const TARGET_TENDERS = 412;
export const TARGET_CONTRACTS = 376;
export const TARGET_VALUE = cr(428.6);
export const TARGET_EVENTS = 10_482;

/* ------------------------------------------------------------------ */
/* Generator configuration                                             */
/* ------------------------------------------------------------------ */

interface CategoryConfig {
  count: number;
  medianCr: number;
  sigma: number;
  bids: [number, number];
  departments: [DepartmentId, number][];
  evaluation: EvaluationMethod;
  methods: [ProcurementMethod, number][];
  titles: string[];
  scopes: string[];
  months: [number, number];
  spread: [number, number];
}

const CONFIG: Record<CategoryId, CategoryConfig> = {
  road: {
    count: 47,
    medianCr: 0.92,
    sigma: 0.52,
    bids: [3, 6],
    departments: [["pwd", 45], ["rdp", 30], ["udd", 15], ["trn", 10]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 88], ["LIMITED_TENDER", 12]],
    titles: [
      "Periodic Maintenance — {town} Rural Roads",
      "Pothole Rectification — {town} Urban Roads",
      "Culvert Reconstruction — {town} Taluk",
      "Resurfacing — {town} Link Road",
      "Shoulder Strengthening — {town} Approach Road",
      "Road Marking & Signage — {town} Division",
    ],
    scopes: ["Departmental road works package", "Annual repair package", "Rural connectivity works"],
    months: [6, 18],
    spread: [2.4, 16],
  },
  building: {
    count: 45,
    medianCr: 1.05,
    sigma: 0.5,
    bids: [3, 6],
    departments: [["pwd", 35], ["edu", 25], ["hfw", 20], ["rdp", 20]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 90], ["LIMITED_TENDER", 10]],
    titles: [
      "School Classroom Block — {town}",
      "PHC Building Repairs — {town}",
      "Hostel Building Renovation — {town}",
      "Taluk Office Repairs — {town}",
      "Anganwadi Construction — {town} Cluster",
      "Community Hall Construction — {town}",
    ],
    scopes: ["Civil construction package", "Renovation and strengthening works"],
    months: [8, 20],
    spread: [2, 15],
  },
  water: {
    count: 30,
    medianCr: 1.35,
    sigma: 0.55,
    bids: [3, 5],
    departments: [["wrd", 50], ["udd", 30], ["rdp", 20]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 92], ["LIMITED_TENDER", 8]],
    titles: [
      "Water Supply Pipeline — {town}",
      "Borewell Rejuvenation — {town} Taluk",
      "Sewer Line Rehabilitation — {town}",
      "Overhead Tank Construction — {town}",
      "Storm Water Drain Works — {town}",
    ],
    scopes: ["Water supply and sanitation works", "Distribution network works"],
    months: [10, 24],
    spread: [5, 14],
  },
  medsup: {
    count: 49,
    medianCr: 0.42,
    sigma: 0.62,
    bids: [3, 6],
    departments: [["hfw", 100]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 62], ["RATE_CONTRACT", 30], ["DIRECT_PURCHASE", 8]],
    titles: [
      "Essential Drugs Supply — {town} District Hospitals",
      "Surgical Consumables — {town}",
      "Dialysis Consumables — {town}",
      "Laboratory Reagents — {town} Facilities",
      "Personal Protective Equipment — {town}",
    ],
    scopes: ["Annual supply order", "Quarterly replenishment order"],
    months: [3, 12],
    spread: [2.8, 18],
  },
  medeq: {
    count: 30,
    medianCr: 0.88,
    sigma: 0.6,
    bids: [3, 5],
    departments: [["hfw", 100]],
    evaluation: "QCBS",
    methods: [["OPEN_TENDER", 95], ["LIMITED_TENDER", 5]],
    titles: [
      "Patient Monitors — {town} District Hospital",
      "Digital X-Ray Units — {town}",
      "ICU Ventilators — {town}",
      "Ultrasound Systems — {town} Taluk Hospitals",
      "Operation Theatre Lights — {town}",
    ],
    scopes: ["Supply, installation and commissioning", "Supply with maintenance contract"],
    months: [3, 9],
    spread: [5, 16],
  },
  it: {
    count: 30,
    medianCr: 0.78,
    sigma: 0.58,
    bids: [3, 5],
    departments: [["edu", 25], ["hfw", 20], ["trn", 15], ["udd", 15], ["rdp", 15], ["agr", 10]],
    evaluation: "QCBS",
    methods: [["OPEN_TENDER", 80], ["LIMITED_TENDER", 20]],
    titles: [
      "e-Office Rollout — {town} Offices",
      "Data Center Support Services — {year}",
      "GIS Asset Mapping — {town}",
      "Citizen Helpdesk Platform — {town}",
      "Network Upgrade — {town} Offices",
    ],
    scopes: ["Implementation and support services", "Managed services engagement"],
    months: [12, 24],
    spread: [6, 20],
  },
  transport: {
    count: 28,
    medianCr: 0.52,
    sigma: 0.55,
    bids: [3, 5],
    departments: [["trn", 60], ["hfw", 20], ["edu", 20]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 78], ["RATE_CONTRACT", 22]],
    titles: [
      "Fleet Maintenance — {town} Depot",
      "Vehicle Hiring Services — {town}",
      "Depot Security Services — {town}",
      "Tyre Supply Rate Contract — {year}",
      "Bus Body Repairs — {town} Depot",
    ],
    scopes: ["Service contract", "Rate contract for depot operations"],
    months: [12, 24],
    spread: [5, 16],
  },
  agri: {
    count: 37,
    medianCr: 0.34,
    sigma: 0.6,
    bids: [3, 6],
    departments: [["agr", 100]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 70], ["RATE_CONTRACT", 20], ["DIRECT_PURCHASE", 10]],
    titles: [
      "Certified Seed Supply — Kharif {year}, {town}",
      "Farm Mechanisation Equipment — {town}",
      "Micro Irrigation Kits — {town}",
      "Soil Testing Kits — {town}",
      "Horticulture Saplings — {town}",
    ],
    scopes: ["Seasonal supply order", "Subsidy scheme supply order"],
    months: [2, 8],
    spread: [5, 18],
  },
  edumat: {
    count: 35,
    medianCr: 0.3,
    sigma: 0.58,
    bids: [3, 6],
    departments: [["edu", 100]],
    evaluation: "L1",
    methods: [["OPEN_TENDER", 68], ["RATE_CONTRACT", 18], ["DIRECT_PURCHASE", 14]],
    titles: [
      "School Furniture — {town} District",
      "Textbook Printing — {year}",
      "Learning Kits — {town} Cluster",
      "Laboratory Equipment — {town} High Schools",
      "Sports Kits — {town} District",
    ],
    scopes: ["Supply order for district schools", "Annual print and supply order"],
    months: [2, 8],
    spread: [5, 18],
  },
};

const REGION_WEIGHTS: [RegionId, number][] = [
  ["bengaluru", 24],
  ["coastal", 15],
  ["malnad", 14],
  ["mysuru", 15],
  ["kalyana", 16],
  ["kittur", 16],
];

/** Named vendors that dominate part of a market — the basis of concentration signals. */
const MARKET_LEADERS: { vendorId: string; categoryId: CategoryId; departmentId?: DepartmentId; bid: number; win: number }[] = [
  { vendorId: V.kestrel, categoryId: "medsup", departmentId: "hfw", bid: 0.86, win: 0.74 },
  { vendorId: V.meridian, categoryId: "medeq", departmentId: "hfw", bid: 0.76, win: 0.48 },
  { vendorId: V.lumen, categoryId: "edumat", bid: 0.45, win: 0.4 },
  { vendorId: V.quillon, categoryId: "it", bid: 0.5, win: 0.36 },
  { vendorId: V.corvid, categoryId: "transport", bid: 0.45, win: 0.3 },
  { vendorId: V.harrow, categoryId: "agri", bid: 0.4, win: 0.3 },
];

/** Vendors kept out of generated tenders so their authored history stays exact. */
const RESERVED_VENDORS = new Set<string>([...CLUSTER_VENDORS, V.hearth, V.pantry]);

const MONTH_DURATION: Record<CategoryId, [number, number]> = Object.fromEntries(
  (Object.keys(CONFIG) as CategoryId[]).map((k) => [k, CONFIG[k].months]),
) as Record<CategoryId, [number, number]>;

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

interface Draft {
  tender: Tender;
  bidders: string[];
  explicitBids?: TenderSeed["bids"];
  spreadPct: number;
  rawValue?: number;
  seed?: TenderSeed;
}

let bidSeq = 10_000;
const nextBidId = () => `BID-${++bidSeq}`;

function seedToDraft(seed: TenderSeed): Draft {
  const status: TenderStatus =
    seed.status ?? (seed.awardedOn ? statusFromContract(seed) : "EVALUATION");
  const awardValue = seed.awardCr != null ? cr(seed.awardCr) : undefined;
  const estimate = seed.estimateCr != null ? cr(seed.estimateCr) : Math.round((awardValue ?? 0) / 1.07);
  const bidders = seed.bids ? seed.bids.map((b) => b.vendorId) : (seed.bidders ?? []);

  const tender: Tender = {
    id: seed.id,
    title: seed.title,
    departmentId: seed.departmentId,
    categoryId: seed.categoryId,
    regionId: seed.regionId,
    zone: seed.zone,
    location: seed.town,
    method: seed.method ?? "OPEN_TENDER",
    evaluation: seed.evaluation ?? "L1",
    qcbsWeights: (seed.evaluation ?? "L1") === "QCBS" ? [70, 30] : undefined,
    estimate,
    publishedOn: seed.publishedOn,
    bidDeadline: seed.deadline,
    evaluatedOn: seed.evaluatedOn,
    awardedOn: seed.awardedOn,
    status,
    winnerVendorId: seed.winner,
    awardValue,
    bidIds: [],
    scope: seed.scope,
    eventCount: 0,
    comparableIds: seed.comparableIds,
    story: true,
  };

  return { tender, bidders, explicitBids: seed.bids, spreadPct: seed.spreadPct ?? 8, seed };
}

function statusFromContract(seed: TenderSeed): TenderStatus {
  const months = MONTH_DURATION[seed.categoryId];
  const approxEnd = addDays(seed.awardedOn!, 20 + months[1] * 30);
  return daysBetween(approxEnd, TODAY) > 0 ? "COMPLETED" : "IN_EXECUTION";
}

function buildGenerated(rng: Rng): Draft[] {
  const drafts: Draft[] = [];
  const idSeq: Record<string, number> = {};

  for (const categoryId of Object.keys(CONFIG) as CategoryId[]) {
    const config = CONFIG[categoryId];
    for (let i = 0; i < config.count; i++) {
      const regionId = rng.weighted(REGION_WEIGHTS);
      const region = REGION_BY_ID[regionId];
      const town = rng.pick(region.towns);
      const departmentId = rng.weighted(config.departments);

      // Published between Apr 2024 and late Aug 2026, weighted toward recent months.
      const span = daysBetween("2024-04-01", "2026-08-25");
      const offset = Math.round(span * Math.pow(rng.next(), 0.78));
      const publishedOn = addDays("2024-04-01", offset);
      const windowDays = rng.weighted([
        [21, 62],
        [15, 22],
        [28, 10],
        [9, 6],
      ]);
      const deadlineDate = addDays(publishedOn, windowDays);
      const evaluatedOn = addDays(deadlineDate, rng.int(4, 12));
      const awardedOn = addDays(evaluatedOn, rng.int(4, 16));
      const year = publishedOn.slice(0, 4);
      idSeq[year] = (idSeq[year] ?? 5000) + rng.int(3, 17);
      const id = `TND-${year}-${String(idSeq[year]).padStart(5, "0")}`;

      const rawValue = cr(config.medianCr * Math.exp(rng.normal(0, config.sigma)));
      const title = rng
        .pick(config.titles)
        .replace("{town}", town)
        .replace("{year}", `${Number(year)}-${String(Number(year) + 1).slice(2)}`);

      const pool = VENDORS.filter(
        (v) => v.categories.includes(categoryId) && !RESERVED_VENDORS.has(v.id),
      );
      const regional = pool.filter((v) => v.regionId === regionId);
      const bidCount = rng.int(config.bids[0], config.bids[1]);
      const bidders: string[] = [];
      const leader = MARKET_LEADERS.find(
        (l) => l.categoryId === categoryId && (!l.departmentId || l.departmentId === departmentId),
      );
      if (leader && rng.chance(leader.bid)) bidders.push(leader.vendorId);
      while (bidders.length < bidCount) {
        const from = regional.length >= 3 && rng.chance(0.72) ? regional : pool;
        const candidate = rng.pick(from);
        if (!bidders.includes(candidate.id)) bidders.push(candidate.id);
      }

      const winner =
        leader && bidders[0] === leader.vendorId && rng.chance(leader.win)
          ? leader.vendorId
          : rng.pick(bidders);

      const tender: Tender = {
        id,
        title,
        departmentId,
        categoryId,
        regionId,
        location: town,
        method: rng.weighted(config.methods),
        evaluation: config.evaluation,
        qcbsWeights: config.evaluation === "QCBS" ? [70, 30] : undefined,
        estimate: 0,
        publishedOn,
        bidDeadline: `${deadlineDate}T15:00`,
        evaluatedOn,
        awardedOn,
        status: "AWARDED",
        winnerVendorId: winner,
        bidIds: [],
        scope: rng.pick(config.scopes),
        eventCount: 0,
      };

      drafts.push({
        tender,
        bidders,
        spreadPct: rng.float(config.spread[0], config.spread[1]),
        rawValue,
      });
    }
  }

  return drafts;
}

function assignStatuses(drafts: Draft[], rng: Rng) {
  const byDate = [...drafts].sort((a, b) =>
    a.tender.publishedOn < b.tender.publishedOn ? 1 : -1,
  );
  byDate.slice(0, 9).forEach((d) => {
    d.tender.status = "OPEN";
    d.tender.winnerVendorId = undefined;
    d.tender.awardedOn = undefined;
    d.tender.evaluatedOn = undefined;
    d.bidders = [];
  });
  byDate.slice(9, 21).forEach((d) => {
    d.tender.status = "EVALUATION";
    d.tender.winnerVendorId = undefined;
    d.tender.awardedOn = undefined;
  });
  const remaining = byDate.slice(21);
  const cancelled = rng.sample(remaining, 13);
  cancelled.forEach((d) => {
    d.tender.status = "CANCELLED";
    d.tender.winnerVendorId = undefined;
    d.tender.awardedOn = undefined;
  });
}

function isAwarded(t: Tender) {
  return t.status === "AWARDED" || t.status === "IN_EXECUTION" || t.status === "COMPLETED";
}

function buildBids(draft: Draft, rng: Rng): Bid[] {
  const { tender } = draft;
  if (tender.status === "OPEN") return [];

  const explicit = draft.explicitBids;
  const vendorIds = explicit ? explicit.map((b) => b.vendorId) : draft.bidders;
  if (!vendorIds.length) return [];

  const anchor = tender.awardValue ?? tender.estimate;
  const amounts = new Map<string, number>();

  if (explicit) {
    for (const bid of explicit) amounts.set(bid.vendorId, cr(bid.cr ?? 0));
  } else {
    const winner = tender.winnerVendorId;
    const spread = draft.spreadPct / 100;
    const others = vendorIds.filter((id) => id !== winner);
    if (winner) amounts.set(winner, anchor);
    others.forEach((id, index) => {
      const step = others.length === 1 ? 1 : (index + 1) / others.length;
      const jitter = 1 + rng.float(-0.12, 0.12) * spread;
      amounts.set(id, Math.round(anchor * (1 + spread * step * jitter)));
    });
    if (!winner) {
      // Under evaluation or cancelled: bids sit around the estimate.
      vendorIds.forEach((id, index) => {
        amounts.set(id, Math.round(anchor * (1 + spread * (index / Math.max(1, vendorIds.length - 1)))));
      });
    }
  }

  const lowest = Math.min(...amounts.values());
  const deadlineMinutes = minuteNumber(tender.bidDeadline);

  const bids: Bid[] = vendorIds.map((vendorId, index) => {
    const seedBid = explicit?.find((b) => b.vendorId === vendorId);
    const amount = amounts.get(vendorId)!;
    const minutesBefore = seedBid?.at
      ? deadlineMinutes - minuteNumber(seedBid.at)
      : rng.int(3, 88) * 60 + rng.int(0, 59);
    const submittedAt = seedBid?.at ?? minutesToIso(deadlineMinutes - minutesBefore);
    const technicalScore =
      tender.evaluation === "QCBS"
        ? (seedBid?.tech ??
          (vendorId === tender.winnerVendorId ? rng.int(87, 93) : rng.int(76, 86)))
        : undefined;
    const financialScore =
      tender.evaluation === "QCBS" ? Number(((lowest / amount) * 100).toFixed(2)) : undefined;
    const combinedScore =
      technicalScore != null && financialScore != null
        ? Number((technicalScore * 0.7 + financialScore * 0.3).toFixed(2))
        : undefined;

    return {
      id: seedBid?.id ?? nextBidId(),
      tenderId: tender.id,
      vendorId,
      amount,
      submittedAt,
      technicalScore,
      financialScore,
      combinedScore,
      rank: index + 1,
      outcome:
        tender.status === "CANCELLED"
          ? "CANCELLED"
          : !tender.winnerVendorId
            ? "PENDING"
            : vendorId === tender.winnerVendorId
              ? "WON"
              : "LOST",
    };
  });

  const ordered = [...bids].sort((a, b) =>
    tender.evaluation === "QCBS" && a.combinedScore != null && b.combinedScore != null
      ? b.combinedScore - a.combinedScore
      : a.amount - b.amount,
  );
  ordered.forEach((bid, index) => {
    bid.rank = index + 1;
  });

  return bids;
}

function minutesToIso(minutes: number) {
  return new Date(minutes * 60_000).toISOString().slice(0, 16);
}

function buildContract(tender: Tender, rng: Rng, index: number): Contract {
  const [minMonths, maxMonths] = MONTH_DURATION[tender.categoryId];
  const months = rng.int(minMonths, maxMonths);
  const signedOn = addDays(tender.awardedOn!, rng.int(11, 21));
  const startOn = addDays(signedOn, rng.int(1, 6));
  const endOn = addDays(startOn, months * 30);
  const elapsed = daysBetween(startOn, TODAY);
  const total = daysBetween(startOn, endOn);
  const progress = clamp(elapsed / Math.max(total, 1), 0, 1);
  const year = signedOn.slice(0, 4);

  return {
    id: tender.id === CASE_TENDER ? CASE_CONTRACT : `CTR-${year}-${String(1000 + index).padStart(4, "0")}`,
    tenderId: tender.id,
    vendorId: tender.winnerVendorId!,
    departmentId: tender.departmentId,
    categoryId: tender.categoryId,
    regionId: tender.regionId,
    title: tender.title,
    value: tender.awardValue!,
    signedOn,
    startOn,
    endOn,
    status: progress >= 1 ? "COMPLETED" : "ACTIVE",
    paidToDate: 0,
    progress,
  };
}

interface PaymentSeed {
  type: PaymentType;
  amount: number;
  invoiceOn: string;
  daysToPay: number;
  certified: boolean;
  invoiceNo?: string;
  id?: string;
  flagged?: boolean;
}

/** Payment behavior authored for the payment-pattern cases. */
const PAYMENT_OVERRIDES: Record<string, (value: number, startOn: string) => PaymentSeed[]> = {
  "TND-2026-01633": (value, startOn) => [
    { type: "ADVANCE", amount: Math.round(value * 0.1), invoiceOn: addDays(startOn, 6), daysToPay: 9, certified: true },
    { type: "RUNNING_BILL", amount: Math.round(value * 0.139), invoiceOn: addDays(startOn, 38), daysToPay: 11, certified: true },
    { type: "RUNNING_BILL", amount: Math.round(value * 0.139), invoiceOn: addDays(startOn, 71), daysToPay: 8, certified: false, flagged: true },
    { type: "RUNNING_BILL", amount: Math.round(value * 0.139), invoiceOn: addDays(startOn, 96), daysToPay: 7, certified: false, flagged: true },
    { type: "RUNNING_BILL", amount: Math.round(value * 0.103), invoiceOn: addDays(startOn, 121), daysToPay: 6, certified: false, flagged: true },
  ],
  "TND-2025-03302": (value, startOn) => [
    { type: "RUNNING_BILL", amount: 400_000, invoiceOn: addDays(startOn, 30), daysToPay: 22, certified: true, invoiceNo: "CFS/2026/0392" },
    { type: "RUNNING_BILL", amount: 400_000, invoiceOn: addDays(startOn, 92), daysToPay: 19, certified: true, invoiceNo: "CFS/2026/0418" },
    { type: "RUNNING_BILL", amount: 400_000, invoiceOn: addDays(startOn, 150), daysToPay: 17, certified: true, invoiceNo: "CFS/2026/0418", flagged: true },
    { type: "RUNNING_BILL", amount: 600_000, invoiceOn: addDays(startOn, 210), daysToPay: 14, certified: true, invoiceNo: "CFS/2026/0461" },
    { type: "RUNNING_BILL", amount: 600_000, invoiceOn: addDays(startOn, 268), daysToPay: 12, certified: true, invoiceNo: "CFS/2026/0488" },
  ],
  [CASE_TENDER]: (value) => [
    {
      id: "PAY-2026-11873",
      type: "ADVANCE",
      amount: Math.round(value * 0.1),
      invoiceOn: "2026-08-31",
      daysToPay: 9,
      certified: true,
      invoiceNo: "VIL/2026/0412",
    },
  ],
};

let paymentSeq = 10_000;

function buildPayments(contract: Contract, tender: Tender, rng: Rng): Payment[] {
  const seeds: PaymentSeed[] = [];
  const override = PAYMENT_OVERRIDES[tender.id];
  if (override) {
    seeds.push(...override(contract.value, contract.startOn));
  } else {
    const family = tender.categoryId;
    const civil = family === "road" || family === "building" || family === "water";
    const supply = family === "medsup" || family === "medeq" || family === "agri" || family === "edumat";
    const months = Math.max(1, Math.round(daysBetween(contract.startOn, contract.endOn) / 30));

    if (civil) {
      if (contract.value >= 5_000_000) {
        seeds.push({
          type: "ADVANCE",
          amount: Math.round(contract.value * 0.1),
          invoiceOn: addDays(contract.startOn, rng.int(5, 16)),
          daysToPay: rng.int(12, 34),
          certified: true,
        });
      }
      const milestones = clamp(Math.round(months / 3), 1, 6);
      const done = Math.floor(contract.progress * milestones);
      const share = (contract.value * (contract.value >= 5_000_000 ? 0.86 : 0.94)) / milestones;
      for (let i = 0; i < done; i++) {
        seeds.push({
          type: "RUNNING_BILL",
          amount: Math.round(share),
          invoiceOn: addDays(contract.startOn, Math.round(((i + 1) / milestones) * months * 30)),
          daysToPay: rng.int(14, 52),
          certified: true,
        });
      }
      if (contract.progress >= 1) {
        seeds.push({
          type: "FINAL_BILL",
          amount: Math.round(contract.value * 0.04),
          invoiceOn: addDays(contract.endOn, rng.int(4, 18)),
          daysToPay: rng.int(18, 60),
          certified: true,
        });
      }
    } else if (supply) {
      const tranches = rng.int(1, 3);
      const done = Math.max(1, Math.round(contract.progress * tranches));
      for (let i = 0; i < done; i++) {
        seeds.push({
          type: "SUPPLY_INVOICE",
          amount: Math.round(contract.value / tranches),
          invoiceOn: addDays(contract.startOn, Math.round(((i + 1) / tranches) * months * 26)),
          daysToPay: rng.int(11, 48),
          certified: true,
        });
      }
    } else {
      const quarters = clamp(Math.round(months / 3), 1, 8);
      const done = Math.floor(contract.progress * quarters);
      for (let i = 0; i < done; i++) {
        seeds.push({
          type: "RUNNING_BILL",
          amount: Math.round(contract.value / quarters),
          invoiceOn: addDays(contract.startOn, (i + 1) * 90),
          daysToPay: rng.int(13, 44),
          certified: true,
        });
      }
    }
  }

  const initials = (VENDOR_BY_ID[contract.vendorId]?.name ?? "VEN")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return seeds
    .map((seed, index) => {
      const paidOn = addDays(seed.invoiceOn, seed.daysToPay);
      const year = seed.invoiceOn.slice(0, 4);
      return {
        id: seed.id ?? `PAY-${year}-${String(++paymentSeq).padStart(5, "0")}`,
        contractId: contract.id,
        vendorId: contract.vendorId,
        amount: seed.amount,
        type: seed.type,
        invoiceNo: seed.invoiceNo ?? `${initials}/${year}/${String(400 + index * 7).padStart(4, "0")}`,
        invoiceOn: seed.invoiceOn,
        paidOn,
        daysToPay: seed.daysToPay,
        milestoneCertified: seed.certified,
        flagged: seed.flagged,
      } satisfies Payment;
    })
    .filter((payment) => daysBetween(payment.paidOn, TODAY) >= 0);
}

function build() {
  const rng = createRng(4182);

  const storyDrafts = STORY_TENDERS.map(seedToDraft);
  const generatedDrafts = buildGenerated(rng);
  assignStatuses(generatedDrafts, rng);

  // Scale generated award values so the platform total matches exactly.
  const storyAwarded = storyDrafts.filter((d) => isAwarded(d.tender));
  const storyTotal = storyAwarded.reduce((s, d) => s + (d.tender.awardValue ?? 0), 0);
  const generatedAwarded = generatedDrafts.filter((d) => isAwarded(d.tender));
  const rawTotal = generatedAwarded.reduce((s, d) => s + (d.rawValue ?? 0), 0);
  const scale = (TARGET_VALUE - storyTotal) / rawTotal;

  for (const draft of generatedDrafts) {
    const scaled = Math.round(((draft.rawValue ?? 0) * scale) / 1000) * 1000;
    draft.tender.estimate = Math.round(scaled / 1.06 / 1000) * 1000;
    if (isAwarded(draft.tender)) draft.tender.awardValue = scaled;
    else draft.tender.estimate = Math.round(scaled / 1000) * 1000;
  }

  const generatedTotal = generatedAwarded.reduce((s, d) => s + (d.tender.awardValue ?? 0), 0);
  const residual = TARGET_VALUE - storyTotal - generatedTotal;
  if (residual !== 0) {
    const largest = generatedAwarded.reduce((a, b) =>
      (a.tender.awardValue ?? 0) >= (b.tender.awardValue ?? 0) ? a : b,
    );
    largest.tender.awardValue = (largest.tender.awardValue ?? 0) + residual;
  }

  const drafts = [...storyDrafts, ...generatedDrafts];

  // Bids
  const bids: Bid[] = [];
  for (const draft of drafts) {
    const made = buildBids(draft, rng);
    draft.tender.bidIds = made.map((b) => b.id);
    bids.push(...made);
  }

  // Contracts + payments
  const contracts: Contract[] = [];
  const payments: Payment[] = [];
  const awardedDrafts = drafts.filter((d) => isAwarded(d.tender));
  awardedDrafts.forEach((draft, index) => {
    const contract = buildContract(draft.tender, rng, index);
    draft.tender.contractId = contract.id;
    draft.tender.status = contract.status === "COMPLETED" ? "COMPLETED" : "IN_EXECUTION";
    const made = buildPayments(contract, draft.tender, rng);
    contract.paidToDate = made.reduce((s, p) => s + p.amount, 0);
    contracts.push(contract);
    payments.push(...made);
  });

  const tenders = drafts.map((d) => d.tender);

  // Lifecycle event counts, trued up to the platform total.
  const paymentsByContract = new Map<string, number>();
  for (const payment of payments) {
    paymentsByContract.set(payment.contractId, (paymentsByContract.get(payment.contractId) ?? 0) + 1);
  }
  for (const tender of tenders) {
    const paymentCount = tender.contractId ? (paymentsByContract.get(tender.contractId) ?? 0) : 0;
    const corrigenda = tender.id.charCodeAt(tender.id.length - 1) % 3;
    const preBid = tender.estimate > 10_000_000 ? 1 : 0;
    tender.eventCount =
      1 +
      corrigenda +
      preBid +
      tender.bidIds.length +
      (tender.evaluatedOn ? 2 : 0) +
      (tender.awardedOn ? 1 : 0) +
      (tender.contractId ? 1 : 0) +
      paymentCount * 2;
  }
  const baseEvents = tenders.reduce((s, t) => s + t.eventCount, 0);
  let remaining = TARGET_EVENTS - baseEvents;
  const withContracts = tenders.filter((t) => t.contractId);
  let cursor = 0;
  while (remaining > 0 && withContracts.length) {
    withContracts[cursor % withContracts.length].eventCount += 1;
    remaining -= 1;
    cursor += 1;
  }
  while (remaining < 0 && withContracts.length) {
    const tender = withContracts[cursor % withContracts.length];
    if (tender.eventCount > 6) {
      tender.eventCount -= 1;
      remaining += 1;
    }
    cursor += 1;
  }

  return { tenders, bids, contracts, payments };
}

const universe = build();

export const TENDERS: Tender[] = universe.tenders;
export const BIDS: Bid[] = universe.bids;
export const CONTRACTS: Contract[] = universe.contracts;
export const PAYMENTS: Payment[] = universe.payments;

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

export const TENDER_BY_ID = new Map(TENDERS.map((t) => [t.id, t]));
export const BID_BY_ID = new Map(BIDS.map((b) => [b.id, b]));
export const CONTRACT_BY_ID = new Map(CONTRACTS.map((c) => [c.id, c]));
export const PAYMENT_BY_ID = new Map(PAYMENTS.map((p) => [p.id, p]));

function indexBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export const BIDS_BY_TENDER = indexBy(BIDS, (b) => b.tenderId);
export const BIDS_BY_VENDOR = indexBy(BIDS, (b) => b.vendorId);
export const CONTRACTS_BY_VENDOR = indexBy(CONTRACTS, (c) => c.vendorId);
export const CONTRACT_BY_TENDER = new Map(CONTRACTS.map((c) => [c.tenderId, c]));
export const PAYMENTS_BY_CONTRACT = indexBy(PAYMENTS, (p) => p.contractId);
export const PAYMENTS_BY_VENDOR = indexBy(PAYMENTS, (p) => p.vendorId);

export const AWARDED_TENDERS = TENDERS.filter(
  (t) => t.status === "AWARDED" || t.status === "IN_EXECUTION" || t.status === "COMPLETED",
);

export function tenderById(id: string) {
  return TENDER_BY_ID.get(id);
}

export function bidsFor(tenderId: string) {
  return BIDS_BY_TENDER.get(tenderId) ?? [];
}

export function paymentsFor(contractId: string) {
  return PAYMENTS_BY_CONTRACT.get(contractId) ?? [];
}

export function tendersForVendor(vendorId: string) {
  const ids = new Set((BIDS_BY_VENDOR.get(vendorId) ?? []).map((b) => b.tenderId));
  return [...ids].map((id) => TENDER_BY_ID.get(id)!).filter(Boolean);
}

export function contractsForVendor(vendorId: string) {
  return CONTRACTS_BY_VENDOR.get(vendorId) ?? [];
}

/* ------------------------------------------------------------------ */
/* Comparable procurement engine                                       */
/* ------------------------------------------------------------------ */

export const COMPARABLE_LIMIT = 18;
export const COMPARABLE_WINDOW_MONTHS = 18;

/**
 * Comparable set: awarded procurements in the same category, closest in size,
 * inside an 18-month window. Authored cases can pin an explicit set.
 */
export function comparablesFor(tender: Tender): Tender[] {
  if (tender.comparableIds) {
    return tender.comparableIds.map((id) => TENDER_BY_ID.get(id)!).filter(Boolean);
  }
  const value = tender.awardValue ?? tender.estimate;
  const anchor = tender.awardedOn ?? tender.publishedOn;
  const windowDays = COMPARABLE_WINDOW_MONTHS * 30;
  return AWARDED_TENDERS.filter((t) => {
    if (t.id === tender.id) return false;
    if (t.categoryId !== tender.categoryId) return false;
    if (Math.abs(daysBetween(t.awardedOn ?? t.publishedOn, anchor)) > windowDays) return false;
    const ratio = (t.awardValue ?? 0) / value;
    return ratio >= 0.35 && ratio <= 2.85;
  })
    .sort(
      (a, b) =>
        Math.abs(Math.log((a.awardValue ?? 1) / value)) -
        Math.abs(Math.log((b.awardValue ?? 1) / value)),
    )
    .slice(0, COMPARABLE_LIMIT);
}

export interface ComparableStats {
  count: number;
  values: number[];
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  deviationPct: number;
  current: number;
}

export function comparableStats(tender: Tender): ComparableStats {
  const comparables = comparablesFor(tender);
  const values = comparables.map((t) => t.awardValue ?? 0).filter(Boolean);
  const current = tender.awardValue ?? tender.estimate;
  const med = median(values);
  return {
    count: values.length,
    values,
    median: med,
    p25: percentile(values, 0.25),
    p75: percentile(values, 0.75),
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    deviationPct: med ? ((current - med) / med) * 100 : 0,
    current,
  };
}

/** (max − min) / min across the bids on a tender, in percent. */
export function bidSpread(tenderId: string) {
  const amounts = bidsFor(tenderId)
    .filter((b) => b.outcome !== "CANCELLED")
    .map((b) => b.amount);
  if (amounts.length < 2) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return ((max - min) / min) * 100;
}

export function medianComparableSpread(tender: Tender) {
  const spreads = comparablesFor(tender)
    .map((t) => bidSpread(t.id))
    .filter((s): s is number => s != null);
  return spreads.length ? median(spreads) : null;
}

/** Days between publication and the bid deadline. */
export function bidWindowDays(tender: Tender) {
  return daysBetween(tender.publishedOn, tender.bidDeadline.slice(0, 10));
}

export const TOTAL_EVENTS = TENDERS.reduce((s, t) => s + t.eventCount, 0);
export const TOTAL_VALUE = CONTRACTS.reduce((s, c) => s + c.value, 0);
export const TOTAL_PAID = CONTRACTS.reduce((s, c) => s + c.paidToDate, 0);
