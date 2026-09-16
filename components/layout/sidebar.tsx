"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useMemo } from "react";
import { ACTIVE_STATUSES } from "@/data/reference";
import { useCaseViews, useOpenSignalCount } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { SyntheticNotice } from "@/components/ui/notices";
import { Wordmark } from "./logo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavCountKey, type NavItem } from "./nav";

export function useNavCounts(): Record<NavCountKey, number> {
  const views = useCaseViews();
  const openSignals = useOpenSignalCount();
  const saved = useAegis((s) => s.saved);
  return useMemo(
    () => ({
      cases: views.filter((v) => ACTIVE_STATUSES.includes(v.state.status)).length,
      signals: openSignals,
      saved: saved.CASE.length + saved.VENDOR.length + saved.PROCUREMENT.length + saved.EVIDENCE.length,
    }),
    [views, openSignals, saved],
  );
}

export function NavList({
  items,
  collapsed,
  counts,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  counts: Record<NavCountKey, number>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const count = item.count ? counts[item.count] : undefined;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-3 rounded-[5px] px-3 text-[13px] font-medium transition-colors",
                active ? "bg-panel-3 text-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
                collapsed && "justify-center px-0",
              )}
            >
              {active && <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />}
              <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active ? "text-accent-ink" : "text-ink-3 group-hover:text-ink-2")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && count != null && count > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-[3px] px-1.5 text-[11px] tabular leading-[18px]",
                    item.count === "signals" ? "bg-risk/15 text-risk-ink" : "bg-panel-3 text-ink-3",
                  )}
                >
                  {count}
                </span>
              )}
              {collapsed && count != null && count > 0 && (
                <span aria-hidden className={cn("absolute right-2 top-2 h-1.5 w-1.5 rounded-full", item.count === "signals" ? "bg-risk" : "bg-accent")} />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const collapsed = useAegis((s) => s.prefs.sidebarCollapsed);
  const setPref = useAegis((s) => s.setPref);
  const counts = useNavCounts();

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex-col border-r border-line bg-[#12161a] transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[244px]",
        className,
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-5")}>
        <Link href="/" aria-label="AEGIS PROCURE home" className="rounded-sm">
          <Wordmark compact={collapsed} />
        </Link>
      </div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Intelligence</div>}
        <NavList items={PRIMARY_NAV} collapsed={collapsed} counts={counts} />
        <div className={cn("my-4 border-t border-line", !collapsed && "mx-3")} />
        {!collapsed && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Workspace</div>}
        <NavList items={SECONDARY_NAV} collapsed={collapsed} counts={counts} />
      </nav>
      <div className={cn("border-t border-line py-3", collapsed ? "px-2" : "px-5")}>
        {!collapsed && <SyntheticNotice compact className="mb-3" />}
        <button
          type="button"
          onClick={() => setPref("sidebarCollapsed", !collapsed)}
          className={cn("flex h-8 w-full items-center gap-2 rounded-[5px] text-xs text-ink-3 hover:bg-panel-2 hover:text-ink", collapsed ? "justify-center" : "px-2")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
