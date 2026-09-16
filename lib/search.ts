import { CASES } from "@/data/cases";
import { BIDS_BY_TENDER, CONTRACTS, TENDERS } from "@/data/procurement";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, REGION_BY_ID } from "@/data/reference";
import { SIGNALS } from "@/data/signals";
import { VENDORS, VENDOR_BY_ID } from "@/data/vendors";
import { formatINR } from "@/lib/format";
import type { AnomalySignal, InvestigationCase } from "@/types";

export type SearchKind = "VENDOR" | "TENDER" | "CONTRACT" | "CASE" | "SIGNAL";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

interface IndexEntry {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  haystack: string;
  primary: string;
}

let index: IndexEntry[] | null = null;

function buildIndex(extraCases: InvestigationCase[], extraSignals: AnomalySignal[]): IndexEntry[] {
  const entries: IndexEntry[] = [];

  for (const vendor of VENDORS) {
    entries.push({
      kind: "VENDOR",
      id: vendor.id,
      title: vendor.name,
      subtitle: `${vendor.id} · ${vendor.city} · ${CATEGORY_BY_ID[vendor.primaryCategory].name}`,
      href: `/vendors/${vendor.id}`,
      primary: vendor.name.toLowerCase(),
      haystack: [vendor.id, vendor.name, vendor.city, REGION_BY_ID[vendor.regionId].name, ...vendor.categories.map((c) => CATEGORY_BY_ID[c].name)]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const tender of TENDERS) {
    const bidders = (BIDS_BY_TENDER.get(tender.id) ?? []).map((b) => VENDOR_BY_ID[b.vendorId]?.name ?? "");
    entries.push({
      kind: "TENDER",
      id: tender.id,
      title: tender.title,
      subtitle: `${tender.id} · ${DEPARTMENT_BY_ID[tender.departmentId].short} · ${tender.awardValue ? formatINR(tender.awardValue) : "not awarded"}`,
      href: `/procurement/${tender.id}`,
      primary: tender.title.toLowerCase(),
      haystack: [
        tender.id,
        tender.title,
        tender.location,
        DEPARTMENT_BY_ID[tender.departmentId].name,
        CATEGORY_BY_ID[tender.categoryId].name,
        REGION_BY_ID[tender.regionId].name,
        ...bidders,
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const contract of CONTRACTS) {
    const vendor = VENDOR_BY_ID[contract.vendorId]?.name ?? "";
    entries.push({
      kind: "CONTRACT",
      id: contract.id,
      title: contract.title,
      subtitle: `${contract.id} · ${vendor} · ${formatINR(contract.value)}`,
      href: `/contracts?contract=${contract.id}`,
      primary: contract.title.toLowerCase(),
      haystack: [contract.id, contract.title, vendor, contract.tenderId].join(" ").toLowerCase(),
    });
  }

  for (const investigation of [...CASES, ...extraCases]) {
    const vendors = [investigation.vendorId, ...investigation.relatedVendorIds].map((id) => VENDOR_BY_ID[id]?.name ?? "");
    entries.push({
      kind: "CASE",
      id: investigation.id,
      title: investigation.title,
      subtitle: `${investigation.id} · ${investigation.primarySignal}`,
      href: `/investigations/${investigation.id}`,
      primary: investigation.title.toLowerCase(),
      haystack: [investigation.id, investigation.title, investigation.primarySignal, investigation.tenderId, ...vendors]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const signal of [...SIGNALS, ...extraSignals]) {
    const vendors = signal.vendorIds.map((id) => VENDOR_BY_ID[id]?.name ?? id);
    entries.push({
      kind: "SIGNAL",
      id: signal.id,
      title: signal.title,
      subtitle: `${signal.id} · ${signal.headline}`,
      href: `/alerts?signal=${signal.id}`,
      primary: signal.title.toLowerCase(),
      haystack: [signal.id, signal.title, signal.headline, ...signal.tenderIds, ...vendors].join(" ").toLowerCase(),
    });
  }

  return entries;
}

export function searchAll(
  query: string,
  options: { limit?: number; extraCases?: InvestigationCase[]; extraSignals?: AnomalySignal[] } = {},
): Record<SearchKind, SearchResult[]> {
  const empty: Record<SearchKind, SearchResult[]> = { VENDOR: [], TENDER: [], CONTRACT: [], CASE: [], SIGNAL: [] };
  const q = query.trim().toLowerCase();
  if (q.length < 2) return empty;

  const extraCases = options.extraCases ?? [];
  const extraSignals = options.extraSignals ?? [];
  const entries =
    extraCases.length || extraSignals.length
      ? buildIndex(extraCases, extraSignals)
      : (index ??= buildIndex([], []));

  const tokens = q.split(/\s+/).filter(Boolean);
  const results = { ...empty } as Record<SearchKind, SearchResult[]>;
  for (const kind of Object.keys(results) as SearchKind[]) results[kind] = [];

  for (const entry of entries) {
    if (!tokens.every((token) => entry.haystack.includes(token))) continue;
    let score = 1;
    if (entry.id.toLowerCase() === q) score += 100;
    else if (entry.id.toLowerCase().startsWith(q)) score += 40;
    if (entry.primary.startsWith(q)) score += 30;
    else if (entry.primary.includes(q)) score += 15;
    results[entry.kind].push({
      kind: entry.kind,
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      href: entry.href,
      score,
    });
  }

  for (const kind of Object.keys(results) as SearchKind[]) {
    results[kind].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    if (options.limit) results[kind] = results[kind].slice(0, options.limit);
  }

  return results;
}

export function countResults(results: Record<SearchKind, SearchResult[]>) {
  return Object.values(results).reduce((s, list) => s + list.length, 0);
}
