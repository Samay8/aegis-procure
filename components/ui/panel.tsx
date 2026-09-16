import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-md border border-line bg-panel", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  actions,
  icon,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="type-label flex items-center gap-2 !text-ink-2">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 max-w-prose text-[13px] leading-snug text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 pb-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {meta && <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">{meta}</div>}
        <h1 className="type-display text-[30px] uppercase text-ink sm:text-[40px]">{typeof title === "string" ? keepDashAttached(title) : title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  className,
  mono,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-ink", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}
