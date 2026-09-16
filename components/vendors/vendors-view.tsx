"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Building, GitCompareArrows, Info, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { PLATFORM, TOP_VENDORS, VENDOR_ROWS, concentrationBy } from "@/data/analytics";
import { CATEGORIES, CATEGORY_BY_ID, REGIONS, REGION_BY_ID } from "@/data/reference";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, SearchInput, Select } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/misc";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/tabs";
import { BarList } from "@/components/charts/bar-list";
import { CHART } from "@/components/charts/theme";

const PAGE_SIZE = 25;

function ConcentrationPanel() {
  const [dimension, setDimension] = useState<"department" | "region" | "category">("category");
  const rows = useMemo(() => concentrationBy(dimension), [dimension]);
  const topShare = TOP_VENDORS.top.reduce((s, v) => s + v.share, 0);

  return (
    <Panel>
      <PanelHeader title="Who is winning the work?" description={`Share of ${formatINR(PLATFORM.value)} in awarded contract value, across ${TOP_VENDORS.winningVendors} vendors that won at least one contract.`} />
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <PanelBody className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="type-label">Top 10 vendors</span>
            <span className="text-xs text-ink-3">
              <span className="font-semibold tabular text-ink">{topShare.toFixed(1)}%</span> of value
            </span>
          </div>
          <BarList
            items={[
              ...TOP_VENDORS.top.map((v) => ({
                id: v.vendorId,
                label: v.name,
                sublabel: `${v.contracts} contracts`,
                value: v.share,
                display: `${v.share.toFixed(1)}%`,
                href: `/vendors/${v.vendorId}`,
              })),
              {
                id: "others",
                label: "Others",
                sublabel: `${TOP_VENDORS.others.vendors} vendors`,
                value: TOP_VENDORS.others.share,
                display: `${TOP_VENDORS.others.share.toFixed(1)}%`,
              },
            ]}
            max={100}
            color={CHART.series[0]}
          />
        </PanelBody>
        <PanelBody>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="type-label">Concentration by</span>
            <Segmented
              label="Concentration dimension"
              value={dimension}
              onChange={setDimension}
              options={[
                { value: "category", label: "Category" },
                { value: "department", label: "Department" },
                { value: "region", label: "Geography" },
              ]}
            />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <tr>
                <th className="pb-2 font-medium">{dimension === "region" ? "Region" : dimension === "department" ? "Department" : "Category"}</th>
                <th className="pb-2 font-medium">Largest vendor</th>
                <th className="pb-2 text-right font-medium">Top 1</th>
                <th className="pb-2 text-right font-medium">Top 3</th>
                <th className="pb-2 text-right font-medium" title="Herfindahl–Hirschman index">HHI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2 text-ink">{row.name}</td>
                  <td className="max-w-[10rem] truncate py-2 text-ink-2">
                    {row.topVendorId ? (
                      <Link href={`/vendors/${row.topVendorId}`} className="hover:text-ink">
                        {vendorName(row.topVendorId)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={cn("py-2 text-right tabular", row.topShare >= 50 ? "text-warn-ink" : "text-ink-2")}>{row.topShare.toFixed(0)}%</td>
                  <td className="py-2 text-right tabular text-ink-2">{row.top3Share.toFixed(0)}%</td>
                  <td className="py-2 text-right tabular text-ink-3">{formatNumber(row.hhi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </PanelBody>
      </div>
      <p className="flex items-start gap-2.5 border-t border-line px-4 py-3 text-[13px] leading-relaxed text-ink-2">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
        High award concentration can be legitimate in specialized markets. The system therefore combines concentration with contextual signals rather than treating concentration alone as suspicious.
      </p>
    </Panel>
  );
}

export function VendorsView() {
  const router = useRouter();
  const saved = useAegis((s) => s.saved.VENDOR);
  const toggleSaved = useAegis((s) => s.toggleSaved);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [activeOnly, setActiveOnly] = useState(true);
  const [signalsOnly, setSignalsOnly] = useState(false);
  const [sort, setSort] = useState<"value" | "wins" | "signals" | "name">("value");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VENDOR_ROWS.filter((row) => {
      if (activeOnly && !row.bids) return false;
      if (signalsOnly && !row.signals) return false;
      if (category !== "ALL" && !row.vendor.categories.includes(category as never)) return false;
      if (region !== "ALL" && row.vendor.regionId !== region) return false;
      if (q && !`${row.vendor.id} ${row.vendor.name} ${row.vendor.city}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) =>
      sort === "name" ? a.vendor.name.localeCompare(b.vendor.name) : sort === "wins" ? b.wins - a.wins : sort === "signals" ? b.signals - a.signals || b.value - a.value : b.value - a.value,
    );
  }, [query, category, region, activeOnly, signalsOnly, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Building className="h-3.5 w-3.5" /> {formatNumber(PLATFORM.vendors)} registered · {formatNumber(PLATFORM.activeVendors)} active in the analysis window
          </>
        }
        title="Vendors"
        description="Registry, participation and awards for every vendor. Concentration is shown with its context, not as a verdict."
        actions={
          <ButtonLink href="/vendors/compare" size="sm">
            <GitCompareArrows className="h-3.5 w-3.5" /> Compare vendors
          </ButtonLink>
        }
      />

      <ConcentrationPanel />

      <Panel>
        <PanelHeader title="Vendor directory" description={`${formatNumber(rows.length)} vendors match`} />
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={(v) => reset(() => setQuery(v))} placeholder="Search name, id or city…" className="lg:w-72" label="Search vendors" />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Select aria-label="Category" value={category} onChange={(e) => reset(() => setCategory(e.target.value))}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Region" value={region} onChange={(e) => reset(() => setRegion(e.target.value))}>
              <option value="ALL">All regions</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Sort vendors" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="value">Sort by contract value</option>
              <option value="wins">Sort by awards</option>
              <option value="signals">Sort by signals</option>
              <option value="name">Sort by name</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox checked={activeOnly} onChange={(v) => reset(() => setActiveOnly(v))} label="Active only" />
            <Checkbox checked={signalsOnly} onChange={(v) => reset(() => setSignalsOnly(v))} label="With signals" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No vendors found" description="No registered vendors match these filters. Clear the search or include inactive vendors." action={<Button size="sm" onClick={() => reset(() => { setQuery(""); setCategory("ALL"); setRegion("ALL"); setActiveOnly(false); setSignalsOnly(false); })}>Clear filters</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Region</th>
                    <th className="px-4 py-2.5 text-right font-medium">Bids</th>
                    <th className="px-4 py-2.5 text-right font-medium">Awards</th>
                    <th className="px-4 py-2.5 text-right font-medium">Contract value</th>
                    <th className="px-4 py-2.5 text-right font-medium">Signals</th>
                    <th className="px-4 py-2.5 font-medium">Last bid</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const isSaved = saved.includes(row.vendor.id);
                    return (
                      <tr key={row.vendor.id} onClick={() => router.push(`/vendors/${row.vendor.id}`)} className="cursor-pointer border-b border-line last:border-0 hover:bg-panel-2">
                        <td className="px-4 py-2.5">
                          <div className="text-ink">{row.vendor.name}</div>
                          <div className="font-mono text-[11px] text-ink-3">{row.vendor.id}</div>
                        </td>
                        <td className="px-4 py-2.5 text-ink-2">{CATEGORY_BY_ID[row.vendor.primaryCategory].name}</td>
                        <td className="px-4 py-2.5 text-ink-3">{REGION_BY_ID[row.vendor.regionId].short}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{row.bids}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{row.wins}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink">{row.value ? formatINR(row.value) : "—"}</td>
                        <td className="px-4 py-2.5 text-right">{row.signals ? <Badge tone="risk">{row.signals}</Badge> : <span className="text-ink-3">0</span>}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{row.lastActivity ? formatDate(row.lastActivity.slice(0, 10)) : "—"}</td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaved("VENDOR", row.vendor.id);
                            }}
                            aria-pressed={isSaved}
                            aria-label={isSaved ? `Remove ${row.vendor.name} bookmark` : `Bookmark ${row.vendor.name}`}
                            className={cn("flex h-7 w-7 items-center justify-center rounded", isSaved ? "text-accent-ink" : "text-ink-3 hover:text-ink")}
                          >
                            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={current} pageCount={pageCount} onPage={setPage} total={rows.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </Panel>
    </div>
  );
}
