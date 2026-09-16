"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, ChevronDown, FolderKanban, RotateCcw, Settings } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CURRENT_INVESTIGATOR, LAST_ANALYSIS_AT } from "@/data/reference";
import { SYSTEM_SERVICES } from "@/data/platform";
import { formatTime, relativeTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_ICON } from "@/components/ui/icons";
import { Modal } from "@/components/ui/drawer";

function Popover({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const parent = ref.current?.parentElement;
      if (parent && !parent.contains(event.target as Node)) onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCloseRef.current();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14 }}
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-40 rounded-md border border-line-strong bg-[#161a20] shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SystemStatus() {
  const degraded = SYSTEM_SERVICES.filter((s) => s.status !== "OPERATIONAL");
  return (
    <Link
      href="/settings"
      className="hidden h-8 items-center gap-2 rounded-[5px] border border-line px-2.5 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink xl:flex"
      title={degraded.length ? `${degraded.map((d) => `${d.name}: ${d.latency}`).join(" · ")}` : "All services operational"}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-40 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      Live · analyzed {formatTime(LAST_ANALYSIS_AT)}
      {degraded.length > 0 && <span className="text-warn-ink">· {degraded.length} syncing</span>}
    </Link>
  );
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const notifications = useAegis((s) => s.notifications);
  const markRead = useAegis((s) => s.markNotificationRead);
  const markAll = useAegis((s) => s.markAllNotificationsRead);
  const now = useNow();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk px-1 text-[10px] font-bold text-[#1a0d0c] tabular">
            {unread}
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[min(92vw,380px)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="type-label !text-ink-2">Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="text-xs text-accent-ink hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {notifications.slice(0, 12).map((n) => {
            const Icon = NOTIFICATION_ICON[n.kind];
            const body = (
              <>
                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border", n.kind === "SIGNAL" ? "border-risk/40 bg-risk/10 text-risk-ink" : "border-line-strong bg-panel-2 text-ink-3")}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-[13px]", n.read ? "text-ink-2" : "font-medium text-ink")}>{n.title}</span>
                    {!n.read && <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-3">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-ink-3">{relativeTime(n.createdAt, now)}</span>
                </span>
              </>
            );
            return (
              <li key={n.id} className="border-b border-line last:border-0">
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className="flex gap-3 px-4 py-3 hover:bg-panel-2"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const resetDemo = useAegis((s) => s.resetDemo);
  const router = useRouter();
  const me = CURRENT_INVESTIGATOR;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Investigator menu"
        className="flex h-9 items-center gap-2 rounded-[6px] pl-1 pr-2 text-left transition-colors hover:bg-panel-3"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-accent-strong/90 text-[11px] font-bold tracking-wide text-white">
          {me.initials}
        </span>
        <span className="hidden leading-tight md:block">
          <span className="block text-[13px] font-medium text-ink">{me.name}</span>
          <span className="block text-[11px] text-ink-3">{me.role}</span>
        </span>
        <ChevronDown aria-hidden className="hidden h-3.5 w-3.5 text-ink-3 md:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-60 py-1.5">
        <div className="border-b border-line px-3 pb-2.5 pt-1.5">
          <div className="text-[13px] font-medium text-ink">{me.name}</div>
          <div className="text-xs text-ink-3">
            {me.role} · {me.unit}
          </div>
        </div>
        {[
          { href: "/investigations", label: "My investigations", icon: FolderKanban },
          { href: "/saved", label: "Saved items", icon: Bookmark },
          { href: "/settings", label: "Settings & audit log", icon: Settings },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 hover:bg-panel-2 hover:text-ink"
          >
            <item.icon className="h-3.5 w-3.5 text-ink-3" /> {item.label}
          </Link>
        ))}
        <div className="my-1 border-t border-line" />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm(true);
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-panel-2 hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5 text-ink-3" /> Reset demo workspace
        </button>
      </Popover>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo workspace?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Keep my changes
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetDemo();
                setConfirm(false);
                router.push("/overview");
              }}
            >
              Reset workspace
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-2">
          Case statuses, notes, priority changes, saved items, AI conversations and imports stored in this browser will return to the demo starting point.
        </p>
      </Modal>
    </div>
  );
}
