import type {
  CategoryId,
  DepartmentId,
  EvaluationMethod,
  ProcurementMethod,
  RegionId,
  TenderStatus,
} from "@/types";
import { V } from "./vendors";

/** Ids the demo narrative refers to by name. */
export const CASE_TENDER = "TND-2026-04182";
export const CASE_CONTRACT = "CTR-2026-0827";
export const PRIMARY_CASE = "INV-2026-0042";
export const PRIOR_CASE = "INV-2025-0187";
export const NEXT_PACKAGE_TENDER = "TND-2026-04631";

export interface SeedBid {
  vendorId: string;
  cr?: number;
  tech?: number;
  at?: string;
  id?: string;
}

export interface TenderSeed {
  id: string;
  title: string;
  departmentId: DepartmentId;
  categoryId: CategoryId;
  regionId: RegionId;
  town: string;
  zone?: string;
  method?: ProcurementMethod;
  evaluation?: EvaluationMethod;
  publishedOn: string;
  deadline: string;
  evaluatedOn?: string;
  awardedOn?: string;
  status?: TenderStatus;
  estimateCr?: number;
  awardCr?: number;
  winner?: string;
  bidders?: string[];
  bids?: SeedBid[];
  /** (max − min) / min across bids, in %, when bids are generated. */
  spreadPct?: number;
  scope: string;
  contractId?: string;
  comparableIds?: string[];
  /** Part of the authored comparable set for the primary case. */
  comparable?: boolean;
}

const CLUSTER: string[] = [V.vertex, V.northstar, V.apex, V.bluegrid];

/* ------------------------------------------------------------------ */
/* 1. Coastal road-maintenance program (the joint-participation set) */
/* ------------------------------------------------------------------ */

