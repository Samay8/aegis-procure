import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TONE_FILL, type Tone } from "./badge";

export function Meter({
  value,
  max = 100,
  tone = "accent",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 0.0001)) * 100));
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-[2px] bg-panel-3", className)}
    >
      <div className={cn("h-full rounded-[2px] transition-[width] duration-700 ease-out", TONE_FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 items-center rounded-[3px] border border-line-strong bg-panel-3 px-1.5 font-mono text-[10px] text-ink-3", className)}>
      {children}
    </kbd>
  );
}

export function Tooltip({ content, children, className, side = "top" }: { content: ReactNode; children: ReactNode; className?: string; side?: "top" | "bottom" }) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-30 w-max max-w-64 -translate-x-1/2 rounded-[4px] border border-line-strong bg-[#0b0e11] px-2.5 py-1.5 text-xs leading-snug text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
        )}
      >
        {content}
      </span>
    </span>
  );
}

export function Pagination({
  page,
  pageCount,
  onPage,
  total,
  pageSize,
  className,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  total: number;
  pageSize: number;
  className?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-3", className)}>
      <span className="tabular">
        Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded border border-line-strong text-ink-2 hover:bg-panel-3 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="tabular px-2 text-ink-2">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="flex h-7 w-7 items-center justify-center rounded border border-line-strong text-ink-2 hover:bg-panel-3 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {tone && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_FILL[tone])} />}
        {label}
      </div>
      <div className="type-title mt-1.5 truncate text-[22px] text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}
