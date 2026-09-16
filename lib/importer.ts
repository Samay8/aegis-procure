import { formatINR, formatPct } from "@/lib/format";
import { median } from "@/lib/utils";
import type { AnomalySignal } from "@/types";

export const REQUIRED_FIELDS = [
  { key: "tender_id", label: "Tender ID" },
  { key: "vendor_id", label: "Vendor ID" },
  { key: "department", label: "Department" },
  { key: "category", label: "Category" },
  { key: "bid_amount", label: "Bid Amount" },
  { key: "contract_value", label: "Contract Value" },
  { key: "award_date", label: "Award Date" },
  { key: "location", label: "Location" },
] as const;

export type ImportRow = Record<string, string>;

export interface ImportPreview {
  fileName: string;
  format: "CSV" | "JSON";
  rows: ImportRow[];
  columns: string[];
  missingColumns: string[];
  issues: { level: "error" | "warning"; message: string }[];
  tenders: number;
  raw: string;
}

const SYNONYMS: Record<string, string> = {
  tender: "tender_id",
  tenderid: "tender_id",
  tender_no: "tender_id",
  vendor: "vendor_id",
  vendorid: "vendor_id",
  supplier_id: "vendor_id",
  dept: "department",
  bid: "bid_amount",
  bidamount: "bid_amount",
  amount: "bid_amount",
  contract: "contract_value",
  contractvalue: "contract_value",
  value: "contract_value",
  awarddate: "award_date",
  date: "award_date",
  region: "location",
  district: "location",
};

function normalizeHeader(header: string) {
  const key = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return SYNONYMS[key.replace(/_/g, "")] ?? SYNONYMS[key] ?? key;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
  }
}

export function previewImport(fileName: string, text: string): ImportPreview {
  const lower = fileName.toLowerCase();
  const format: "CSV" | "JSON" = lower.endsWith(".json") || text.trim().startsWith("[") ? "JSON" : "CSV";
  let rows: ImportRow[] = [];
  let columns: string[] = [];

  if (!lower.endsWith(".csv") && !lower.endsWith(".json") && !lower.endsWith(".txt")) {
    throw new ImportError("Unsupported file type. Import a .csv or .json file.", text.slice(0, 2000));
  }

  if (format === "JSON") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ImportError("The JSON file could not be parsed. Check for a trailing comma or an unclosed bracket.", text.slice(0, 2000));
    }
    if (!Array.isArray(parsed) || !parsed.every((r) => r && typeof r === "object")) {
      throw new ImportError("The JSON file must contain an array of records.", text.slice(0, 2000));
    }
    const records = parsed as Record<string, unknown>[];
    columns = [...new Set(records.flatMap((r) => Object.keys(r).map(normalizeHeader)))];
    rows = records.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [normalizeHeader(k), v == null ? "" : String(v)])),
    );
  } else {
    const table = parseCSV(text);
    if (table.length < 2) {
      throw new ImportError("The CSV file needs a header row and at least one record.", text.slice(0, 2000));
    }
    columns = table[0].map(normalizeHeader);
    rows = table.slice(1).map((cells) => Object.fromEntries(columns.map((c, i) => [c, (cells[i] ?? "").trim()])));
  }

  const missingColumns = REQUIRED_FIELDS.filter((f) => !columns.includes(f.key)).map((f) => f.label);
  const issues: ImportPreview["issues"] = [];
  if (missingColumns.length) {
    issues.push({ level: "error", message: `Missing required columns: ${missingColumns.join(", ")}.` });
  }

  let emptyCells = 0;
  let badNumbers = 0;
  let badDates = 0;
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    for (const field of REQUIRED_FIELDS) {
      if (columns.includes(field.key) && !row[field.key]) emptyCells++;
    }
    for (const key of ["bid_amount", "contract_value"]) {
      if (row[key] && Number.isNaN(Number(row[key].replace(/[,₹\s]/g, "")))) badNumbers++;
    }
    if (row.award_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.award_date)) badDates++;
    const key = `${row.tender_id}|${row.vendor_id}`;
    if (seen.has(key)) duplicates++;
    seen.add(key);
  }
  if (emptyCells) issues.push({ level: "warning", message: `${emptyCells} empty cells in required fields. Affected rows are excluded from price analysis.` });
  if (badNumbers) issues.push({ level: "warning", message: `${badNumbers} amounts are not numbers and will be ignored.` });
  if (badDates) issues.push({ level: "warning", message: `${badDates} award dates are not in YYYY-MM-DD format and are excluded from timing analysis.` });
  if (duplicates) issues.push({ level: "warning", message: `${duplicates} duplicate bid rows (same tender and vendor) will be merged.` });

  return {
    fileName,
    format,
    rows,
    columns,
    missingColumns,
    issues,
    tenders: new Set(rows.map((r) => r.tender_id)).size,
    raw: text.slice(0, 4000),
  };
}

const num = (value: string | undefined) => Number((value ?? "").replace(/[,₹\s]/g, ""));