export const CLUSTER_TENDERS: TenderSeed[] = [
  {
    id: "TND-2025-00841",
    title: "Road Maintenance — Zone 1",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Mangaluru",
    zone: "Zone 1",
    evaluation: "QCBS",
    publishedOn: "2025-01-06",
    deadline: "2025-01-27T15:00",
    evaluatedOn: "2025-02-03",
    awardedOn: "2025-02-11",
    estimateCr: 5.85,
    awardCr: 6.18,
    winner: V.northstar,
    scope: "Periodic maintenance, 34.2 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.22, tech: 84 },
      { vendorId: V.northstar, cr: 6.18, tech: 91 },
      { vendorId: V.apex, cr: 6.24, tech: 82 },
      { vendorId: V.bluegrid, cr: 6.26, tech: 80 },
    ],
    comparable: true,
  },
  {
    id: "TND-2025-01294",
    title: "Road Maintenance — Zone 2",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Udupi",
    zone: "Zone 2",
    evaluation: "QCBS",
    publishedOn: "2025-03-10",
    deadline: "2025-03-31T15:00",
    evaluatedOn: "2025-04-07",
    awardedOn: "2025-04-15",
    estimateCr: 6.1,
    awardCr: 6.52,
    winner: V.apex,
    scope: "Periodic maintenance, 36.8 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.55, tech: 83 },
      { vendorId: V.northstar, cr: 6.57, tech: 81 },
      { vendorId: V.apex, cr: 6.52, tech: 90 },
      { vendorId: V.bluegrid, cr: 6.58, tech: 79 },
    ],
    comparable: true,
  },
  {
    id: "TND-2025-01737",
    title: "Road Maintenance — Zone 3",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Karwar",
    zone: "Zone 3",
    evaluation: "QCBS",
    publishedOn: "2025-05-12",
    deadline: "2025-06-02T15:00",
    evaluatedOn: "2025-06-09",
    awardedOn: "2025-06-17",
    estimateCr: 6.02,
    awardCr: 6.44,
    winner: V.bluegrid,
    scope: "Periodic maintenance, 33.1 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.49, tech: 82 },
      { vendorId: V.northstar, cr: 6.47, tech: 80 },
      { vendorId: V.apex, cr: 6.51, tech: 83 },
      { vendorId: V.bluegrid, cr: 6.44, tech: 90 },
    ],
    comparable: true,
  },
  {
    id: "TND-2025-02207",
    title: "Road Maintenance — Zone 4",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Puttur",
    zone: "Zone 4",
    evaluation: "QCBS",
    publishedOn: "2025-07-07",
    deadline: "2025-07-28T15:00",
    evaluatedOn: "2025-08-04",
    awardedOn: "2025-08-12",
    estimateCr: 5.9,
    awardCr: 5.97,
    winner: V.karavali,
    scope: "Periodic maintenance, 37.4 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.53, tech: 85 },
      { vendorId: V.northstar, cr: 6.49, tech: 83 },
      { vendorId: V.apex, cr: 6.55, tech: 82 },
      { vendorId: V.bluegrid, cr: 6.51, tech: 81 },
      { vendorId: V.karavali, cr: 5.97, tech: 88 },
    ],
    comparable: true,
  },
  {
    id: "TND-2025-02684",
    title: "Road Maintenance — Zone 5",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Kundapura",
    zone: "Zone 5",
    evaluation: "QCBS",
    publishedOn: "2025-09-08",
    deadline: "2025-09-29T15:00",
    evaluatedOn: "2025-10-06",
    awardedOn: "2025-10-14",
    estimateCr: 6.3,
    awardCr: 6.9,
    winner: V.vertex,
    scope: "Periodic maintenance, 35.6 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.9, tech: 91 },
      { vendorId: V.northstar, cr: 6.86, tech: 82 },
      { vendorId: V.apex, cr: 6.93, tech: 83 },
      { vendorId: V.bluegrid, cr: 6.88, tech: 80 },
    ],
    comparable: true,
  },
  {
    id: "TND-2025-03158",
    title: "Road Maintenance — Zone 6",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Bhatkal",
    zone: "Zone 6",
    evaluation: "QCBS",
    publishedOn: "2025-11-10",
    deadline: "2025-12-01T15:00",
    evaluatedOn: "2025-12-08",
    awardedOn: "2025-12-16",
    estimateCr: 5.8,
    awardCr: 6.1,
    winner: V.northstar,
    scope: "Periodic maintenance, 32.0 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 6.14, tech: 83 },
      { vendorId: V.northstar, cr: 6.1, tech: 90 },
      { vendorId: V.apex, cr: 6.16, tech: 81 },
      { vendorId: V.bluegrid, cr: 6.13, tech: 82 },
    ],
    comparable: true,
  },
  {
    id: "TND-2026-00612",
    title: "Road Maintenance — Zone 1 (2026 cycle)",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Mangaluru",
    zone: "Zone 1",
    evaluation: "QCBS",
    publishedOn: "2026-01-12",
    deadline: "2026-02-02T15:00",
    evaluatedOn: "2026-02-09",
    awardedOn: "2026-02-17",
    estimateCr: 6.45,
    awardCr: 7.02,
    winner: V.apex,
    scope: "Periodic maintenance, 34.2 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 7.08, tech: 84 },
      { vendorId: V.northstar, cr: 7.05, tech: 83 },
      { vendorId: V.apex, cr: 7.02, tech: 91 },
      { vendorId: V.bluegrid, cr: 7.1, tech: 80 },
    ],
    comparable: true,
  },
  {
    id: "TND-2026-01488",
    title: "Road Maintenance — Zone 2 (2026 cycle)",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Udupi",
    zone: "Zone 2",
    evaluation: "QCBS",
    publishedOn: "2026-03-09",
    deadline: "2026-03-30T15:00",
    evaluatedOn: "2026-04-06",
    awardedOn: "2026-04-14",
    estimateCr: 6.6,
    awardCr: 7.2,
    winner: V.bluegrid,
    scope: "Periodic maintenance, 36.8 km · performance-based maintenance contract",
    bids: [
      { vendorId: V.vertex, cr: 7.26, tech: 85 },
      { vendorId: V.northstar, cr: 7.24, tech: 82 },
      { vendorId: V.apex, cr: 7.28, tech: 84 },
      { vendorId: V.bluegrid, cr: 7.2, tech: 92 },
    ],
    comparable: true,
  },
  {
    /* The case under investigation. */
    id: CASE_TENDER,
    title: "Road Maintenance — Zone 4",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Puttur",
    zone: "Zone 4",
    evaluation: "QCBS",
    publishedOn: "2026-08-01",
    deadline: "2026-08-07T15:00",
    evaluatedOn: "2026-08-08",
    awardedOn: "2026-08-14",
    estimateCr: 7.1,
    awardCr: 8.42,
    winner: V.vertex,
    contractId: CASE_CONTRACT,
    scope: "Periodic maintenance and resurfacing, 38.6 km · performance-based maintenance contract (24 months)",
    bids: [
      { id: "BID-38271", vendorId: V.vertex, cr: 8.42, tech: 92, at: "2026-08-04T16:42" },
      { id: "BID-38304", vendorId: V.northstar, cr: 8.31, tech: 81, at: "2026-08-05T11:08" },
      { id: "BID-38309", vendorId: V.apex, cr: 8.39, tech: 84, at: "2026-08-05T11:22" },
      { id: "BID-38352", vendorId: V.bluegrid, cr: 8.36, tech: 79, at: "2026-08-06T17:55" },
    ],
    comparableIds: [
      "TND-2025-00841",
      "TND-2025-01294",
      "TND-2025-01737",
      "TND-2025-02207",
      "TND-2025-02684",
      "TND-2025-03158",
      "TND-2026-00612",
      "TND-2026-01488",
      "TND-2025-00933",
      "TND-2025-01502",
      "TND-2026-02744",
      "TND-2025-00712",
      "TND-2026-02011",
      "TND-2025-00877",
      "TND-2026-03260",
      "TND-2025-01166",
      "TND-2026-03585",
      "TND-2026-01902",
    ],
  },
  {
    /* The next package in the same program — still open for bids. */
    id: NEXT_PACKAGE_TENDER,
    title: "Road Maintenance — Zone 3 (2026 cycle)",
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    town: "Karwar",
    zone: "Zone 3",
    evaluation: "QCBS",
    publishedOn: "2026-09-02",
    deadline: "2026-09-23T15:00",
    status: "OPEN",
    estimateCr: 6.9,
    scope: "Periodic maintenance, 33.1 km · performance-based maintenance contract",
    bidders: [],
  },
];

