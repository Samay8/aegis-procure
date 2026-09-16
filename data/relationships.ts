import type { EntityKind, Relationship, RelationshipStrength } from "@/types";
import { BIDS_BY_VENDOR, TENDER_BY_ID } from "./procurement";
import { ADDRESSES, NAMED_VENDORS, V, VENDOR_BY_ID } from "./vendors";

/** Non-vendor entities two vendors can be linked through. */
export const ENTITIES: Record<string, { id: string; kind: EntityKind; label: string; detail: string }> = {
  "ADDR-0091": {
    id: "ADDR-0091",
    kind: "ADDRESS",
    label: "Seabreeze Trade Center, Unit 3B",
    detail: ADDRESSES.seabreeze.label,
  },
  "ADDR-0148": {
    id: "ADDR-0148",
    kind: "ADDRESS",
    label: "Baad Industrial Estate, Plot 12",
    detail: ADDRESSES.baad12.label,
  },
  "ADDR-0377": {
    id: "ADDR-0377",
    kind: "ADDRESS",
    label: "Eleven Commons Workspace",
    detail: `${ADDRESSES.elevenCommons.label} — shared office facility`,
  },
  "DIR-2231": {
    id: "DIR-2231",
    kind: "DIRECTOR",
    label: "S. Hegde",
    detail: "Director identification ••••2231 · appears on two vendor boards",
  },
  "DIR-3390": {
    id: "DIR-3390",
    kind: "DIRECTOR",
    label: "P. Ramanna",
    detail: "Director identification ••••3390 · resigned from one board in Nov 2024",
  },
  "CON-0447": {
    id: "CON-0447",
    kind: "CONTACT",
    label: "+91 824 ••• 4471",
    detail: "Contact number listed in bid documents",
  },
  "CON-0298": {
    id: "CON-0298",
    kind: "CONTACT",
    label: "+91 80 ••• 2298",
    detail: "Contact number listed in supplier registration",
  },
  "CON-0612": {
    id: "CON-0612",
    kind: "CONTACT",
    label: "tenders@•••edusupply.in",
    detail: "Email address on tender correspondence",
  },
  "CON-0731": {
    id: "CON-0731",
    kind: "CONTACT",
    label: "+91 8172 ••• 731",
    detail: "Contact number on bid covering letters",
  },
  "CON-0355": {
    id: "CON-0355",
    kind: "CONTACT",
    label: "accounts@•••pharmalog.in",
    detail: "Email address on invoices",
  },
  "OWN-0113": {
    id: "OWN-0113",
    kind: "OWNER",
    label: "C. Hiremath (26%)",
    detail: "Shareholding recorded in both vendors' annual returns",
  },
  "OWN-0225": {
    id: "OWN-0225",
    kind: "OWNER",
    label: "Gowda Holdings (unlisted)",
    detail: "Holding entity recorded in shareholding returns",
  },
  "REG-0084": {
    id: "REG-0084",
    kind: "REGISTRATION",
    label: "Filing agent FA-0084",
    detail: "Same registration agent filed both vendors' returns",
  },
  "BANK-0451": {
    id: "BANK-0451",
    kind: "BANK_ACCOUNT",
    label: "Account ••••0451",
    detail: "Receiving account in sub-contract payment advices",
  },
};

interface AuthoredRelationship {
  id: string;
  type: Relationship["type"];
  a: string;
  b: string;
  via?: string;
  strength: RelationshipStrength;
  firstObserved: string;
  lastObserved: string;
  summary: string;
  matchScore?: number;
  context?: string;
  verification?: Relationship["verification"];
  evidence: { recordId: string; source: string; date: string; detail: string }[];
}