/** Runs price and bid-spread checks on imported rows. */
export function analyseImport(preview: ImportPreview, importId: string): AnomalySignal[] {
  const byTender = new Map<string, ImportRow[]>();
  for (const row of preview.rows) {
    if (!row.tender_id) continue;
    const list = byTender.get(row.tender_id) ?? [];
    list.push(row);
    byTender.set(row.tender_id, list);
  }

  const tenders = [...byTender.entries()].map(([tenderId, rows]) => {
    const values = rows.map((r) => num(r.contract_value)).filter((v) => v > 0);
    const bids = rows.map((r) => num(r.bid_amount)).filter((v) => v > 0);
    const winner = rows.find((r) => num(r.bid_amount) === Math.min(...bids)) ?? rows[0];
    return {
      tenderId,
      category: rows[0].category || "Uncategorised",
      department: rows[0].department || "Unknown",
      location: rows[0].location || "",
      date: rows[0].award_date || "",
      value: values.length ? Math.max(...values) : 0,
      bids,
      winnerVendor: winner?.vendor_id ?? "",
    };
  });

  const signals: AnomalySignal[] = [];
  let seq = 1;
  const nextId = () => `SIG-IMP-${importId.slice(-4)}-${String(seq++).padStart(2, "0")}`;

  const byCategory = new Map<string, typeof tenders>();
  for (const t of tenders) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  for (const [category, list] of byCategory) {
    if (list.length < 5) continue;
    const med = median(list.map((t) => t.value).filter(Boolean));
    for (const t of list) {
      if (!med || !t.value) continue;
      const deviation = ((t.value - med) / med) * 100;
      if (deviation < 30) continue;
      signals.push(importedSignal(nextId(), importId, {
        type: "PRICE_OUTLIER",
        title: "Imported award above category median",
        headline: `${t.tenderId} is ${formatPct(deviation, 1, true)} against the median of ${list.length} imported ${category} records.`,
        severity: deviation > 60 ? "HIGH" : "MEDIUM",
        strength: Math.round(Math.min(85, 35 + deviation / 2)),
        vendorIds: [t.winnerVendor],
        metrics: [
          { label: "Tender", value: t.tenderId },
          { label: "Contract value", value: formatINR(t.value) },
          { label: "Category median", value: formatINR(med) },
          { label: "Deviation", value: formatPct(deviation, 1, true) },
          { label: "Records compared", value: String(list.length) },
        ],
        explanation: "The imported contract value sits well above the median of other imported records in the same category.",
        reasoning: "Compared within the imported file only; the comparison does not yet use the platform's comparable sets.",
        recommendedAction: "Match this record to the procurement database before relying on the measurement.",
        actionLabel: "Review imported record",
      }));
    }
  }

  for (const t of tenders) {
    if (t.bids.length < 3) continue;
    const spread = ((Math.max(...t.bids) - Math.min(...t.bids)) / Math.min(...t.bids)) * 100;
    if (spread >= 2) continue;
    signals.push(importedSignal(nextId(), importId, {
      type: "CLOSE_BIDS",
      title: "Imported bids unusually close",
      headline: `${t.bids.length} bids on ${t.tenderId} sit within ${spread.toFixed(2)}% of each other.`,
      severity: "MEDIUM",
      strength: Math.round(70 - spread * 10),
      vendorIds: [t.winnerVendor],
      metrics: [
        { label: "Tender", value: t.tenderId },
        { label: "Bids", value: String(t.bids.length) },
        { label: "Bid spread", value: `${spread.toFixed(2)}%` },
      ],
      explanation: "Bids in this imported tender are closer together than a competitive field usually produces.",
      reasoning: "Spread is (highest − lowest) ÷ lowest across the imported bid rows.",
      recommendedAction: "Check the bidder set against relationship records.",
      actionLabel: "Review imported record",
    }));
  }

  return signals;
}

function importedSignal(
  id: string,
  importId: string,
  input: Pick<AnomalySignal, "type" | "title" | "headline" | "severity" | "strength" | "vendorIds" | "metrics" | "explanation" | "reasoning" | "recommendedAction" | "actionLabel">,
): AnomalySignal {
  return {
    id,
    category: input.type === "PRICE_OUTLIER" ? "PRICE" : "BID_BEHAVIOR",
    confidence: "MEDIUM",
    detectedOn: new Date().toISOString().slice(0, 10),
    tenderIds: [],
    contractIds: [],
    departmentId: "pwd",
    categoryId: "road",
    regionId: "coastal",
    context: "Imported records have not been matched to market context or comparable sets yet.",
    alternatives: ["Scope or specification differences not captured in the file", "Data entry errors in the import"],
    dataCoverage: `Imported file ${importId} only.`,
    evidenceIds: [],
    imported: true,
    ...input,
  };
}

/** A demo file with two data issues and two planted patterns. */
export function sampleCSV() {
  const header = "Tender ID,Vendor ID,Department,Category,Bid Amount,Contract Value,Award Date,Location";
  const rows: string[] = [header];
  const categories = [
    { name: "Road Infrastructure", dept: "Public Works", base: 18_000_000 },
    { name: "Medical Supplies", dept: "Health", base: 4_200_000 },
    { name: "Education Materials", dept: "Education", base: 2_600_000 },
  ];
  let n = 7001;
  categories.forEach((cat, ci) => {
    for (let i = 0; i < 6; i++) {
      const tenderId = `IMP-2026-${n++}`;
      const planted = ci === 0 && i === 4;
      const close = ci === 1 && i === 2;
      const value = Math.round(cat.base * (1 + ((i * 7) % 5) * 0.04) * (planted ? 1.72 : 1));
      const bidders = 3;
      for (let b = 0; b < bidders; b++) {
        const factor = close ? 1 + b * 0.004 : 1 + b * (0.05 + (i % 3) * 0.02);
        const date = `2026-0${(i % 6) + 3}-${String(10 + i).padStart(2, "0")}`;
        const location = ["Mangaluru", "Hassan", "Belagavi"][ci];
        rows.push(
          [tenderId, `VX-${ci}${i}${b}`, cat.dept, cat.name, Math.round(value * factor), value, date, location].join(","),
        );
      }
    }
  });
  // Two deliberate data issues
  rows.push(`IMP-2026-${n},VX-900,Public Works,Road Infrastructure,,21000000,2026-07-02,Udupi`);
  rows.push(`IMP-2026-${n + 1},VX-901,Health,Medical Supplies,4400000,4400000,02/07/2026,Mysuru`);
  return rows.join("\n");
}