/* ------------------------------------------------------------------ */
/* 2. Comparable maintenance packages outside the coastal program    */
/* ------------------------------------------------------------------ */

const comparableSeed = (
  id: string,
  title: string,
  regionId: RegionId,
  town: string,
  zone: string,
  publishedOn: string,
  awardedOn: string,
  awardCr: number,
  winner: string,
  spreadPct: number,
  bidders: string[],
  km: number,
): TenderSeed => ({
  id,
  title,
  departmentId: "pwd",
  categoryId: "road",
  regionId,
  town,
  zone,
  evaluation: "QCBS",
  publishedOn,
  deadline: `${addDaysISO(publishedOn, 21)}T15:00`,
  evaluatedOn: addDaysISO(publishedOn, 28),
  awardedOn,
  awardCr,
  winner,
  spreadPct,
  bidders,
  scope: `Periodic maintenance, ${km} km · performance-based maintenance contract`,
  comparable: true,
});

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export const COMPARABLE_TENDERS: TenderSeed[] = [
  comparableSeed("TND-2025-00933", "Road Maintenance — Malnad Zone 1", "malnad", "Shivamogga", "Zone 1", "2025-01-20", "2025-02-25", 5.86, V.sahyadri, 8.8, [V.sahyadri, V.ghatroad, V.deccan, V.ironwood], 31.4),
  comparableSeed("TND-2025-01502", "Road Maintenance — Malnad Zone 2", "malnad", "Chikkamagaluru", "Zone 2", "2025-03-24", "2025-04-29", 6.1, V.ghatroad, 12.6, [V.ghatroad, V.sahyadri, V.graniteline], 30.2),
  comparableSeed("TND-2026-02744", "Road Maintenance — Malnad Zone 3", "malnad", "Hassan", "Zone 3", "2026-05-04", "2026-06-09", 6.95, V.sahyadri, 9.6, [V.sahyadri, V.ghatroad, V.ironwood, V.deccan], 32.8),
  comparableSeed("TND-2025-00712", "Road Maintenance — Mysuru Zone 1", "mysuru", "Mysuru", "Zone 1", "2024-12-23", "2025-01-28", 5.42, V.ironwood, 7.4, [V.ironwood, V.urbanarc, V.deccan], 29.6),
  comparableSeed("TND-2026-02011", "Road Maintenance — Mysuru Zone 2", "mysuru", "Mandya", "Zone 2", "2026-03-23", "2026-04-28", 7.2, V.ironwood, 11.3, [V.ironwood, V.urbanarc, V.graniteline, V.deccan], 35.1),
  comparableSeed("TND-2025-00877", "Road Maintenance — Kittur Zone 1", "kittur", "Belagavi", "Zone 1", "2025-01-13", "2025-02-18", 5.68, V.graniteline, 6.2, [V.graniteline, V.deccan, V.sahyadri], 30.8),
  comparableSeed("TND-2026-03260", "Road Maintenance — Kittur Zone 2", "kittur", "Dharwad", "Zone 2", "2026-06-01", "2026-07-07", 7.48, V.graniteline, 10.4, [V.graniteline, V.deccan, V.urbanarc, V.ironwood], 36.2),
  comparableSeed("TND-2025-01166", "Road Maintenance — Bengaluru Zone 1", "bengaluru", "Bengaluru Urban", "Zone 1", "2025-02-10", "2025-03-18", 7.66, V.urbanarc, 9.2, [V.urbanarc, V.ironwood, V.graniteline, V.deccan], 38.4),
  comparableSeed("TND-2026-03585", "Road Maintenance — Bengaluru Zone 3", "bengaluru", "Ramanagara", "Zone 3", "2026-06-15", "2026-07-21", 7.94, V.urbanarc, 14.1, [V.urbanarc, V.ironwood, V.deccan], 39.7),
  comparableSeed("TND-2026-01902", "Road Maintenance — Kalyana Zone 2", "kalyana", "Ballari", "Zone 2", "2026-03-16", "2026-04-21", 7.31, V.deccan, 8.1, [V.deccan, V.graniteline, V.stratum, V.ironwood], 37.0),
];

