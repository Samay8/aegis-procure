"use client";

import Link from "next/link";
import { Crosshair, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { RELATIONSHIP_TYPE_META } from "@/data/reference";
import { RELATIONSHIPS } from "@/data/relationships";
import { vendorName } from "@/data/vendors";
import { formatDate } from "@/lib/format";
import { useCaseView, useMediaQuery } from "@/lib/hooks";
import { getNetwork } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { NetworkEdge } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { IntelPanel, STRENGTH_TONE } from "@/components/network/intel-panel";
import { NetworkGraphView, NetworkLegend } from "@/components/network/network-graph";
import { FilterChips } from "@/components/network/relationships-view";
import type { NetworkFilterId } from "@/data/reference";

export function RelationshipsTab({ caseId }: { caseId: string }) {
  const view = useCaseView(caseId);
  const graph = useMemo(() => getNetwork(), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const vendorIds = useMemo(
    () => (view ? [view.investigation.vendorId, ...view.investigation.relatedVendorIds].filter((id) => graph.nodeById.has(id)) : []),
    [view, graph],
  );

  const restrict = useMemo(() => {
    const ids = new Set<string>(vendorIds);
    if (view?.investigation.tenderId && graph.nodeById.has(view.investigation.tenderId)) ids.add(view.investigation.tenderId);
    for (const edge of graph.edges) {
      if (edge.type === "ISSUED_BY") continue;
      if (vendorIds.includes(edge.source)) ids.add(edge.target);
      if (vendorIds.includes(edge.target)) ids.add(edge.source);
    }
    return ids;
  }, [graph, vendorIds, view]);

  const relationships = useMemo(
    () =>
      RELATIONSHIPS.filter((r) => r.vendorIds.some((id) => vendorIds.includes(id))).sort(
        (a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[a.strength] - ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[b.strength] || b.evidenceCount - a.evidenceCount,
      ),
    [vendorIds],
  );

  const defaultEdge = useMemo(() => {
    const rel = relationships.find((r) => r.via && r.verification === "REQUIRES_VERIFICATION");
    return rel ? graph.edges.find((e) => e.relationshipId === rel.id) ?? null : null;
  }, [relationships, graph]);

  const [filters, setFilters] = useState<NetworkFilterId[]>(["all"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edge, setEdge] = useState<NetworkEdge | null>(() => (isDesktop ? defaultEdge : null));
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);

  if (!view) return null;

  if (!vendorIds.length) {
    return (
      <Panel>
        <EmptyState icon={Network} title="No vendor relationships" description="No relationship records or shared tenders connect the vendors in this case." />
      </Panel>
    );
  }

  const panel = (
    <IntelPanel
      graph={graph}
      nodeId={selectedId}
      edge={edge}
      onSelectNode={(id) => {
        setEdge(null);
        setSelectedId(id);
        setFocusRequest({ id, nonce: Date.now() });
      }}
      onSelectEdge={(next) => {
        setSelectedId(null);
        setEdge(next);
      }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="type-display text-[28px] uppercase text-ink sm:text-[34px]">Follow the relationships.</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
            The vendors in this case, the entities they share and the tenders where they met. Select a violet link to open the evidence behind it.
          </p>
        </div>
        <ButtonLink href={`/relationships?focus=${view.investigation.vendorId}`} size="sm">
          Open the full network
        </ButtonLink>
      </div>

      <FilterChips value={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <NetworkGraphView
            graph={graph}
            filters={filters}
            restrictTo={restrict}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id) setEdge(null);
            }}
            selectedEdgeId={edge?.id ?? null}
            onSelectEdge={setEdge}
            focusRequest={focusRequest}
            height={isDesktop ? 560 : 420}
          />
          <NetworkLegend className="mt-3" />
        </div>
        {isDesktop ? (
          <Panel className="max-h-[620px] overflow-y-auto">
            <PanelHeader title="Intelligence" icon={<Crosshair className="h-3.5 w-3.5" />} />
            <div className="p-4">{panel}</div>
          </Panel>
        ) : (
          <Drawer
            open={Boolean(selectedId || edge)}
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

      <Panel>
        <PanelHeader title="Relationship strength" description="Every relationship touching this case, with its evidence window." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Relationship type</th>
                <th className="px-4 py-2.5 font-medium">Vendors</th>
                <th className="px-4 py-2.5 font-medium">Strength</th>
                <th className="px-4 py-2.5 text-right font-medium">Evidence</th>
                <th className="px-4 py-2.5 font-medium">First observed</th>
                <th className="px-4 py-2.5 font-medium">Last observed</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel) => {
                const graphEdge = graph.edges.find((e) => e.relationshipId === rel.id);
                return (
                  <tr
                    key={rel.id}
                    onClick={() => {
                      if (graphEdge) {
                        setSelectedId(null);
                        setEdge(graphEdge);
                        setFocusRequest({ id: graphEdge.source, nonce: Date.now() });
                      }
                    }}
                    className={cn("border-b border-line last:border-0", graphEdge && "cursor-pointer hover:bg-panel-2", edge?.relationshipId === rel.id && "bg-panel-2")}
                  >
                    <td className="px-4 py-2.5 text-ink">{RELATIONSHIP_TYPE_META[rel.type].label}</td>
                    <td className="px-4 py-2.5 text-ink-2">
                      <Link href={`/vendors/${rel.vendorIds[0]}`} onClick={(e) => e.stopPropagation()} className="hover:text-ink">
                        {vendorName(rel.vendorIds[0])}
                      </Link>{" "}
                      <span className="text-ink-3">↔</span>{" "}
                      <Link href={`/vendors/${rel.vendorIds[1]}`} onClick={(e) => e.stopPropagation()} className="hover:text-ink">
                        {vendorName(rel.vendorIds[1])}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STRENGTH_TONE[rel.strength]}>{rel.strength.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-2">{rel.evidenceCount} records</td>
                    <td className="px-4 py-2.5 tabular text-ink-3">{formatDate(rel.firstObserved)}</td>
                    <td className="px-4 py-2.5 tabular text-ink-3">{formatDate(rel.lastObserved)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
