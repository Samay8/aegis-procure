"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SIGNAL_CATEGORY_META, SIGNAL_TYPE_META } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SignalReview } from "@/store/aegis";
import type { AnomalySignal } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_ICON } from "@/components/ui/icons";
import { PRIORITY_TONE } from "@/components/ui/priority";

export function SignalRow({
  signal,
  review,
  onOpen,
  compact,
  active,
}: {
  signal: AnomalySignal;
  review?: SignalReview;
  onOpen?: (signal: AnomalySignal) => void;
  compact?: boolean;
  active?: boolean;
}) {
  const Icon = CATEGORY_ICON[signal.category];
  const content = (
    <div className={cn("flex gap-3", compact ? "py-2.5" : "py-3.5")}>
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border",
          signal.severity === "CRITICAL" || signal.severity === "HIGH" ? "border-risk/35 bg-risk/10 text-risk-ink" : "border-line-strong bg-panel-2 text-ink-2",
        )}
      >
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
          <span className="text-xs text-ink-3">{SIGNAL_TYPE_META[signal.type].label}</span>
          {signal.imported && <Badge tone="accent">Imported</Badge>}
          {review && <Badge tone={review.status === "EXPLAINED" ? "ok" : "slate"}>{review.status === "EXPLAINED" ? "Explained" : "Dismissed"}</Badge>}
          {signal.caseId && <span className="font-mono text-[11px] text-ink-3">{signal.caseId}</span>}
        </div>
        <p className={cn("mt-1 leading-snug text-ink", compact ? "line-clamp-2 text-[13px]" : "text-sm")}>{signal.headline}</p>
        {!compact && (
          <p className="mt-1 text-xs text-ink-3">
            {signal.vendorIds.slice(0, 2).map(vendorName).join(", ")}
            {signal.vendorIds.length > 2 && ` +${signal.vendorIds.length - 2}`} · {SIGNAL_CATEGORY_META[signal.category].label} · detected {formatDate(signal.detectedOn)}
          </p>
        )}
      </div>
      <ChevronRight aria-hidden className="mt-2 h-4 w-4 shrink-0 text-ink-3" />
    </div>
  );

  const className = cn("block rounded-[4px] px-3 transition-colors hover:bg-panel-2", active && "bg-panel-2 ring-1 ring-inset ring-accent/40");
  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(signal)} className={cn(className, "w-full text-left")}>
        {content}
      </button>
    );
  }
  return (
    <Link href={`/alerts?signal=${signal.id}`} className={className}>
      {content}
    </Link>
  );
}
