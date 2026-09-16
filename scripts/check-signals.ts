import { SIGNALS, UNASSIGNED_SIGNALS, signalCountsByCategory } from "../data/signals";

const line = (label: string, value: unknown) => console.log(label.padEnd(30), value);

line("total signals", SIGNALS.length);
line("unassigned", UNASSIGNED_SIGNALS.length);
line("by category", JSON.stringify(signalCountsByCategory()));

const severity: Record<string, number> = {};
for (const s of SIGNALS) severity[s.severity] = (severity[s.severity] ?? 0) + 1;
line("by severity", JSON.stringify(severity));

const cases: Record<string, number> = {};
for (const s of SIGNALS) if (s.caseId) cases[s.caseId] = (cases[s.caseId] ?? 0) + 1;
line("per case", JSON.stringify(cases));

console.log("\nSuspect values (NaN / undefined / Infinity in metrics):");
for (const s of SIGNALS) {
  const bad = s.metrics.filter((m) => /NaN|undefined|Infinity/.test(m.value));
  if (bad.length || /NaN|undefined|Infinity/.test(s.headline)) {
    console.log(" ", s.id, s.headline, JSON.stringify(bad));
  }
}

console.log("\nHeadlines for the primary case:");
for (const s of SIGNALS.filter((x) => x.caseId === "INV-2026-0042")) {
  console.log(` [${s.severity.padEnd(8)}] ${s.id} ${s.title}`);
  console.log(`            ${s.headline}`);
}

console.log("\nDetected signals:");
for (const s of UNASSIGNED_SIGNALS) {
  console.log(` [${s.severity.padEnd(8)}] ${s.id} ${s.category.padEnd(20)} ${s.headline}`);
}
