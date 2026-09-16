"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatPct } from "@/lib/format";
import type { ComparableStats } from "@/data/procurement";
import type { Tender } from "@/types";
import { CHART } from "./theme";
import { useElementWidth } from "./chart-tooltip";

/**
 * Distribution of comparable procurements: each dot is one award, the band is
 * the interquartile range, the tall marker is this contract.
 */
export function ComparableStrip({
  stats,
  comparables,
  current,
  adjustedPct,
}: {
  stats: ComparableStats;
  comparables: Tender[];
  current: Tender;
  adjustedPct?: number | null;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Tender | null>(null);
  const height = 190;
  const padX = 18;

  const adjustedValue = adjustedPct != null ? stats.median * (1 + adjustedPct / 100) : null;
  const domain = useMemo(() => {
    const values = [...stats.values, stats.current, ...(adjustedValue ? [adjustedValue] : [])];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.08 || max * 0.1;
    return [min - pad, max + pad] as const;
  }, [stats, adjustedValue]);

  const x = (value: number) => padX + ((value - domain[0]) / (domain[1] - domain[0])) * Math.max(1, width - padX * 2);

  const placed = useMemo(() => {
    const rows: number[][] = [[], [], [], []];
    return [...comparables]
      .sort((a, b) => (a.awardValue ?? 0) - (b.awardValue ?? 0))
      .map((tender) => {
        const px = x(tender.awardValue ?? 0);
        let row = rows.findIndex((occupied) => occupied.every((o) => Math.abs(o - px) > 13));
        if (row === -1) row = 0;
        rows[row].push(px);
        return { tender, px, row };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparables, width, domain]);

  const ticks = useMemo(() => {
    const count = width < 420 ? 3 : 5;
    return Array.from({ length: count }, (_, i) => domain[0] + ((domain[1] - domain[0]) * (i + 0.5)) / count);
  }, [domain, width]);

  const baseY = 116;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`This contract ${formatINR(stats.current)} against a comparable median of ${formatINR(stats.median)}`}>
          <motion.rect
            x={x(stats.p25)}
            y={38}
            width={Math.max(2, x(stats.p75) - x(stats.p25))}
            height={baseY - 30}
            fill={CHART.accent}
            fillOpacity={0.09}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <line x1={x(stats.p25)} x2={x(stats.p25)} y1={38} y2={baseY + 8} stroke="#39414c" />
          <line x1={x(stats.p75)} x2={x(stats.p75)} y1={38} y2={baseY + 8} stroke="#39414c" />
          <line x1={x(stats.median)} x2={x(stats.median)} y1={30} y2={baseY + 8} stroke={CHART.label} strokeWidth={1.5} />
          <text x={x(stats.median)} y={24} textAnchor="middle" fill={CHART.label} fontSize={11}>
            Median {formatINR(stats.median)}
          </text>

          <line x1={padX} x2={width - padX} y1={baseY + 8} y2={baseY + 8} stroke={CHART.axis} />
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={baseY + 26} textAnchor="middle" fill={CHART.tick} fontSize={10.5} className="tabular">
              {formatINR(t)}
            </text>
          ))}
          <text x={x(stats.p25)} y={baseY + 42} textAnchor="middle" fill={CHART.tick} fontSize={10.5}>
            P25
          </text>
          <text x={x(stats.p75)} y={baseY + 42} textAnchor="middle" fill={CHART.tick} fontSize={10.5}>
            P75
          </text>

          {placed.map(({ tender, px, row }, index) => (
            <g key={tender.id} onMouseEnter={() => setHover(tender)} onMouseLeave={() => setHover(null)}>
              <circle cx={px} cy={baseY - 8 - row * 15} r={12} fill="transparent" />
              <motion.circle
                cx={px}
                cy={baseY - 8 - row * 15}
                r={hover?.id === tender.id ? 6 : 4.5}
                fill={CHART.series[0]}
                stroke={CHART.surface}
                strokeWidth={2}
                initial={{ opacity: 0, cy: baseY }}
                animate={{ opacity: 1, cy: baseY - 8 - row * 15 }}
                transition={{ delay: 0.02 * index, duration: 0.4 }}
              />
            </g>
          ))}

          {adjustedValue != null && (
            <g>
              <line x1={x(adjustedValue)} x2={x(adjustedValue)} y1={44} y2={baseY + 8} stroke={CHART.ok} strokeWidth={2} strokeDasharray="3 3" />
              <text x={x(adjustedValue)} y={baseY + 58} textAnchor="middle" fill={CHART.ok} fontSize={11} fontWeight={600}>
                After context {formatPct(adjustedPct ?? 0, 1, true)}
              </text>
            </g>
          )}

          <g>
            <line x1={x(stats.current)} x2={x(stats.current)} y1={40} y2={baseY + 8} stroke={CHART.risk} strokeWidth={2} />
            <rect x={x(stats.current) - 6} y={34} width={12} height={12} transform={`rotate(45 ${x(stats.current)} 40)`} fill={CHART.risk} stroke={CHART.surface} strokeWidth={2} />
            <text
              x={Math.min(width - 8, Math.max(8, x(stats.current)))}
              y={14}
              textAnchor={x(stats.current) > width - 120 ? "end" : x(stats.current) < 120 ? "start" : "middle"}
              fill={CHART.ink}
              fontSize={11.5}
              fontWeight={600}
            >
              This contract {formatINR(stats.current)} ({formatPct(stats.deviationPct, 1, true)})
            </text>
          </g>
        </svg>
      )}

      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 max-w-64 rounded-[5px] border border-line-strong bg-[#0d1014]/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-semibold tabular text-ink">{formatINR(hover.awardValue ?? 0)}</div>
          <div className="mt-0.5 text-ink-2">{hover.title}</div>
          <div className="mt-0.5 text-ink-3">
            {hover.winnerVendorId ? vendorName(hover.winnerVendorId) : "—"} · {hover.awardedOn ? formatDate(hover.awardedOn) : ""}
          </div>
        </div>
      )}

      <details className="mt-2 text-xs text-ink-3">
        <summary className="cursor-pointer select-none hover:text-ink-2">Table view of {comparables.length} comparable procurements</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel-2 text-ink-3">
              <tr>
                <th className="px-2 py-1.5 font-medium">Tender</th>
                <th className="px-2 py-1.5 font-medium">Winner</th>
                <th className="px-2 py-1.5 text-right font-medium">Award</th>
              </tr>
            </thead>
            <tbody>
              {[...comparables]
                .sort((a, b) => (b.awardValue ?? 0) - (a.awardValue ?? 0))
                .map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-2 py-1.5">
                      <Link href={`/procurement/${t.id}`} className="text-ink-2 hover:text-ink">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-ink-3">{t.winnerVendorId ? vendorName(t.winnerVendorId) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular text-ink-2">{formatINR(t.awardValue ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