/* ------------------------------------------------------------------ */
/* 3. The winning vendor's remaining participation history             */
/* ------------------------------------------------------------------ */

type VertexRow = [
  id: string,
  title: string,
  departmentId: DepartmentId,
  categoryId: CategoryId,
  regionId: RegionId,
  town: string,
  awardedOn: string,
  cr: number,
  outcome: "WON" | "LOST" | "CANCELLED",
  rival: string,
];

const VERTEX_ROWS: VertexRow[] = [
  // Eight Public Works road awards inside the 14-month window (with Zone 5 and Zone 4).
  ["TND-2025-02832", "Culvert Reconstruction — Puttur Cluster", "pwd", "road", "coastal", "Puttur", "2025-11-04", 2.1, "WON", V.karavali],
  ["TND-2026-00344", "Shoulder Strengthening — Udupi–Hebri Road", "pwd", "road", "coastal", "Udupi", "2026-01-22", 1.86, "WON", V.karavali],
  ["TND-2026-01120", "Drain Rehabilitation — Mangaluru Ring Road", "pwd", "road", "coastal", "Mangaluru", "2026-03-19", 1.42, "WON", V.monsoonline],
  ["TND-2026-02233", "Pothole Rectification Package — Puttur", "pwd", "road", "coastal", "Puttur", "2026-05-06", 1.18, "WON", V.karavali],
  ["TND-2026-02901", "Bridge Approach Repairs — Kundapura", "pwd", "road", "coastal", "Kundapura", "2026-06-18", 0.96, "WON", V.karavali],
  ["TND-2026-03477", "Guardrail & Signage — Coastal Highway Link", "pwd", "road", "coastal", "Karwar", "2026-07-15", 0.84, "WON", V.monsoonline],
  // Earlier and smaller work across five departments and three regions.
  ["TND-2024-00412", "Village Road Metalling — Belthangady Cluster", "rdp", "road", "coastal", "Puttur", "2024-05-14", 0.62, "WON", V.karavali],
  ["TND-2024-00688", "Footpath Reconstruction — Mangaluru Ward 34", "udd", "road", "coastal", "Mangaluru", "2024-06-21", 0.58, "WON", V.monsoonline],
  ["TND-2024-00915", "Canal Bank Road Repairs — Varahi Left Bank", "wrd", "road", "coastal", "Kundapura", "2024-07-30", 0.54, "WON", V.monsoonline],
  ["TND-2024-01204", "Bus Stand Apron Resurfacing — Udupi", "trn", "road", "coastal", "Udupi", "2024-09-05", 0.51, "WON", V.karavali],
  ["TND-2024-01477", "School Compound Wall & Approach — Bhatkal", "pwd", "building", "coastal", "Bhatkal", "2024-10-11", 0.48, "WON", V.karavali],
  ["TND-2024-01702", "Cross Drainage Works — Sullia Block", "rdp", "water", "coastal", "Puttur", "2024-11-19", 0.46, "WON", V.monsoonline],
  ["TND-2024-01944", "Market Road Patch Repairs — Karwar", "udd", "road", "coastal", "Karwar", "2024-12-23", 0.44, "WON", V.monsoonline],
  ["TND-2025-00266", "PHC Approach Road — Hebri", "rdp", "road", "coastal", "Udupi", "2025-01-31", 0.42, "WON", V.karavali],
  ["TND-2025-00501", "Retaining Wall — Agumbe Ghat Section", "pwd", "building", "malnad", "Chikkamagaluru", "2025-02-26", 0.41, "WON", V.ghatroad],
  ["TND-2025-00760", "Village Road Culverts — Sringeri Cluster", "rdp", "road", "malnad", "Chikkamagaluru", "2025-03-27", 0.39, "WON", V.ghatroad],
  ["TND-2025-01012", "Storm Water Drain — Shivamogga Ward 12", "udd", "water", "malnad", "Shivamogga", "2025-04-24", 0.38, "WON", V.tunga],
  ["TND-2025-01355", "Depot Yard Repairs — Hassan Depot", "trn", "road", "malnad", "Hassan", "2025-05-22", 0.36, "WON", V.sahyadri],
  ["TND-2025-01610", "Lift Irrigation Access Road — Bhadra Command", "wrd", "road", "malnad", "Shivamogga", "2025-06-18", 0.35, "WON", V.tunga],
  ["TND-2025-01988", "Anganwadi Building Repairs — Mysuru Taluk", "rdp", "building", "mysuru", "Mysuru", "2025-07-15", 0.34, "WON", V.ironwood],
  ["TND-2025-02276", "Ring Road Shoulder Works — Mandya", "udd", "road", "mysuru", "Mandya", "2025-08-19", 0.33, "WON", V.ironwood],
  ["TND-2025-02540", "Canal Inspection Path — Nanjangud", "wrd", "road", "mysuru", "Nanjangud", "2025-09-23", 0.32, "WON", V.riverbend],
  ["TND-2025-02955", "Bus Shelter Foundations — Chamarajanagar", "trn", "building", "mysuru", "Chamarajanagar", "2025-10-28", 0.31, "WON", V.ironwood],
  ["TND-2026-00133", "Village Road Repairs — Mysuru North Cluster", "rdp", "road", "mysuru", "Mysuru", "2026-01-08", 0.3, "WON", V.ironwood],
  ["TND-2026-00905", "Drain Desilting & Repairs — Mangaluru South", "udd", "water", "coastal", "Mangaluru", "2026-02-25", 0.29, "WON", V.monsoonline],
  ["TND-2026-01766", "Depot Access Road — Mangaluru Depot", "trn", "road", "coastal", "Mangaluru", "2026-04-14", 0.29, "WON", V.karavali],
  // Tenders the vendor bid for and did not win.
  ["TND-2024-00533", "Rural Road Metalling — Karkala Cluster", "rdp", "road", "coastal", "Udupi", "2024-06-04", 0.55, "LOST", V.karavali],
  ["TND-2024-01098", "Footpath Works — Udupi Ward 9", "udd", "road", "coastal", "Udupi", "2024-08-16", 0.48, "LOST", V.karavali],
  ["TND-2025-00188", "Building Repairs — Taluk Office Puttur", "pwd", "building", "coastal", "Puttur", "2025-01-20", 0.42, "LOST", V.karavali],
  ["TND-2025-02110", "Road Marking Works — Shivamogga Division", "pwd", "road", "malnad", "Shivamogga", "2025-07-29", 0.33, "LOST", V.sahyadri],
  ["TND-2026-02690", "Community Hall Renovation — Bhatkal", "rdp", "building", "coastal", "Bhatkal", "2026-06-02", 0.37, "CANCELLED", V.karavali],
];

