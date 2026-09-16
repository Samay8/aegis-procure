"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building, CornerDownLeft, FileText, FolderKanban, ScrollText, Search, Zap } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { countResults, searchAll, type SearchKind, type SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Kbd } from "@/components/ui/misc";

export const KIND_LABEL: Record<SearchKind, string> = {
  VENDOR: "Vendors",
  TENDER: "Tenders",
  CONTRACT: "Contracts",
  CASE: "Cases",
  SIGNAL: "Signals",
};

export const KIND_ICON = {
  VENDOR: Building,
  TENDER: FileText,
  CONTRACT: ScrollText,
  CASE: FolderKanban,
  SIGNAL: Zap,
};

const ORDER: SearchKind[] = ["CASE", "VENDOR", "TENDER", "CONTRACT", "SIGNAL"];

export function CommandSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const userCases = useAegis((s) => s.userCases);
  const importedSignals = useAegis((s) => s.importedSignals);

  const results = useMemo(
    () => searchAll(query, { limit: 4, extraCases: userCases, extraSignals: importedSignals }),
    [query, userCases, importedSignals],
  );
  const flat = useMemo(() => ORDER.flatMap((kind) => results[kind]), [results]);
  const total = countResults(results);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (cursor < flat.length && flat[cursor]) go(flat[cursor].href);
      else if (query.trim().length >= 2) go(`/search?q=${encodeURIComponent(query.trim())}`);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length >= 2;
  let index = -1;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-label="Search tenders, vendors, contracts, cases and signals"
          placeholder="Search tender, vendor, contract, department…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-9 w-full rounded-[6px] border border-line bg-panel pl-9 pr-16 text-[13px] text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus-visible:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-search-cancel-button]:hidden"
        />
        <Kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">Ctrl K</Kbd>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[70vh] overflow-y-auto rounded-md border border-line-strong bg-[#161a20] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            {total === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-ink-3">
                No records match “{query}”. Try a tender id, vendor name or department.
              </div>
            ) : (
              ORDER.filter((kind) => results[kind].length).map((kind) => {
                const Icon = KIND_ICON[kind];
                return (
                  <div key={kind} className="border-b border-line last:border-0">
                    <div className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">{KIND_LABEL[kind]}</div>
                    {results[kind].map((result: SearchResult) => {
                      index += 1;
                      const active = index === cursor;
                      return (
                        <button
                          key={`${kind}-${result.id}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setCursor(flat.indexOf(result))}
                          onClick={() => go(result.href)}
                          className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", active ? "bg-panel-3" : "hover:bg-panel-2")}
                        >
                          <Icon aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-ink">{result.title}</span>
                            <span className="block truncate text-xs text-ink-3">{result.subtitle}</span>
                          </span>
                          {active && <CornerDownLeft aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
            <button
              type="button"
              onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
              onMouseEnter={() => setCursor(flat.length)}
              className={cn("flex w-full items-center justify-between px-3 py-2.5 text-left text-xs text-accent-ink", cursor === flat.length ? "bg-panel-3" : "hover:bg-panel-2")}
            >
              See all results for “{query.trim()}”
              <CornerDownLeft aria-hidden className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
