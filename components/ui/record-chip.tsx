import Link from "next/link";
import { cn } from "@/lib/utils";
import { recordHref, recordKind, type RecordKind } from "@/lib/links";

const BAR: Record<RecordKind, string> = {
  procurement: "bg-accent",
  bid: "bg-accent",
  vendor: "bg-slate",
  relationship: "bg-rel",
  payment: "bg-ok",
  contract: "bg-ok",
  comparable: "bg-ink-3",
  signal: "bg-warn",
  case: "bg-risk",
  document: "bg-ink-3",
};

/**
 * Evidence citation. Every claim in the interface can carry the record it
 * came from; the colored tick encodes the record type.
 */
export function RecordChip({ id, className, link = true }: { id: string; className?: string; link?: boolean }) {
  const href = link ? recordHref(id) : undefined;
  const classes = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel-2 px-1.5 font-mono text-[11px] leading-[18px] text-ink-2",
    href && "transition-colors hover:border-[#4a525e] hover:text-ink",
    className,
  );
  const content = (
    <>
      <span aria-hidden className={cn("h-2.5 w-[2px] shrink-0 rounded-full", BAR[recordKind(id)])} />
      <span className="truncate">{id}</span>
    </>
  );
  return href ? (
    <Link href={href} className={classes} title={`Open ${id}`}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}

export function RecordChips({ ids, className, max = 4 }: { ids: string[]; className?: string; max?: number }) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {unique.slice(0, max).map((id) => (
        <RecordChip key={id} id={id} />
      ))}
      {unique.length > max && <span className="text-[11px] text-ink-3">+{unique.length - max}</span>}
    </span>
  );
}
