/* Diagnostic script: verifies the synthetic universe is internally consistent. */
import { formatCr, formatINR, daysBetween } from "../lib/format";
import { median } from "../lib/utils";
import {
  AWARDED_TENDERS,
  BIDS,
  BIDS_BY_VENDOR,
  CONTRACTS,
  CONTRACTS_BY_VENDOR,
  PAYMENTS,
  TENDERS,
  TENDER_BY_ID,
  TOTAL_EVENTS,
  TOTAL_VALUE,
  bidSpread,
  bidWindowDays,
  comparableStats,
  comparablesFor,
  medianComparableSpread,
  tendersForVendor,
} from "../data/procurement";
import { CASE_TENDER, CLUSTER_TENDERS, CLUSTER_VENDORS } from "../data/story";
import { RELATIONSHIPS } from "../data/relationships";
import { V, VENDORS, VENDOR_BY_ID } from "../data/vendors";

const line = (label: string, value: unknown) => console.log(label.padEnd(42), value);

console.log("\n=== TOTALS ===");
line("vendors", VENDORS.length);
line("tenders", TENDERS.length);
line("contracts", CONTRACTS.length);
line("bids", BIDS.length);
line("payments", PAYMENTS.length);
line("events", TOTAL_EVENTS);
line("total value", formatCr(TOTAL_VALUE, 2));
line("relationships", RELATIONSHIPS.length);

const byStatus: Record<string, number> = {};
for (const t of TENDERS) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
line("status breakdown", JSON.stringify(byStatus));

console.log("\n=== VERTEX (V-1042) ===");
const vertexTenders = tendersForVendor(V.vertex);
const vertexContracts = CONTRACTS_BY_VENDOR.get(V.vertex) ?? [];
const cancelled = vertexTenders.filter((t) => t.status === "CANCELLED").length;
line("participations", vertexTenders.length);
line("wins", vertexContracts.length);
line("cancelled tenders", cancelled);
line(
  "win rate",
  `${((vertexContracts.length / (vertexTenders.length - cancelled)) * 100).toFixed(1)}%`,
);
line("contract value", formatCr(vertexContracts.reduce((s, c) => s + c.value, 0), 2));
line("departments", new Set(vertexContracts.map((c) => c.departmentId)).size);
line("regions", new Set(vertexContracts.map((c) => c.regionId)).size);

const windowAwards = vertexContracts.filter(
  (c) =>
    c.departmentId === "pwd" &&
    c.categoryId === "road" &&
    daysBetween("2025-07-01", TENDER_BY_ID.get(c.tenderId)!.awardedOn!) >= 0,
);
line("PWD road awards since Jul 2025", windowAwards.length);
line("…value", formatCr(windowAwards.reduce((s, c) => s + c.value, 0), 2));

// Comparable vendors: other vendors with PWD road awards in the same window.
const peers: Record<string, number> = {};
for (const c of CONTRACTS) {
  const t = TENDER_BY_ID.get(c.tenderId)!;
  if (c.departmentId === "pwd" && c.categoryId === "road" && daysBetween("2025-07-01", t.awardedOn!) >= 0) {
    peers[c.vendorId] = (peers[c.vendorId] ?? 0) + 1;
  }
}
const peerCounts = Object.entries(peers).filter(([id]) => id !== V.vertex).map(([, n]) => n);
line(
  "peer vendors / avg awards",
  `${peerCounts.length} / ${(peerCounts.reduce((s, n) => s + n, 0) / peerCounts.length).toFixed(1)}`,
);

console.log("\n=== CASE TENDER ===");
const caseTender = TENDER_BY_ID.get(CASE_TENDER)!;
const stats = comparableStats(caseTender);
line("award value", formatCr(caseTender.awardValue!, 2));
line("comparables", stats.count);
line("median / p25 / p75", `${formatCr(stats.median)} / ${formatCr(stats.p25)} / ${formatCr(stats.p75)}`);
line("deviation", `${stats.deviationPct.toFixed(1)}%`);
line("bid spread", `${bidSpread(CASE_TENDER)!.toFixed(2)}%`);
line("median comparable spread", `${medianComparableSpread(caseTender)!.toFixed(2)}%`);
line("bid window (days)", bidWindowDays(caseTender));
const pwdWindows = AWARDED_TENDERS.filter((t) => t.departmentId === "pwd").map(bidWindowDays);
line("PWD median bid window", median(pwdWindows));

