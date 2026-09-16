"use client";

import { useEffect, useRef, useState } from "react";

interface TooltipItem {
  color?: string;
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: unknown;
  labelFormatter?: (label: unknown) => string;
  valueFormatter?: (value: number, name: string) => string;
}

/** Values lead, series names follow, keyed with a short line in the series color. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-[5px] border border-line-strong bg-[#0d1014]/95 px-3 py-2 shadow-xl">
      <div className="mb-1.5 text-[11px] text-ink-3">{labelFormatter ? labelFormatter(label) : String(label ?? "")}</div>
      <ul className="space-y-1">
        {payload.map((item, index) => (
          <li key={`${String(item.dataKey)}-${index}`} className="flex items-center gap-2 text-xs">
            <span aria-hidden className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="font-semibold tabular text-ink">
              {valueFormatter ? valueFormatter(Number(item.value), String(item.name)) : String(item.value)}
            </span>
            <span className="text-ink-3">{String(item.name)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; kind?: "line" | "box" }[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2 ${className ?? ""}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className={item.kind === "box" ? "h-2.5 w-2.5 rounded-[2px]" : "h-[2px] w-3.5 rounded-full"}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Width of an element, tracked with ResizeObserver (0 until measured). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((previous) => (previous === next ? previous : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
