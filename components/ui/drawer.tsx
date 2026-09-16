"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useDialogBehavior(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open]);

  return panelRef;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  side = "right",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  className?: string;
}) {
  const panelRef = useDialogBehavior(open, onClose);
  const titleId = useId();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 h-full w-full cursor-default bg-[#05070a]/70 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "absolute top-0 flex h-full w-full flex-col border-line bg-panel shadow-[0_0_60px_rgba(0,0,0,0.5)] outline-none sm:max-w-xl",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              className,
            )}
            initial={{ x: side === "right" ? 48 : -48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: side === "right" ? 48 : -48, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="type-title text-lg text-ink">
                  {title}
                </h2>
                {subtitle && <div className="mt-1 text-[13px] text-ink-3">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-ink-3 hover:bg-panel-3 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useDialogBehavior(open, onClose);
  const titleId = useId();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 h-full w-full cursor-default bg-[#05070a]/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn("relative w-full max-w-md rounded-md border border-line-strong bg-panel shadow-2xl outline-none", className)}
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <h2 id={titleId} className="type-title text-base text-ink">
                {title}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded text-ink-3 hover:bg-panel-3 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
