"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { countResults, searchAll, type SearchKind } from "@/lib/search";
import { useAegis } from "@/store/aegis";
import { SearchInput } from "@/components/ui/fields";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { KIND_ICON, KIND_LABEL } from "@/components/layout/command-search";

const ORDER: SearchKind[] = ["VENDOR", "TENDER", "CONTRACT", "CASE", "SIGNAL"];

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const userCases = useAegis((s) => s.userCases);
  const importedSignals = useAegis((s) => s.importedSignals);

  const results = useMemo(() => searchAll(query, { extraCases: userCases, extraSignals: importedSignals }), [query, userCases, importedSignals]);
  const total = countResults(results);

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Search className="h-3.5 w-3.5" /> Search across vendors, tenders, contracts, cases and signals
          </>
        }
        title="Search"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Try “Vertex”, “TND-2026-04182” or “Public Works”" label="Search" autoFocus />
      </form>

      {query.trim().length < 2 ? (
        <Panel>
          <EmptyState icon={Search} title="Start typing to search" description="Search by name, record id, department, category or location." />
        </Panel>
      ) : total === 0 ? (
        <Panel>
          <EmptyState icon={SearchX} title="No search results" description={`Nothing matches “${query}”. Check the spelling or try a record id.`} />
        </Panel>
      ) : (
        <>
          <p className="text-[13px] text-ink-3">
            {total} results for <span className="text-ink">“{query}”</span>
          </p>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {ORDER.filter((kind) => results[kind].length).map((kind) => {
              const Icon = KIND_ICON[kind];
              const list = results[kind];
              const open = expanded[kind];
              return (
                <Panel key={kind}>
                  <PanelHeader
                    title={`${kind === "TENDER" ? "Related tenders" : KIND_LABEL[kind]} · ${list.length}`}
                    icon={<Icon className="h-3.5 w-3.5" />}
                  />
                  <ul className="divide-y divide-line">
                    {(open ? list : list.slice(0, 8)).map((result) => (
                      <li key={result.id}>
                        <Link href={result.href} className="block px-4 py-2.5 hover:bg-panel-2">
                          <div className="truncate text-[14px] text-ink">{result.title}</div>
                          <div className="truncate text-xs text-ink-3">{result.subtitle}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {list.length > 8 && (
                    <button type="button" onClick={() => setExpanded((e) => ({ ...e, [kind]: !open }))} className="w-full border-t border-line px-4 py-2.5 text-left text-xs text-accent-ink hover:bg-panel-2">
                      {open ? "Show fewer" : `Show all ${list.length}`}
                    </button>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
