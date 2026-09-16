"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FolderKanban, LayoutDashboard, Menu, Radar, Waypoints } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Drawer } from "@/components/ui/drawer";
import { SyntheticNotice } from "@/components/ui/notices";
import { CommandSearch } from "./command-search";
import { LogoMark, Wordmark } from "./logo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav";
import { NavList, Sidebar, useNavCounts } from "./sidebar";
import { NotificationsMenu, ProfileMenu, SystemStatus } from "./topbar-menus";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-10 w-10" />
        <div className="h-[2px] w-40 overflow-hidden rounded-full bg-panel-3">
          <div className="h-full w-1/3 animate-[aegis-shimmer_1.1s_ease-in-out_infinite] bg-accent" />
        </div>
        <span className="text-xs text-ink-3">Loading procurement intelligence…</span>
      </div>
    </div>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const counts = useNavCounts();
  return (
    <Drawer open={open} onClose={onClose} side="left" title={<Wordmark />} className="sm:max-w-xs">
      <nav className="px-3 py-4" aria-label="Mobile">
        <NavList items={PRIMARY_NAV} counts={counts} onNavigate={onClose} />
        <div className="mx-3 my-4 border-t border-line" />
        <NavList items={SECONDARY_NAV} counts={counts} onNavigate={onClose} />
        <SyntheticNotice compact className="mx-3 mt-6" />
      </nav>
    </Drawer>
  );
}

const BOTTOM = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/investigations", label: "Cases", icon: FolderKanban },
  { href: "/relationships", label: "Network", icon: Waypoints },
];

function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-[#12161a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {BOTTOM.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-ink" : "text-ink-3")}
          >
            <item.icon className={cn("h-[18px] w-[18px]", active && "text-accent-ink")} />
            {item.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMenu} className="flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-ink-3">
        <Menu className="h-[18px] w-[18px]" />
        More
      </button>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const collapsed = useAegis((s) => s.prefs.sidebarCollapsed);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  if (!hydrated) return <Splash />;

  return (
    <div className="min-h-screen bg-ground">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-accent-strong px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar className="hidden lg:flex" />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      <div className={cn("flex min-h-screen min-w-0 flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-[244px]")}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ground/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-2 hover:bg-panel-3 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/overview" className="sm:hidden" aria-label="Overview">
            <LogoMark />
          </Link>
          <CommandSearch className="min-w-0 max-w-xl flex-1" />
          <div className="ml-auto flex items-center gap-1.5">
            <SystemStatus />
            <NotificationsMenu />
            <ProfileMenu />
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-14">
          <motion.div
            key={pathname.split("/").slice(0, 2).join("/")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-[1480px]"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <BottomNav onMenu={() => setNavOpen(true)} />
    </div>
  );
}