export const VERTEX_TENDERS: TenderSeed[] = VERTEX_ROWS.map(
  ([id, title, departmentId, categoryId, regionId, town, awardedOn, cr, outcome, rival]) => ({
    id,
    title,
    departmentId,
    categoryId,
    regionId,
    town,
    evaluation: "L1" as EvaluationMethod,
    publishedOn: addDaysISO(awardedOn, -42),
    deadline: `${addDaysISO(awardedOn, -21)}T15:00`,
    evaluatedOn: addDaysISO(awardedOn, -12),
    awardedOn: outcome === "CANCELLED" ? undefined : awardedOn,
    status: outcome === "CANCELLED" ? ("CANCELLED" as TenderStatus) : undefined,
    awardCr: outcome === "CANCELLED" ? undefined : cr,
    winner: outcome === "WON" ? V.vertex : outcome === "LOST" ? rival : undefined,
    bidders: [V.vertex, rival, ...(cr > 0.5 ? [V.karavali === rival ? V.monsoonline : V.karavali] : [])],
    spreadPct: 6 + (Math.round(cr * 100) % 9),
    scope: "Departmental works package",
  }),
);

/* ------------------------------------------------------------------ */
/* 4. Tenders behind the other open cases                              */
/* ------------------------------------------------------------------ */

