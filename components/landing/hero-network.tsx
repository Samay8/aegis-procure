"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { vendorProfile } from "@/data/analytics";
import { BIDS_BY_TENDER, CONTRACT_BY_TENDER, PAYMENTS_BY_CONTRACT, TENDER_BY_ID } from "@/data/procurement";
import { signalsForTender, signalsForVendor } from "@/data/signals";
import { CASE_TENDER, CLUSTER_TENDERS } from "@/data/story";
import { V, VENDOR_BY_ID } from "@/data/vendors";
import { formatDate, formatINR } from "@/lib/format";

type Kind = "tender" | "bid" | "vendor" | "contract" | "payment";

interface FlowNode {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  flagged: boolean;
  focus: boolean;
  title: string;
  lines: string[];
}

interface FlowEdge {
  id: string;
  from: string;
  to: string;
  focus: boolean;
}

const COLUMNS: { kind: Kind; label: string; x: number }[] = [
  { kind: "tender", label: "Tenders", x: 44 },
  { kind: "bid", label: "Bids", x: 176 },
  { kind: "vendor", label: "Vendors", x: 318 },
  { kind: "contract", label: "Contracts", x: 450 },
  { kind: "payment", label: "Payments", x: 562 },
];

const HEIGHT = 430;

/** A real slice of the dataset: the coastal maintenance program, from tender to payment. */
function buildFlow() {
  const tenderIds = CLUSTER_TENDERS.filter((t) => t.bids?.length).map((t) => t.id);
  const chosenTenders = [tenderIds[0], tenderIds[1], tenderIds[3], tenderIds[4], tenderIds[7], CASE_TENDER];
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const place = (items: Omit<FlowNode, "x" | "y">[], kind: Kind) => {
    const column = COLUMNS.find((c) => c.kind === kind)!;
    const gap = (HEIGHT - 80) / Math.max(1, items.length - 1);
    items.forEach((item, i) => nodes.push({ ...item, x: column.x, y: 58 + (items.length === 1 ? (HEIGHT - 80) / 2 : i * gap) }));
  };

  const tenders = chosenTenders.map((id) => TENDER_BY_ID.get(id)!);
  place(
    tenders.map((t) => ({
      id: t.id,
      kind: "tender" as Kind,
      flagged: signalsForTender(t.id).length > 0,
      focus: t.id === CASE_TENDER,
      title: t.title,
      lines: [`${t.id}`, `${formatINR(t.awardValue ?? 0)} · ${(BIDS_BY_TENDER.get(t.id) ?? []).length} bids`, `${signalsForTender(t.id).length} signals`],
    })),
    "tender",
  );

  const bidPicks = tenders.flatMap((t) => {
    const bids = BIDS_BY_TENDER.get(t.id) ?? [];
    if (t.id === CASE_TENDER) return bids.filter((b) => b.vendorId === V.vertex || b.vendorId === V.northstar);
    return bids.filter((b) => b.outcome === "WON").slice(0, 1);
  });
  place(
    bidPicks.map((b) => ({
      id: b.id,
      kind: "bid" as Kind,
      flagged: b.tenderId === CASE_TENDER,
      focus: b.tenderId === CASE_TENDER && b.vendorId === V.vertex,
      title: `Bid ${b.id}`,
      lines: [VENDOR_BY_ID[b.vendorId].name, formatINR(b.amount), formatDate(b.submittedAt)],
    })),
    "bid",
  );
  for (const bid of bidPicks) edges.push({ id: `${bid.tenderId}-${bid.id}`, from: bid.tenderId, to: bid.id, focus: bid.tenderId === CASE_TENDER && bid.vendorId === V.vertex });

  const vendorIds = [...new Set([V.northstar, V.apex, V.vertex, V.bluegrid, V.karavali, ...bidPicks.map((b) => b.vendorId)])];
  place(
    vendorIds.map((id) => {
      const profile = vendorProfile(id);
      const signals = signalsForVendor(id).length;
      return {
        id,
        kind: "vendor" as Kind,
        flagged: signals > 0,
        focus: id === V.vertex,
        title: VENDOR_BY_ID[id].name,
        lines: [`${id} · ${profile.wins} awards`, `${formatINR(profile.contractValue)} total value`, `${signals} ${signals === 1 ? "signal" : "signals"}`],
      };
    }),
    "vendor",
  );
  for (const bid of bidPicks) edges.push({ id: `${bid.id}-${bid.vendorId}`, from: bid.id, to: bid.vendorId, focus: bid.tenderId === CASE_TENDER && bid.vendorId === V.vertex });

  const contracts = tenders.map((t) => CONTRACT_BY_TENDER.get(t.id)).filter(Boolean).slice(-5);
  place(
    contracts.map((c) => ({
      id: c!.id,
      kind: "contract" as Kind,
      flagged: c!.tenderId === CASE_TENDER,
      focus: c!.tenderId === CASE_TENDER,
      title: `Contract ${c!.id}`,
      lines: [VENDOR_BY_ID[c!.vendorId].name, formatINR(c!.value), `Signed ${formatDate(c!.signedOn)}`],
    })),
    "contract",
  );
  for (const c of contracts) edges.push({ id: `${c!.vendorId}-${c!.id}`, from: c!.vendorId, to: c!.id, focus: c!.tenderId === CASE_TENDER });

  const payments = contracts.flatMap((c) => (PAYMENTS_BY_CONTRACT.get(c!.id) ?? []).slice(0, 1));
  place(
    payments.map((p) => ({
      id: p.id,
      kind: "payment" as Kind,
      flagged: false,
      focus: p.id === "PAY-2026-11873",
      title: `Payment ${p.id}`,
      lines: [p.type.replace("_", " ").toLowerCase(), formatINR(p.amount), `Paid ${formatDate(p.paidOn)}`],
    })),
    "payment",
  );
  for (const p of payments) edges.push({ id: `${p.contractId}-${p.id}`, from: p.contractId, to: p.id, focus: p.id === "PAY-2026-11873" });

  return { nodes, edges };
}

