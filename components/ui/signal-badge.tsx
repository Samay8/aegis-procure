import { CONFIDENCE_META, SIGNAL_CATEGORY_META } from "@/data/reference";
import { cn } from "@/lib/utils";
import type { Confidence, SignalCategory } from "@/types";
import { CATEGORY_ICON } from "./icons";

export function CategoryTag({ category, className, long }: { category: SignalCategory; className?: string; long?: boolean }) {
  const Icon = CATEGORY_ICON[category];
  const meta = SIGNAL_CATEGORY_META[category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-2", className)}>
      <Icon aria-hidden className="h-3.5 w-3.5 text-ink-3" />
      {long ? meta.label : meta.short}
    </span>
  );
}

export function ConfidenceTag({ confidence, className }: { confidence: Confidence; className?: string }) {
  const filled = confidence === "HIGH" ? 3 : confidence === "MEDIUM" ? 2 : 1;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-2", className)} title={CONFIDENCE_META[confidence].description}>
      <span aria-hidden className="flex items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("w-[3px] rounded-[1px]", i < filled ? "bg-accent" : "bg-line-strong")} style={{ height: 5 + i * 3 }} />
        ))}
      </span>
      {CONFIDENCE_META[confidence].label} confidence
    </span>
  );
}
