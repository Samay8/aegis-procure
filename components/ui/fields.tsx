"use client";

import { ChevronDown, Search, X } from "lucide-react";
import type { ComponentProps, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

const control =
  "h-9 w-full min-w-0 rounded-[5px] border border-line-strong bg-panel-2 px-3 text-[13px] text-ink placeholder:text-ink-3 transition-colors hover:border-[#434b57] focus-visible:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "h-auto min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, wrapperClassName, ...props }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span className={cn("relative block min-w-0", wrapperClassName)}>
      <select className={cn(control, "appearance-none pr-8", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
  label = "Search",
  onKeyDown,
  onFocus,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  label?: string;
  onKeyDown?: ComponentProps<"input">["onKeyDown"];
  onFocus?: ComponentProps<"input">["onFocus"];
  autoFocus?: boolean;
}) {
  return (
    <span className={cn("relative block min-w-0", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className={cn(control, "pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-3 hover:bg-panel-3 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export function Field({ label, children, className, hint }: { label: ReactNode; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-ink-2", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer appearance-none rounded-[3px] border border-line-strong bg-panel-2 bg-center bg-no-repeat checked:border-accent checked:bg-accent-strong checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22M4 8.5l2.5 2.5L12 5.5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')]"
      />
      {label}
    </label>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm text-ink">{label}</div>
        {description && <div className="mt-0.5 text-xs text-ink-3">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent-strong" : "border-line-strong bg-panel-3",
        )}
      >
        <span className={cn("absolute top-[2px] h-3.5 w-3.5 rounded-full bg-ink transition-[left]", checked ? "left-[18px]" : "left-[2px]")} />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