export function HeroNetwork() {
  const { nodes, edges } = useMemo(buildFlow, []);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [active, setActive] = useState<string>(V.vertex);
  const card = byId.get(active);

  const linked = useMemo(() => {
    const set = new Set([active]);
    let frontier = [active];
    for (let depth = 0; depth < 4; depth++) {
      const next: string[] = [];
      for (const e of edges) {
        if (frontier.includes(e.from) && !set.has(e.to)) next.push(e.to);
        if (frontier.includes(e.to) && !set.has(e.from)) next.push(e.from);
      }
      next.forEach((n) => set.add(n));
      frontier = next;
    }
    return set;
  }, [active, edges]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 600 ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Procurement flow from tenders to payments, with the Zone 4 package highlighted">
        {COLUMNS.map((column) => (
          <g key={column.kind}>
            <line x1={column.x} x2={column.x} y1={40} y2={HEIGHT - 12} stroke="rgba(236,231,223,0.05)" />
            <text x={column.x} y={18} textAnchor="middle" fill="#7d838b" fontSize={10} fontWeight={600} letterSpacing="0.12em">
              {column.label.toUpperCase()}
            </text>
          </g>
        ))}

        {edges.map((edge, index) => {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) return null;
          const mid = (a.x + b.x) / 2;
          const d = `M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`;
          const lit = linked.has(edge.from) && linked.has(edge.to);
          return (
            <g key={edge.id}>
              <path d={d} fill="none" stroke={edge.focus ? "#e5564c" : lit ? "#4d8ef7" : "#2c333c"} strokeWidth={edge.focus ? 1.8 : 1.2} strokeOpacity={edge.focus || lit ? 0.85 : 1} />
              <path
                d={d}
                fill="none"
                stroke={edge.focus ? "#ff8a80" : "#8db6ff"}
                strokeWidth={edge.focus ? 2.2 : 1.6}
                strokeLinecap="round"
                strokeDasharray="4 60"
                style={{ animation: `aegis-pulse-dash ${edge.focus ? 1.6 : 2.8 + (index % 5) * 0.4}s linear infinite`, opacity: edge.focus || lit ? 1 : 0.35 }}
              />
            </g>
          );
        })}

        {nodes.map((node) => {
          const isActive = node.id === active;
          const dim = !linked.has(node.id);
          const size = node.kind === "vendor" ? 9 : node.kind === "tender" ? 7.5 : 6;
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.title}: ${node.lines.join(", ")}`}
              onMouseEnter={() => setActive(node.id)}
              onFocus={() => setActive(node.id)}
              onClick={() => setActive(node.id)}
              className="cursor-pointer outline-none"
              opacity={dim ? 0.45 : 1}
            >
              <circle cx={node.x} cy={node.y} r={size + 10} fill="transparent" />
              {node.flagged && (
                <circle cx={node.x} cy={node.y} r={size + 5} fill="none" stroke="#e5564c" strokeOpacity={0.55} strokeWidth={1.2} />
              )}
              {node.kind === "vendor" ? (
                <circle cx={node.x} cy={node.y} r={size} fill={isActive ? "#ece7df" : "#1c232c"} stroke={node.focus ? "#e5564c" : "#9aa3ae"} strokeWidth={1.8} />
              ) : (
                <rect
                  x={node.x - size}
                  y={node.y - size}
                  width={size * 2}
                  height={size * 2}
                  rx={node.kind === "payment" ? size : 2}
                  fill={isActive ? "#ece7df" : node.kind === "contract" ? "#132520" : node.kind === "payment" ? "#132520" : "#15213a"}
                  stroke={node.focus ? "#e5564c" : node.kind === "contract" || node.kind === "payment" ? "#5bb58a" : "#4d8ef7"}
                  strokeWidth={1.6}
                />
              )}
              {node.kind === "vendor" && (
                <text x={node.x + 15} y={node.y + 4} fill={isActive ? "#ece7df" : "#a6a9ae"} fontSize={10.5} fontWeight={isActive ? 600 : 500} stroke="#0f1215" strokeWidth={3} paintOrder="stroke">
                  {node.title.split(" ")[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 min-h-[64px] rounded-[5px] border border-line-strong bg-[#0d1014]/90 px-3 py-2.5" aria-live="polite">
        <AnimatePresence mode="wait">
          {card && (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.14 }}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">{card.kind}</span>
                {card.flagged && <span className="rounded-[3px] bg-risk/15 px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-risk-ink">Signal</span>}
              </span>
              <span className="text-[14px] font-semibold text-ink">{card.title}</span>
              <span className="flex w-full flex-wrap gap-x-3 text-xs tabular text-ink-2 sm:w-auto">
                {card.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
