import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "risk" | "critical" | "rel" | "slate";

export const TONE_BADGE: Record<Tone, string> = {
  neutral: "border-line-strong bg-panel-2 text-ink-2",
  accent: "border-accent/35 bg-accent/10 text-accent-ink",
  ok: "border-ok/35 bg-ok/10 text-ok-ink",
  warn: "border-warn/35 bg-warn/10 text-warn-ink",
  risk: "border-risk/45 bg-risk/10 text-risk-ink",
  critical: "border-risk bg-risk text-[#190b0a]",
  rel: "border-rel/40 bg-rel/10 text-rel-ink",
  slate: "border-slate/35 bg-slate/10 text-slate-ink",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink-2",
  accent: "text-accent-ink",
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  risk: "text-risk-ink",
  critical: "text-risk-ink",
  rel: "text-rel-ink",
  slate: "text-slate-ink",
};

export const TONE_FILL: Record<Tone, string> = {
  neutral: "bg-ink-3",
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  risk: "bg-risk",
  critical: "bg-risk",
  rel: "bg-rel",
  slate: "bg-slate",
};

export const TONE_HEX: Record<Tone, string> = {
  neutral: "#7d838b",
  accent: "#4d8ef7",
  ok: "#5bb58a",
  warn: "#e4a23e",
  risk: "#e5564c",
  critical: "#e5564c",
  rel: "#9085e9",
  slate: "#7d8794",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
        TONE_BADGE[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_FILL[tone], className)} />;
}
