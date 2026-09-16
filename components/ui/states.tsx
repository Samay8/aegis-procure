"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, FileText, LoaderCircle, RotateCcw, SearchX, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-line-strong bg-panel-2">
        <Icon aria-hidden className="h-5 w-5 text-ink-3" />
      </div>
      <h3 className="type-title text-sm uppercase tracking-[0.04em] text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  raw,
  className,
}: {
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
  raw?: string;
  className?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div role="alert" className={cn("rounded-md border border-risk/35 bg-risk/5 p-5", className)}>
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-risk-ink" />
        <div className="min-w-0 flex-1">
          <h3 className="type-title text-sm uppercase tracking-[0.04em] text-ink">{title}</h3>
          {description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </Button>
            )}
            {raw != null && (
              <Button size="sm" variant="ghost" onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw}>
                <FileText className="h-3.5 w-3.5" /> {showRaw ? "Hide raw data" : "View raw data"}
              </Button>
            )}
          </div>
          {showRaw && raw != null && (
            <pre className="mt-3 max-h-56 overflow-auto rounded-[4px] border border-line bg-ground-2 p-3 font-mono text-[11px] leading-relaxed text-ink-2">
              {raw || "(empty file)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[4px]", className)} />;
}

/** Step-by-step analysis progress — used by imports, the assistant and context checks. */
export function AnalysisSteps({ steps, active, className }: { steps: string[]; active: number; className?: string }) {
  return (
    <ol className={cn("space-y-2", className)} aria-live="polite">
      <AnimatePresence initial={false}>
        {steps.map((step, index) => {
          if (index > active) return null;
          const done = index < active;
          return (
            <motion.li
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 text-[13px]"
            >
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", done ? "bg-ok/15 text-ok-ink" : "text-accent-ink")}>
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              </span>
              <span className={done ? "text-ink-3" : "text-ink"}>{step}</span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

export function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)} role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent-ink" />
        {label}
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
