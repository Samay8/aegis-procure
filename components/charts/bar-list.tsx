"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CHART } from "./theme";

export interface BarListItem {
  id: string;
  label: ReactNode;
  sublabel?: ReactNode;
  value: number;
  display: ReactNode;
  href?: string;
  emphasis?: boolean;
  onClick?: () => void;
  active?: boolean;
}

/** Horizontal magnitude bars — one hue, with emphasis reserved for the item the story is about. */
export function BarList({
  items,
  max,
  className,
  color = CHART.series[0],
  emphasisColor = CHART.risk,
}: {
  items: BarListItem[];
  max?: number;
  className?: string;
  color?: string;
  emphasisColor?: string;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const width = `${Math.max(1.5, (item.value / top) * 100)}%`;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] text-ink">
                {item.label}
                {item.sublabel && <span className="ml-2 text-xs text-ink-3">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 text-[13px] font-medium tabular text-ink-2">{item.display}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[2px] bg-panel-3">
              <motion.div
                className="h-full rounded-r-[4px]"
                style={{ background: item.emphasis ? emphasisColor : color, opacity: item.active === false ? 0.35 : 1 }}
                initial={{ width: 0 }}
                animate={{ width }}
                transition={{ duration: 0.6, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block rounded-[3px] outline-offset-4 hover:opacity-90">
                {inner}
              </Link>
            ) : item.onClick ? (
              <button type="button" onClick={item.onClick} aria-pressed={item.active} className="block w-full text-left">
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = CHART.series[0],
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / range) * (height - 6)]);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} stroke={CHART.surface} strokeWidth={1.5} />
    </svg>
  );
}
