import { FlaskConical, Info, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import {
  AI_DISCLAIMER,
  LEGITIMATE_EXPLANATIONS,
  RELATIONSHIP_DISCLAIMER,
  SCORE_DISCLAIMER,
  SYNTHETIC_NOTICE,
} from "@/data/reference";
import { cn } from "@/lib/utils";

export function ScoreDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2.5 rounded-[5px] border border-accent/30 bg-accent/[0.07] px-3 py-2.5 text-[13px] leading-snug text-ink", className)}>
      <ShieldCheck aria-hidden className="mt-px h-4 w-4 shrink-0 text-accent-ink" />
      <span>
        <strong className="font-semibold">Decision support, not a verdict.</strong> {SCORE_DISCLAIMER}
      </span>
    </p>
  );
}

export function AIDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs leading-snug text-ink-3", className)}>
      <Sparkles aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-rel-ink" />
      {AI_DISCLAIMER}
    </p>
  );
}

export function RelationshipNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs leading-snug text-ink-3", className)}>
      <Info aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-rel-ink" />
      {RELATIONSHIP_DISCLAIMER}
    </p>
  );
}

export function SyntheticNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <p className={cn("flex items-start gap-2 text-[11px] leading-snug text-ink-3", className)}>
      <FlaskConical aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
      {compact ? "Synthetic demo data · fictional entities" : SYNTHETIC_NOTICE}
    </p>
  );
}

export function ImportantContext({
  title = "Important context",
  lead = "An unusual pattern does not necessarily indicate wrongdoing. Possible legitimate explanations include:",
  items = LEGITIMATE_EXPLANATIONS,
  className,
  footer,
}: {
  title?: string;
  lead?: string;
  items?: string[];
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <aside className={cn("rounded-md border border-warn/25 bg-warn/[0.05] p-4", className)}>
      <h3 className="type-label flex items-center gap-2 !text-warn-ink">
        <Scale aria-hidden className="h-3.5 w-3.5" /> {title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{lead}</p>
      <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] text-ink-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warn/70" />
            {item}
          </li>
        ))}
      </ul>
      {footer && <div className="mt-3 text-[13px] text-ink-3">{footer}</div>}
    </aside>
  );
}