export const CASE_TENDERS: TenderSeed[] = [
  {
    id: "TND-2026-03914",
    title: "Oxygen Concentrators & Consumables — District Hospitals",
    departmentId: "hfw",
    categoryId: "medeq",
    regionId: "bengaluru",
    town: "Bengaluru Urban",
    publishedOn: "2026-06-29",
    deadline: "2026-07-20T15:00",
    evaluatedOn: "2026-07-27",
    awardedOn: "2026-08-05",
    estimateCr: 2.4,
    awardCr: 2.86,
    winner: V.meridian,
    bidders: [V.meridian, V.lifeline, V.aurora],
    spreadPct: 5.6,
    scope: "Supply and 3-year maintenance of 180 oxygen concentrators",
  },
  {
    id: "TND-2026-02650",
    title: "Hospital Management System — AMC & Enhancement",
    departmentId: "hfw",
    categoryId: "it",
    regionId: "bengaluru",
    town: "Bengaluru Urban",
    method: "LIMITED_TENDER",
    publishedOn: "2026-06-05",
    deadline: "2026-06-12T15:00",
    evaluatedOn: "2026-06-18",
    awardedOn: "2026-06-24",
    estimateCr: 1.9,
    awardCr: 1.94,
    winner: V.quillon,
    bidders: [V.quillon],
    spreadPct: 0,
    scope: "Annual maintenance and enhancement of the hospital management platform",
  },
  {
    id: "TND-2026-01633",
    title: "Rural Road Culverts Package — Ballari",
    departmentId: "rdp",
    categoryId: "road",
    regionId: "kalyana",
    town: "Ballari",
    publishedOn: "2026-02-16",
    deadline: "2026-03-09T15:00",
    evaluatedOn: "2026-03-16",
    awardedOn: "2026-03-24",
    estimateCr: 3.1,
    awardCr: 3.24,
    winner: V.stratum,
    bidders: [V.stratum, V.deccan, V.terracebeam, V.graniteline],
    spreadPct: 7.8,
    scope: "Reconstruction of 46 cross drainage works across four taluks",
  },
  {
    id: "TND-2026-02480",
    title: "Bus Depot Resurfacing — Mangaluru Depot",
    departmentId: "trn",
    categoryId: "road",
    regionId: "coastal",
    town: "Mangaluru",
    publishedOn: "2026-04-20",
    deadline: "2026-05-11T15:00",
    evaluatedOn: "2026-05-18",
    awardedOn: "2026-05-26",
    estimateCr: 1.38,
    awardCr: 1.62,
    winner: V.northstar,
    bids: [
      { vendorId: V.northstar, cr: 1.62 },
      { vendorId: V.vertex, cr: 1.63 },
      { vendorId: V.apex, cr: 1.634 },
    ],
    scope: "Resurfacing of depot yard and approach roads, 4.8 ha",
  },
  {
    id: "TND-2026-03702",
    title: "Drip Irrigation Kits — Raichur District",
    departmentId: "agr",
    categoryId: "agri",
    regionId: "kalyana",
    town: "Raichur",
    publishedOn: "2026-06-22",
    deadline: "2026-07-13T15:00",
    evaluatedOn: "2026-07-20",
    awardedOn: "2026-07-28",
    estimateCr: 0.94,
    awardCr: 1.12,
    winner: V.harrow,
    bidders: [V.harrow, V.kisandrip, V.greenfurrow],
    spreadPct: 6.4,
    scope: "Supply of 1,240 subsidised drip irrigation kits",
  },
  {
    id: "TND-2026-00988",
    title: "Diagnostic Reagents Rate Contract — 2026-27",
    departmentId: "hfw",
    categoryId: "medsup",
    regionId: "bengaluru",
    town: "Bengaluru Urban",
    method: "RATE_CONTRACT",
    publishedOn: "2026-01-19",
    deadline: "2026-02-09T15:00",
    evaluatedOn: "2026-02-16",
    awardedOn: "2026-02-24",
    estimateCr: 3.9,
    awardCr: 4.15,
    winner: V.kestrel,
    bidders: [V.kestrel, V.meridian, V.sunrise, V.carewell],
    spreadPct: 9.1,
    scope: "Annual rate contract for laboratory reagents across 34 district facilities",
  },
  {
    id: "TND-2026-04020",
    title: "Water Supply Pipeline Extension — Shivamogga",
    departmentId: "wrd",
    categoryId: "water",
    regionId: "malnad",
    town: "Shivamogga",
    publishedOn: "2026-07-08",
    deadline: "2026-07-29T15:00",
    evaluatedOn: "2026-07-30",
    awardedOn: "2026-07-31",
    estimateCr: 2.35,
    awardCr: 2.48,
    winner: V.tunga,
    bidders: [V.tunga, V.riverbend, V.monsoonline],
    spreadPct: 8.4,
    scope: "14.6 km transmission main and two service reservoirs",
  },
  {
    id: "TND-2025-03302",
    title: "Fleet Maintenance Services — Bengaluru Depot",
    departmentId: "trn",
    categoryId: "transport",
    regionId: "bengaluru",
    town: "Bengaluru Urban",
    publishedOn: "2025-11-24",
    deadline: "2025-12-15T15:00",
    evaluatedOn: "2025-12-22",
    awardedOn: "2025-12-30",
    estimateCr: 1.7,
    awardCr: 1.78,
    winner: V.corvid,
    bidders: [V.corvid, V.roadrunner, V.silverline],
    spreadPct: 7.2,
    scope: "Preventive and breakdown maintenance for 412 vehicles (24 months)",
  },
  {
    id: "TND-2026-03110",
    title: "Mid-day Meal Kitchen Equipment — Hassan",
    departmentId: "edu",
    categoryId: "edumat",
    regionId: "malnad",
    town: "Hassan",
    publishedOn: "2026-05-18",
    deadline: "2026-06-08T15:00",
    evaluatedOn: "2026-06-15",
    awardedOn: "2026-06-23",
    estimateCr: 0.8,
    awardCr: 0.86,
    winner: V.hearth,
    bidders: [V.hearth, V.pantry],
    spreadPct: 2.4,
    scope: "Steam cooking units and storage systems for 96 school kitchens",
  },
  {
    id: "TND-2026-02155",
    title: "PHC Building Renovation — Udupi Taluk",
    departmentId: "hfw",
    categoryId: "building",
    regionId: "coastal",
    town: "Udupi",
    publishedOn: "2026-03-30",
    deadline: "2026-04-20T15:00",
    evaluatedOn: "2026-04-27",
    awardedOn: "2026-05-05",
    estimateCr: 0.78,
    awardCr: 0.94,
    winner: V.apex,
    bidders: [V.apex, V.karavali, V.monsoonline],
    spreadPct: 6.8,
    scope: "Renovation of four primary health centers",
  },
];

