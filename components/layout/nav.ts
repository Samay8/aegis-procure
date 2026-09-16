import {
  Bell,
  Bookmark,
  Building,
  ChartColumn,
  Database,
  FileSearch,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Radar,
  ScrollText,
  Settings,
  Wallet,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export type NavCountKey = "cases" | "signals" | "saved";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: NavCountKey;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/procurement", label: "Procurement Explorer", icon: FileSearch },
  { href: "/radar", label: "Anomaly Radar", icon: Radar },
  { href: "/investigations", label: "Investigations", icon: FolderKanban, count: "cases" },
  { href: "/vendors", label: "Vendors", icon: Building },
  { href: "/relationships", label: "Relationships", icon: Waypoints },
  { href: "/contracts", label: "Contracts", icon: ScrollText },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/alerts", label: "Alerts", icon: Bell, count: "signals" },
  { href: "/saved", label: "Saved Cases", icon: Bookmark, count: "saved" },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/data-sources", label: "Data Sources", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
