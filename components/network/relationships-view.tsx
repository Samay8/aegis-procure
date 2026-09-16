"use client";

import { Crosshair, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { NETWORK_FILTERS, RELATIONSHIP_TYPE_META, STRENGTH_META, type NetworkFilterId } from "@/data/reference";
import { RELATIONSHIPS } from "@/data/relationships";
import { vendorName } from "@/data/vendors";
import { formatDate } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { getNetwork } from "@/lib/network";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { NetworkEdge } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Select, Switch } from "@/components/ui/fields";
import { Stat } from "@/components/ui/misc";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { IntelPanel, STRENGTH_TONE } from "./intel-panel";
import { NetworkGraphView, NetworkLegend } from "./network-graph";

export function FilterChips({ value, onChange }: { value: NetworkFilterId[]; onChange: (next: NetworkFilterId[]) => void }) {
  const toggle = (id: NetworkFilterId) => {
    if (id === "all") return onChange(["all"]);
    const without = value.filter((v) => v !== "all");
    const next = without.includes(id) ? without.filter((v) => v !== id) : [...without, id];
    onChange(next.length ? next : ["all"]);
  };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter relationship types">
      {NETWORK_FILTERS.map((filter) => {
        const active = value.includes(filter.id);
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(filter.id)}
            className={cn(
              "h-7 rounded-full border px-3 text-xs font-medium transition-colors",
              active ? "border-accent/60 bg-accent/15 text-accent-ink" : "border-line-strong text-ink-3 hover:border-[#48505c] hover:text-ink",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export function RelationshipsView({ focus, relationshipId }: { focus?: string; relationshipId?: string }) {
  const graph = useMemo(() => getNetwork(), []);
  const filters = useAegis((s) => s.networkFilters);
  const setFilters = useAegis((s) => s.setNetworkFilters);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const initialEdge = relationshipId ? graph.edges.find((e) => e.relationshipId === relationshipId) ?? null : null;
  const initialFocus = focus && graph.nodeById.has(focus) ? focus : initialEdge ? initialEdge.source : null;

  const [selectedId, setSelectedId] = useState<string | null>(initialFocus);
  const [edge, setEdge] = useState<NetworkEdge | null>(initialEdge);
  const [hideUnrelated, setHideUnrelated] = useState(false);
  const [depth, setDepth] = useState<"1" | "2">("1");
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(initialFocus ? { id: initialFocus, nonce: 1 } : null);
  const [tableFilter, setTableFilter] = useState<"attribute" | "all">("attribute");

  const vendorOptions = useMemo(
    () => graph.nodes.filter((n) => n.kind === "VENDOR").sort((a, b) => a.label.localeCompare(b.label)),
    [graph],
  );

  const selectNode = (id: string | null) => {
    setSelectedId(id);
    if (id) setEdge(null);
  };

  const selectEdge = (next: NetworkEdge | null) => {
    setEdge(next);
    if (next) setFocusRequest({ id: next.source, nonce: Date.now() });
  };

  const focusVendor = (id: string) => {
    setEdge(null);
    setSelectedId(id);
    setFocusRequest({ id, nonce: Date.now() });
  };

  const rows = useMemo(() => {
    const list = RELATIONSHIPS.filter((r) =>
      tableFilter === "attribute" ? r.type !== "JOINT_BIDDING" && r.type !== "REPEATED_PARTICIPATION" : true,
    ).filter((r) => filters.includes("all") || filters.includes(RELATIONSHIP_TYPE_META[r.type].filter));
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return list.sort((a, b) => order[a.strength] - order[b.strength] || b.evidenceCount - a.evidenceCount);
  }, [filters, tableFilter]);

  const attribute = RELATIONSHIPS.filter((r) => r.type !== "JOINT_BIDDING" && r.type !== "REPEATED_PARTICIPATION");
  const hasSelection = Boolean(selectedId || edge);

  const panel = <IntelPanel graph={graph} nodeId={selectedId} edge={edge} onSelectNode={focusVendor} onSelectEdge={selectEdge} />;

  return (
    <div>
      <PageHeader
        meta={
          <>
            <Network className="h-3.5 w-3.5" /> Relationship intelligence
          </>
        }
        title="Follow the relationships."
        description="Vendors, tenders, contracts, directors, addresses and contact details in one network. Every link carries the records behind it; none of them is treated as proof on its own."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 rounded-md border border-line bg-panel p-4 sm:grid-cols-4">
        <Stat label="Relationship records" value={RELATIONSHIPS.length} />
        <Stat label="Shared-entity links" value={attribute.length} tone="rel" />
        <Stat label="High strength" value={RELATIONSHIPS.filter((r) => r.strength === "HIGH").length} tone="risk" />
        <Stat label="Explained by context" value={RELATIONSHIPS.filter((r) => r.verification === "CONTEXT_EXPLAINED").length} tone="ok" />
      </div>

      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterChips value={filters} onChange={setFilters} />
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Focus a vendor"
            value={selectedId && graph.nodeById.get(selectedId)?.kind === "VENDOR" ? selectedId : ""}
            onChange={(e) => e.target.value && focusVendor(e.target.value)}
            wrapperClassName="w-56"
          >
            <option value="">Focus a vendor…</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
          <Segmented
            label="Neighborhood depth"
            value={depth}
            onChange={setDepth}
            options={[
              { value: "1", label: "1 hop" },
              { value: "2", label: "2 hops" },
            ]}
          />
          <div className="w-44">
            <Switch checked={hideUnrelated} onChange={setHideUnrelated} label="Hide unrelated" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <NetworkGraphView
            graph={graph}
            filters={filters}
            selectedId={selectedId}
            onSelect={selectNode}
            selectedEdgeId={edge?.id ?? null}
            onSelectEdge={selectEdge}
            hideUnrelated={hideUnrelated && hasSelection}
            depth={depth === "2" ? 2 : 1}
            focusRequest={focusRequest}
            height={isDesktop ? 640 : 460}
          />
          <NetworkLegend className="mt-3" />
        </div>

        {isDesktop ? (
          <Panel className="max-h-[700px] overflow-y-auto">
            <PanelHeader title="Intelligence" icon={<Crosshair className="h-3.5 w-3.5" />} />
            <div className="p-4">{panel}</div>
          </Panel>
        ) : (
          <Drawer
            open={hasSelection}
            onClose={() => {
              setSelectedId(null);
              setEdge(null);
            }}
            title="Intelligence"
          >
            <div className="p-5">{panel}</div>
          </Drawer>
        )}
      </div>

      <Panel className="mt-6">
        <PanelHeader
          title="Relationship signals"
          description="Every relationship with its strength, evidence count and observation window. Select a row to trace it in the network."
          actions={
            <Segmented
              label="Relationship scope"
              value={tableFilter}
              onChange={setTableFilter}
              options={[
                { value: "attribute", label: "Shared entities" },
                { value: "all", label: "Include joint bidding" },
              ]}
            />
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={Network} title="No vendor relationships" description="No relationship records match the selected filters. Try All relationships." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Relationship</th>
                  <th className="px-4 py-2.5 font-medium">Vendors</th>
                  <th className="px-4 py-2.5 font-medium">Strength</th>
                  <th className="px-4 py-2.5 text-right font-medium">Evidence</th>
                  <th className="px-4 py-2.5 font-medium">First observed</th>
                  <th className="px-4 py-2.5 font-medium">Last observed</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rel) => {
                  const graphEdge = graph.edges.find((e) => e.relationshipId === rel.id);
                  const active = edge?.relationshipId === rel.id;
                  return (
                    <tr
                      key={rel.id}
                      className={cn("cursor-pointer border-b border-line last:border-0 hover:bg-panel-2", active && "bg-panel-2")}
                      onClick={() => {
                        if (graphEdge) {
                          setSelectedId(null);
                          selectEdge(graphEdge);
                        } else focusVendor(rel.vendorIds[0]);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-ink">{RELATIONSHIP_TYPE_META[rel.type].label}</div>
                        <div className="font-mono text-[11px] text-ink-3">{rel.id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {vendorName(rel.vendorIds[0])} <span className="text-ink-3">↔</span> {vendorName(rel.vendorIds[1])}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={STRENGTH_TONE[rel.strength]} title={STRENGTH_META[rel.strength].description}>
                          {rel.strength.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-ink-2">{rel.evidenceCount}</td>
                      <td className="px-4 py-2.5 tabular text-ink-3">{formatDate(rel.firstObserved)}</td>
                      <td className="px-4 py-2.5 tabular text-ink-3">{formatDate(rel.lastObserved)}</td>
                      <td className="px-4 py-2.5">
                        {rel.verification === "CONTEXT_EXPLAINED" ? <Badge tone="ok">Context explained</Badge> : <Badge tone="rel">Requires verification</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