/** Kitchen-equipment packages where the same two suppliers are the whole field. */
export const PAIR_TENDERS: TenderSeed[] = (
  [
    ["TND-2025-00722", "Mid-day Meal Kitchen Equipment — Shivamogga", "Shivamogga", "2025-02-19", 0.72, V.hearth],
    ["TND-2025-01844", "Kitchen Utensils & Storage — Chikkamagaluru", "Chikkamagaluru", "2025-06-24", 0.41, V.pantry],
    ["TND-2025-02970", "Steam Cooking Units — Hassan Cluster", "Hassan", "2025-10-30", 0.58, V.hearth],
    ["TND-2026-00821", "Kitchen Modernisation — Madikeri", "Madikeri", "2026-02-05", 0.49, V.pantry],
    ["TND-2026-02310", "Serving Counters & Trolleys — Shivamogga", "Shivamogga", "2026-05-12", 0.36, V.hearth],
  ] as [string, string, string, string, number, string][]
).map(([id, title, town, awardedOn, cr, winner]) => ({
  id,
  title,
  departmentId: "edu" as DepartmentId,
  categoryId: "edumat" as CategoryId,
  regionId: "malnad" as RegionId,
  town,
  evaluation: "L1" as EvaluationMethod,
  publishedOn: addDaysISO(awardedOn, -38),
  deadline: `${addDaysISO(awardedOn, -17)}T15:00`,
  evaluatedOn: addDaysISO(awardedOn, -8),
  awardedOn,
  awardCr: cr,
  winner,
  bidders: [V.hearth, V.pantry],
  spreadPct: 2.8,
  scope: "Supply and installation of school kitchen equipment",
}));

/** Two further sets of purchases that sit just under the threshold. */
export const SPLIT_CLUSTERS: TenderSeed[] = (
  [
    ["TND-2026-01712", "Soil Testing Kits — Raichur Block A", "agr", "agri", "kalyana", "Raichur", "2026-04-07", 0.238, V.harrow],
    ["TND-2026-01749", "Soil Testing Kits — Raichur Block B", "agr", "agri", "kalyana", "Raichur", "2026-04-20", 0.226, V.harrow],
    ["TND-2026-01806", "Soil Testing Kits — Raichur Block C", "agr", "agri", "kalyana", "Raichur", "2026-05-03", 0.241, V.harrow],
    ["TND-2026-00934", "Surgical Consumables — Belagavi Batch 1", "hfw", "medsup", "kittur", "Belagavi", "2026-02-09", 0.244, V.sunrise],
    ["TND-2026-00971", "Surgical Consumables — Belagavi Batch 2", "hfw", "medsup", "kittur", "Belagavi", "2026-02-24", 0.232, V.sunrise],
    ["TND-2026-01021", "Surgical Consumables — Belagavi Batch 3", "hfw", "medsup", "kittur", "Belagavi", "2026-03-12", 0.218, V.sunrise],
  ] as [string, string, DepartmentId, CategoryId, RegionId, string, string, number, string][]
).map(([id, title, departmentId, categoryId, regionId, town, awardedOn, cr, winner]) => ({
  id,
  title,
  departmentId,
  categoryId,
  regionId,
  town,
  method: "DIRECT_PURCHASE" as ProcurementMethod,
  evaluation: "L1" as EvaluationMethod,
  publishedOn: addDaysISO(awardedOn, -10),
  deadline: `${addDaysISO(awardedOn, -4)}T15:00`,
  evaluatedOn: addDaysISO(awardedOn, -2),
  awardedOn,
  awardCr: cr,
  winner,
  bidders: [winner, winner === V.harrow ? V.greenfurrow : V.carewell],
  spreadPct: 4.2,
  scope: "Direct purchase under the delegated financial threshold",
}));