const AUTHORED: AuthoredRelationship[] = [
  {
    id: "REL-0001",
    type: "SHARED_ADDRESS",
    a: V.vertex,
    b: V.northstar,
    via: "ADDR-0091",
    strength: "HIGH",
    firstObserved: "2025-03-18",
    lastObserved: "2026-08-05",
    matchScore: 100,
    summary:
      "Both vendors give the same registered address. The address has been common to both records since March 2025 and appears in bid documents for the current package.",
    evidence: [
      {
        recordId: "VRF-2025-3318",
        source: "Vendor registry · address change filing",
        date: "2025-03-18",
        detail: "Northstar Roads Ltd changed its registered address to Unit 3B, Seabreeze Trade Center.",
      },
      {
        recordId: "VRF-2025-3319",
        source: "Vendor registry · registration record",
        date: "2025-03-18",
        detail: "Vertex Infra Pvt Ltd has held the same address since June 2016.",
      },
      {
        recordId: "BID-38271",
        source: "Bid document · correspondence address",
        date: "2026-08-04",
        detail: "Bid cover page lists Unit 3B, Seabreeze Trade Center.",
      },
      {
        recordId: "BID-38304",
        source: "Bid document · correspondence address",
        date: "2026-08-05",
        detail: "Bid cover page lists the same unit number and floor.",
      },
    ],
  },
  {
    id: "REL-0002",
    type: "SHARED_DIRECTOR",
    a: V.apex,
    b: V.bluegrid,
    via: "DIR-2231",
    strength: "HIGH",
    firstObserved: "2025-01-12",
    lastObserved: "2026-08-14",
    summary:
      "One director is common to both vendors and was active on both boards throughout the coastal maintenance program.",
    evidence: [
      {
        recordId: "DIR-REG-2231A",
        source: "Corporate filings · director register",
        date: "2025-01-12",
        detail: "Appointment recorded on the BlueGrid Infrastructure board.",
      },
      {
        recordId: "DIR-REG-2231B",
        source: "Corporate filings · director register",
        date: "2017-09-21",
        detail: "Partner of record for Apex Civilworks since registration.",
      },
      {
        recordId: "AR-2025-0882",
        source: "Annual return 2025-26",
        date: "2026-06-30",
        detail: "Directorship listed as continuing in both filings.",
      },
      {
        recordId: "AWD-2026-0733",
        source: "Award file · bidder declarations",
        date: "2026-08-14",
        detail: "Both vendors filed independent-bidder declarations for the same package.",
      },
    ],
  },
  {
    id: "REL-0003",
    type: "SHARED_PHONE",
    a: V.vertex,
    b: V.apex,
    via: "CON-0447",
    strength: "MEDIUM",
    firstObserved: "2025-06-02",
    lastObserved: "2026-08-05",
    summary: "The same contact number appears on bid documents filed by both vendors in two tenders.",
    evidence: [
      {
        recordId: "BID-CORR-1841",
        source: "Bid document · contact block",
        date: "2025-06-02",
        detail: "Number listed as the site contact on the Zone 3 package.",
      },
      {
        recordId: "BID-38309",
        source: "Bid document · contact block",
        date: "2026-08-05",
        detail: "Same number listed on the current package bid.",
      },
    ],
  },
  {
    id: "REL-0004",
    type: "SHARED_ADDRESS",
    a: V.kestrel,
    b: V.aurora,
    via: "ADDR-0377",
    strength: "LOW",
    firstObserved: "2020-02-19",
    lastObserved: "2026-07-02",
    matchScore: 100,
    verification: "CONTEXT_EXPLAINED",
    context:
      "The address is a registered shared-office facility with 38 companies on record. Address match alone carries little weight here.",
    summary: "Both vendors are registered at a shared-office facility used by many unrelated companies.",
    evidence: [
      {
        recordId: "VRF-2020-1174",
        source: "Vendor registry · registration record",
        date: "2020-02-19",
        detail: "Aurora Medtech registered at Eleven Commons Workspace.",
      },
      {
        recordId: "ADDR-AUDIT-0377",
        source: "Address resolution · facility check",
        date: "2026-07-02",
        detail: "38 active registrations recorded at the same facility.",
      },
    ],
  },
  {
    id: "REL-0005",
    type: "SHARED_ADDRESS",
    a: V.bluegrid,
    b: V.monsoonline,
    via: "ADDR-0148",
    strength: "LOW",
    firstObserved: "2018-01-11",
    lastObserved: "2026-04-14",
    matchScore: 92,
    verification: "CONTEXT_EXPLAINED",
    context:
      "Plot 12 and Plot 12-A are separate allotments in the same industrial estate. The match is partial, not exact.",
    summary: "Registered addresses differ by unit number within one industrial estate.",
    evidence: [
      {
        recordId: "VRF-2018-0902",
        source: "Vendor registry · registration record",
        date: "2018-01-11",
        detail: "BlueGrid Infrastructure registered at Plot 12.",
      },
      {
        recordId: "KIADB-ALLOT-1249",
        source: "Industrial estate allotment register",
        date: "2015-09-23",
        detail: "Plot 12-A allotted separately to Monsoon Line Engineering.",
      },
    ],
  },
  {
    id: "REL-0006",
    type: "COMMON_OWNERSHIP",
    a: V.stratum,
    b: V.terracebeam,
    via: "OWN-0113",
    strength: "MEDIUM",
    firstObserved: "2024-09-30",
    lastObserved: "2026-06-30",
    summary:
      "A shareholder with a 26% stake in one vendor is a partner of record in the other. Both bid for the same culverts package.",
    evidence: [
      {
        recordId: "AR-2024-4417",
        source: "Annual return 2024-25 · shareholding",
        date: "2024-09-30",
        detail: "26% shareholding recorded in Stratum Buildcon Pvt Ltd.",
      },
      {
        recordId: "PART-DEED-0331",
        source: "Partnership deed",
        date: "2018-10-05",
        detail: "Named partner in Terrace & Beam Builders.",
      },
      {
        recordId: "AR-2026-4418",
        source: "Annual return 2025-26 · shareholding",
        date: "2026-06-30",
        detail: "Shareholding unchanged.",
      },
    ],
  },
  {
    id: "REL-0007",
    type: "SHARED_EMAIL",
    a: V.lumen,
    b: V.brightdesk,
    via: "CON-0612",
    strength: "MEDIUM",
    firstObserved: "2025-04-11",
    lastObserved: "2026-07-21",
    summary:
      "Tender correspondence for both vendors is sent from the same email address, including for the five learning-kit purchases.",
    evidence: [
      {
        recordId: "MAIL-LOG-8841",
        source: "Procurement portal · correspondence log",
        date: "2025-04-11",
        detail: "Registered correspondence address for both supplier accounts.",
      },
      {
        recordId: "PO-2026-7741",
        source: "Purchase order file",
        date: "2026-07-02",
        detail: "Quotation from the second vendor sent from the same address.",
      },
      {
        recordId: "PO-2026-7745",
        source: "Purchase order file",
        date: "2026-07-21",
        detail: "Same pattern on the fifth purchase order.",
      },
    ],
  },
  {
    id: "REL-0008",
    type: "SHARED_PHONE",
    a: V.meridian,
    b: V.carewell,
    via: "CON-0298",
    strength: "MEDIUM",
    firstObserved: "2024-11-08",
    lastObserved: "2026-02-09",
    summary: "Supplier registrations for both vendors carry the same contact number.",
    evidence: [
      {
        recordId: "VRF-2024-7712",
        source: "Vendor registry · contact block",
        date: "2024-11-08",
        detail: "Number recorded against both supplier registrations.",
      },
      {
        recordId: "BID-RC-2026-114",
        source: "Rate contract bid file",
        date: "2026-02-09",
        detail: "Both vendors bid for the reagents rate contract.",
      },
    ],
  },
  {
    id: "REL-0009",
    type: "SHARED_PHONE",
    a: V.hearth,
    b: V.pantry,
    via: "CON-0731",
    strength: "MEDIUM",
    firstObserved: "2025-02-19",
    lastObserved: "2026-06-08",
    summary: "Bid covering letters from both vendors list the same contact number.",
    evidence: [
      {
        recordId: "BID-COV-4471",
        source: "Bid document · covering letter",
        date: "2025-02-19",
        detail: "Contact number identical on both covering letters.",
      },
      {
        recordId: "BID-COV-5518",
        source: "Bid document · covering letter",
        date: "2026-06-08",
        detail: "Same number on the kitchen equipment package.",
      },
    ],
  },
  {
    id: "REL-0010",
    type: "SHARED_REGISTRATION",
    a: V.quillon,
    b: V.datastream,
    via: "REG-0084",
    strength: "LOW",
    firstObserved: "2017-06-28",
    lastObserved: "2026-06-30",
    verification: "CONTEXT_EXPLAINED",
    context:
      "The filing agent files returns for 112 companies. A common agent is an administrative link, not an ownership link.",
    summary: "Both vendors' statutory filings were submitted by the same registration agent.",
    evidence: [
      {
        recordId: "FILING-AGENT-0084",
        source: "Corporate filings · agent record",
        date: "2017-06-28",
        detail: "Agent recorded on both incorporation filings.",
      },
      {
        recordId: "AR-2026-9921",
        source: "Annual return 2025-26",
        date: "2026-06-30",
        detail: "Same agent listed on the latest returns.",
      },
    ],
  },
  {
    id: "REL-0011",
    type: "SHARED_DIRECTOR",
    a: V.harrow,
    b: V.kisandrip,
    via: "DIR-3390",
    strength: "LOW",
    firstObserved: "2019-05-14",
    lastObserved: "2024-11-22",
    verification: "CONTEXT_EXPLAINED",
    context:
      "The directorship ended in November 2024, before both vendors bid for the 2026 drip irrigation package.",
    summary: "A former director of one vendor held a board position in the other until November 2024.",
    evidence: [
      {
        recordId: "DIR-REG-3390A",
        source: "Corporate filings · director register",
        date: "2019-05-14",
        detail: "Appointment recorded.",
      },
      {
        recordId: "DIR-REG-3390B",
        source: "Corporate filings · director register",
        date: "2024-11-22",
        detail: "Resignation recorded.",
      },
    ],
  },
  {
    id: "REL-0012",
    type: "COMMON_OWNERSHIP",
    a: V.tunga,
    b: V.riverbend,
    via: "OWN-0225",
    strength: "MEDIUM",
    firstObserved: "2023-03-31",
    lastObserved: "2026-06-30",
    summary: "Shareholding returns for both vendors name the same unlisted holding entity.",
    evidence: [
      {
        recordId: "AR-2023-2251",
        source: "Annual return 2022-23 · shareholding",
        date: "2023-03-31",
        detail: "Holding entity recorded with a controlling stake in one vendor.",
      },
      {
        recordId: "AR-2026-2252",
        source: "Annual return 2025-26 · shareholding",
        date: "2026-06-30",
        detail: "Same entity recorded as a significant shareholder in the second vendor.",
      },
      {
        recordId: "BID-WRD-2026-77",
        source: "Bid file · pipeline extension",
        date: "2026-07-29",
        detail: "Both vendors bid for the same pipeline package.",
      },
    ],
  },
  {
    id: "REL-0013",
    type: "PAYMENT_LINK",
    a: V.corvid,
    b: V.roadrunner,
    via: "BANK-0451",
    strength: "MEDIUM",
    firstObserved: "2026-02-14",
    lastObserved: "2026-08-19",
    summary:
      "Sub-contract payment advices from one vendor name the other as the receiving party for ₹38.4 L across three transfers.",
    evidence: [
      {
        recordId: "ADV-2026-0114",
        source: "Payment advice",
        date: "2026-02-14",
        detail: "Sub-contract transfer of ₹14.2 L.",
      },
      {
        recordId: "ADV-2026-0233",
        source: "Payment advice",
        date: "2026-05-06",
        detail: "Sub-contract transfer of ₹12.8 L.",
      },
      {
        recordId: "ADV-2026-0361",
        source: "Payment advice",
        date: "2026-08-19",
        detail: "Sub-contract transfer of ₹11.4 L.",
      },
    ],
  },
  {
    id: "REL-0014",
    type: "SHARED_EMAIL",
    a: V.tidewater,
    b: V.sunrise,
    via: "CON-0355",
    strength: "LOW",
    firstObserved: "2025-06-30",
    lastObserved: "2025-06-30",
    summary: "One invoice from each vendor carries the same accounts email address.",
    evidence: [
      {
        recordId: "INV-LOG-2213",
        source: "Invoice register",
        date: "2025-06-30",
        detail: "Single occurrence in the invoice register; not repeated since.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Joint participation, computed from the bid records                  */
/* ------------------------------------------------------------------ */

const NAMED_IDS = new Set(NAMED_VENDORS.map((v) => v.id));

function tenderIdsFor(vendorId: string) {
  return new Set((BIDS_BY_VENDOR.get(vendorId) ?? []).map((b) => b.tenderId));
}

export function sharedTenders(a: string, b: string) {
  const first = tenderIdsFor(a);
  const second = tenderIdsFor(b);
  return [...first].filter((id) => second.has(id)).sort();
}

function buildJointRelationships(): Relationship[] {
  const ids = [...NAMED_IDS];
  const out: Relationship[] = [];
  let seq = 100;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const shared = sharedTenders(ids[i], ids[j]);
      if (shared.length < 3) continue;
      const tenders = shared.map((id) => TENDER_BY_ID.get(id)!).filter(Boolean);
      const dates = tenders.map((t) => t.publishedOn).sort();
      const strength: RelationshipStrength =
        shared.length >= 8 ? "HIGH" : shared.length >= 5 ? "MEDIUM" : "LOW";
      out.push({
        id: `REL-0${++seq}`,
        type: shared.length >= 6 ? "REPEATED_PARTICIPATION" : "JOINT_BIDDING",
        vendorIds: [ids[i], ids[j]],
        strength,
        evidenceCount: shared.length,
        firstObserved: dates[0],
        lastObserved: dates[dates.length - 1],
        summary: `Both vendors submitted bids in ${shared.length} of the same tenders between ${dates[0].slice(0, 4)} and ${dates[dates.length - 1].slice(0, 4)}.`,
        evidence: tenders.slice(0, 6).map((t) => ({
          recordId: t.id,
          source: "Bid register · joint participation",
          date: t.publishedOn,
          detail: `${t.title} — both vendors submitted bids.`,
        })),
        verification: "REQUIRES_VERIFICATION",
      });
    }
  }

  return out.sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 24);
}

export const RELATIONSHIPS: Relationship[] = [
  ...AUTHORED.map<Relationship>((rel) => ({
    id: rel.id,
    type: rel.type,
    vendorIds: [rel.a, rel.b],
    via: rel.via
      ? { kind: ENTITIES[rel.via].kind, id: rel.via, label: ENTITIES[rel.via].label }
      : undefined,
    strength: rel.strength,
    evidenceCount: rel.evidence.length,
    firstObserved: rel.firstObserved,
    lastObserved: rel.lastObserved,
    summary: rel.summary,
    evidence: rel.evidence,
    context: rel.context,
    verification: rel.verification ?? "REQUIRES_VERIFICATION",
    matchScore: rel.matchScore,
  })),
  ...buildJointRelationships(),
];

export const RELATIONSHIP_BY_ID = new Map(RELATIONSHIPS.map((r) => [r.id, r]));

export function relationshipsForVendor(vendorId: string) {
  return RELATIONSHIPS.filter((r) => r.vendorIds.includes(vendorId));
}

export function relationshipBetween(a: string, b: string) {
  return RELATIONSHIPS.filter(
    (r) => r.vendorIds.includes(a) && r.vendorIds.includes(b),
  );
}

export function counterpart(relationship: Relationship, vendorId: string) {
  return relationship.vendorIds[0] === vendorId ? relationship.vendorIds[1] : relationship.vendorIds[0];
}

export function relationshipLabel(relationship: Relationship) {
  const [a, b] = relationship.vendorIds;
  return `${VENDOR_BY_ID[a]?.name ?? a} ↔ ${VENDOR_BY_ID[b]?.name ?? b}`;
}

/** Attribute links (address, director, contact, ownership) carry the strongest weight. */
export const ATTRIBUTE_RELATIONSHIPS = RELATIONSHIPS.filter(
  (r) => r.type !== "JOINT_BIDDING" && r.type !== "REPEATED_PARTICIPATION",
);
