"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkTab {
  href: string;
  label: string;
  count?: number;
  exact?: boolean;
  icon?: LucideIcon;
}

export function LinkTabs({ items, className, layoutId = "tab-underline" }: { items: LinkTab[]; className?: string; layoutId?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className={cn("no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="flex min-w-max items-stretch gap-1 border-b border-line">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 px-3 text-[13px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {Icon && <Icon aria-hidden className="h-3.5 w-3.5" />}
                {item.label}
                {item.count != null && (
                  <span className={cn("rounded-[3px] px-1 text-[11px] tabular", active ? "bg-accent/15 text-accent-ink" : "bg-panel-3 text-ink-3")}>
                    {item.count}
                  </span>
                )}
              </Link>
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("no-scrollbar flex max-w-full overflow-x-auto rounded-[6px] border border-line bg-panel p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-medium transition-colors",
              active ? "bg-panel-3 text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-ink-3 hover:text-ink",
            )}
          >
            {option.label}
            {option.count != null && <span className="tabular text-[11px] text-ink-3">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