/** Five direct purchases that sit just under the open-tender threshold. */
export const SPLIT_TENDERS: TenderSeed[] = [
  ["TND-2026-03801", "Learning Kits — Grade 1–3, North Cluster", "2026-07-02", 0.246],
  ["TND-2026-03812", "Learning Kits — Grade 4–5, North Cluster", "2026-07-06", 0.242],
  ["TND-2026-03829", "Learning Kits — Grade 1–3, South Cluster", "2026-07-09", 0.238],
  ["TND-2026-03844", "Learning Kits — Grade 4–5, South Cluster", "2026-07-15", 0.229],
  ["TND-2026-03858", "Learning Kits — Supplementary Readers", "2026-07-21", 0.214],
].map(([id, title, awardedOn, cr]) => ({
  id: id as string,
  title: title as string,
  departmentId: "edu" as DepartmentId,
  categoryId: "edumat" as CategoryId,
  regionId: "bengaluru" as RegionId,
  town: "Bengaluru Rural",
  method: "DIRECT_PURCHASE" as ProcurementMethod,
  evaluation: "L1" as EvaluationMethod,
  publishedOn: addDaysISO(awardedOn as string, -9),
  deadline: `${addDaysISO(awardedOn as string, -3)}T15:00`,
  evaluatedOn: addDaysISO(awardedOn as string, -1),
  awardedOn: awardedOn as string,
  awardCr: cr as number,
  winner: V.lumen,
  bidders: [V.lumen, V.brightdesk],
  spreadPct: 3.1,
  scope: "Direct purchase under the delegated financial threshold",
}));

/* ------------------------------------------------------------------ */
/* 5. Tenders behind closed cases                                      */
/* ------------------------------------------------------------------ */

export const HISTORICAL_TENDERS: TenderSeed[] = [
  {
    id: "TND-2025-02011",
    title: "Emergency Medical Consumables — Dengue Response",
    departmentId: "hfw",
    categoryId: "medsup",
    regionId: "coastal",
    town: "Mangaluru",
    method: "SINGLE_SOURCE",
    publishedOn: "2025-07-02",
    deadline: "2025-07-06T15:00",
    evaluatedOn: "2025-07-07",
    awardedOn: "2025-07-09",
    estimateCr: 0.6,
    awardCr: 0.68,
    winner: V.tidewater,
    bidders: [V.tidewater],
    spreadPct: 0,
    scope: "Emergency supply of consumables under a declared outbreak response",
  },
  {
    id: "TND-2025-02466",
    title: "Laptops for Secondary Schools — Phase 2",
    departmentId: "edu",
    categoryId: "it",
    regionId: "bengaluru",
    town: "Bengaluru Urban",
    publishedOn: "2025-08-04",
    deadline: "2025-08-25T15:00",
    evaluatedOn: "2025-09-01",
    awardedOn: "2025-09-09",
    estimateCr: 2.3,
    awardCr: 2.42,
    winner: V.datastream,
    bidders: [V.datastream, V.quillon, V.cobalt, V.nimbus],
    spreadPct: 11.4,
    scope: "Supply of 1,850 laptops with three-year on-site warranty",
  },
  {
    id: "TND-2025-03501",
    title: "Bridge Repairs — Netravati Crossing",
    departmentId: "pwd",
    categoryId: "building",
    regionId: "coastal",
    town: "Mangaluru",
    publishedOn: "2025-12-08",
    deadline: "2025-12-29T15:00",
    evaluatedOn: "2026-01-05",
    awardedOn: "2026-01-13",
    estimateCr: 2.95,
    awardCr: 3.16,
    winner: V.karavali,
    bidders: [V.karavali, V.vertex, V.monsoonline, V.apex],
    spreadPct: 9.8,
    scope: "Structural repairs and bearing replacement",
  },
  {
    id: "TND-2026-00475",
    title: "GPS Tracking for Ambulances",
    departmentId: "hfw",
    categoryId: "transport",
    regionId: "kittur",
    town: "Hubballi",
    publishedOn: "2026-01-05",
    deadline: "2026-01-26T15:00",
    evaluatedOn: "2026-02-02",
    awardedOn: "2026-02-10",
    estimateCr: 0.5,
    awardCr: 0.55,
    winner: V.silverline,
    bidders: [V.silverline, V.corvid, V.cobalt],
    spreadPct: 8.6,
    scope: "Installation and monitoring for 240 ambulances",
  },
];

export const STORY_TENDERS: TenderSeed[] = [
  ...CLUSTER_TENDERS,
  ...COMPARABLE_TENDERS,
  ...VERTEX_TENDERS,
  ...CASE_TENDERS,
  ...PAIR_TENDERS,
  ...SPLIT_CLUSTERS,
  ...SPLIT_TENDERS,
  ...HISTORICAL_TENDERS,
];

export const SPLIT_TENDER_IDS = SPLIT_TENDERS.map((t) => t.id);
export const HARROW_SPLIT_IDS = SPLIT_CLUSTERS.slice(0, 3).map((t) => t.id);
export const SUNRISE_SPLIT_IDS = SPLIT_CLUSTERS.slice(3).map((t) => t.id);
export const PAIR_TENDER_IDS = PAIR_TENDERS.map((t) => t.id);

export const CLUSTER_VENDORS = CLUSTER;
export const CLUSTER_TENDER_IDS = CLUSTER_TENDERS.filter((t) => t.bids || t.bidders?.length).map(
  (t) => t.id,
);