console.log("\n=== CLUSTER ===");
const clusterIds = CLUSTER_TENDERS.filter((t) => t.bids?.length || t.bidders?.length).map((t) => t.id);
line("joint tenders", clusterIds.length);
line(
  "winners in order",
  clusterIds
    .map((id) => TENDER_BY_ID.get(id)!)
    .sort((a, b) => (a.awardedOn ?? "") < (b.awardedOn ?? "") ? -1 : 1)
    .map((t) => VENDOR_BY_ID[t.winnerVendorId ?? ""]?.name.split(" ")[0] ?? "—")
    .join(" → "),
);
for (const v of CLUSTER_VENDORS) {
  const ts = tendersForVendor(v);
  const wins = (CONTRACTS_BY_VENDOR.get(v) ?? []).length;
  line(`  ${VENDOR_BY_ID[v].name}`, `${ts.length} bids · ${wins} awards`);
}

console.log("\n=== CONCENTRATION ===");
function share(departmentId: string, categoryId: string, vendorId: string) {
  const group = CONTRACTS.filter((c) => c.departmentId === departmentId && c.categoryId === categoryId);
  const total = group.reduce((s, c) => s + c.value, 0);
  const mine = group.filter((c) => c.vendorId === vendorId).reduce((s, c) => s + c.value, 0);
  return `${((mine / total) * 100).toFixed(1)}% of ${formatCr(total)} (${group.filter((c) => c.vendorId === vendorId).length}/${group.length} contracts)`;
}
line("Kestrel · hfw medsup", share("hfw", "medsup", V.kestrel));
line("Meridian · hfw medeq", share("hfw", "medeq", V.meridian));
line("Lumen · edu edumat", share("edu", "edumat", V.lumen));
line("Quillon · it", share("hfw", "it", V.quillon));

console.log("\n=== DETECTION HEADROOM (generated only) ===");
const generated = AWARDED_TENDERS.filter((t) => !t.story);
const deviations = generated
  .map((t) => ({ t, s: comparableStats(t) }))
  .filter((x) => x.s.count >= 10)
  .sort((a, b) => b.s.deviationPct - a.s.deviationPct)
  .slice(0, 10);
for (const d of deviations) {
  line(`  ${d.t.id} ${d.t.categoryId}`, `${d.s.deviationPct.toFixed(1)}% · ${formatINR(d.t.awardValue!)} vs ${formatINR(d.s.median)} (n=${d.s.count})`);
}
const spreads = generated
  .map((t) => ({ t, s: bidSpread(t.id) }))
  .filter((x) => x.s != null && (TENDER_BY_ID.get(x.t.id)!.bidIds.length >= 3))
  .sort((a, b) => a.s! - b.s!)
  .slice(0, 6);
console.log("tightest spreads:");
for (const s of spreads) line(`  ${s.t.id} ${s.t.categoryId}`, `${s.s!.toFixed(2)}%`);

const shortWindows = generated
  .filter((t) => t.awardValue! > 5_000_000)
  .map((t) => ({ t, d: bidWindowDays(t) }))
  .sort((a, b) => a.d - b.d)
  .slice(0, 5);
console.log("shortest bid windows (value > ₹50 L):");
for (const s of shortWindows) line(`  ${s.t.id}`, `${s.d} days · ${formatINR(s.t.awardValue!)}`);

console.log("\n=== SANITY ===");
line("value matches target", TOTAL_VALUE === 4_286_000_000);
line("events match target", TOTAL_EVENTS === 10_482);
line("tenders match target", TENDERS.length === 412);
line("contracts match target", CONTRACTS.length === 376);
line("duplicate tender ids", TENDERS.length - new Set(TENDERS.map((t) => t.id)).size);
line("duplicate bid ids", BIDS.length - new Set(BIDS.map((b) => b.id)).size);
line("duplicate contract ids", CONTRACTS.length - new Set(CONTRACTS.map((c) => c.id)).size);
line("duplicate payment ids", PAYMENTS.length - new Set(PAYMENTS.map((p) => p.id)).size);
line("contracts without winner", CONTRACTS.filter((c) => !c.vendorId).length);
line("tenders without bids (non-open)", TENDERS.filter((t) => t.status !== "OPEN" && !t.bidIds.length).length);
console.log();
