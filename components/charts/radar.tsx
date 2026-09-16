"use client";

import { motion } from "framer-motion";
import { SIGNAL_CATEGORY_META } from "@/data/reference";
import type { SignalCategory } from "@/types";
import { CHART } from "./theme";

/** Horizontal room for axis labels so they stay inside the viewBox at every width. */
const PAD_X = 78;

export interface RadarDatum {
  category: SignalCategory;
  count: number;
}

/**
 * Anomaly radar: one axis per signal category, radius = open signal count.
 * Axis labels are buttons that filter the investigation table.
 */
export function AnomalyRadar({
  data,
  selected,
  onSelect,
  size = 440,
}: {
  data: RadarDatum[];
  selected?: SignalCategory | "ALL";
  onSelect?: (category: SignalCategory | "ALL") => void;
  size?: number;
}) {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 78;
  const max = Math.max(4, Math.ceil(Math.max(...data.map((d) => d.count)) / 4) * 4);
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  const ringPath = (fraction: number) =>
    data.map((_, i) => at(i, radius * fraction)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + "Z";
  const shape = data
    .map((d, i) => at(i, Math.max(radius * 0.04, radius * (d.count / max))))
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ") + "Z";
  const sweepEnd = at(0, radius);
  const sweepStart = [cx + Math.cos(-Math.PI / 2 - 0.55) * radius, cy + Math.sin(-Math.PI / 2 - 0.55) * radius];

  return (
    <div className="relative min-w-0">
      <svg
        viewBox={`${-PAD_X} -6 ${size + PAD_X * 2} ${size + 12}`}
        className="mx-auto block h-auto w-full max-w-[560px]"
        role="img"
        aria-label="Anomaly radar showing open signals per category"
      >
        <defs>
          <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART.accent} stopOpacity="0" />
            <stop offset="100%" stopColor={CHART.accent} stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f) => (
          <path key={f} d={ringPath(f)} fill="none" stroke={CHART.grid} strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const [x, y] = at(i, radius);
          const isSelected = selected === d.category;
          return <line key={d.category} x1={cx} y1={cy} x2={x} y2={y} stroke={isSelected ? "#3b4552" : CHART.grid} strokeWidth={1} />;
        })}
        <text x={cx + 4} y={cy - radius * 0.5 - 4} fill={CHART.tick} fontSize={10} className="tabular">
          {max / 2}
        </text>
        <text x={cx + 4} y={cy - radius - 4} fill={CHART.tick} fontSize={10} className="tabular">
          {max}
        </text>

        <g style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px`, animation: "aegis-sweep 9s linear infinite" }}>
          <path d={`M${cx},${cy} L${sweepStart[0]},${sweepStart[1]} A${radius},${radius} 0 0 1 ${sweepEnd[0]},${sweepEnd[1]} Z`} fill="url(#radar-sweep)" />
        </g>

        <motion.path
          d={shape}
          fill={CHART.accent}
          fillOpacity={0.13}
          stroke={CHART.accent}
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {data.map((d, i) => {
          const [x, y] = at(i, Math.max(radius * 0.04, radius * (d.count / max)));
          const isSelected = selected === d.category;
          return (
            <circle
              key={`p-${d.category}`}
              cx={x}
              cy={y}
              r={isSelected ? 6 : 4}
              fill={isSelected ? CHART.ink : CHART.accent}
              stroke={CHART.surface}
              strokeWidth={2}
            />
          );
        })}

        {data.map((d, i) => {
          const [x, y] = at(i, radius + 40);
          const cos = Math.cos(angle(i));
          const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          const isSelected = selected === d.category;
          const label = SIGNAL_CATEGORY_META[d.category].short.toUpperCase();
          const toggle = () => onSelect?.(isSelected ? "ALL" : d.category);
          return (
            <g
              key={`l-${d.category}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${SIGNAL_CATEGORY_META[d.category].label}: ${d.count} signals. ${isSelected ? "Clear filter" : "Filter the table"}`}
              onClick={toggle}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle();
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#4d8ef7]"
            >
              <rect
                x={anchor === "start" ? x - 8 : anchor === "end" ? x - 96 : x - 52}
                y={y - 24}
                width={104}
                height={42}
                rx={4}
                fill={isSelected ? "rgba(77,142,247,0.12)" : "transparent"}
                stroke={isSelected ? "rgba(77,142,247,0.5)" : "transparent"}
              />
              <text x={x} y={y - 8} textAnchor={anchor} fill={isSelected ? CHART.ink : CHART.label} fontSize={10.5} fontWeight={600} letterSpacing="0.08em">
                {label}
              </text>
              <text x={x} y={y + 11} textAnchor={anchor} fill={isSelected ? CHART.ink : CHART.ink} fontSize={17} fontWeight={700} className="tabular">
                {d.count}
                <tspan fill={CHART.tick} fontSize={11} fontWeight={400}>
                  {" "}
                  signals
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Open signals by category</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.category}>
              <th>{SIGNAL_CATEGORY_META[d.category].label}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
