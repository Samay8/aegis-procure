"use client";

import Link from "next/link";
import { ArrowUpRight, GitCompareArrows, MousePointerClick, ShieldAlert } from "lucide-react";
import { vendorProfile } from "@/data/analytics";
import { casesForVendor } from "@/data/cases";
import { BIDS_BY_TENDER, CONTRACT_BY_ID, TENDER_BY_ID } from "@/data/procurement";
import { DEPARTMENT_BY_ID, CATEGORY_BY_ID, ENTITY_KIND_META, RELATIONSHIP_TYPE_META, STRENGTH_META } from "@/data/reference";
import { ENTITIES, RELATIONSHIP_BY_ID, relationshipsForVendor } from "@/data/relationships";
import { signalsForTender, signalsForVendor } from "@/data/signals";
import { VENDOR_BY_ID, vendorName } from "@/data/vendors";
import { formatDate, formatINR } from "@/lib/format";
import type { NetworkGraph } from "@/lib/network";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { NetworkEdge, Relationship } from "@/types";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ENTITY_ICON } from "@/components/ui/icons";
import { RelationshipNote } from "@/components/ui/notices";
import { KeyValue } from "@/components/ui/panel";
import { RecordChip } from "@/components/ui/record-chip";

export const STRENGTH_TONE: Record<string, Tone> = { HIGH: "risk", MEDIUM: "warn", LOW: "slate" };

export function RelationshipDetail({ relationship, onSelectVendor }: { relationship: Relationship; onSelectVendor?: (id: string) => void }) {
  const [a, b] = relationship.vendorIds;
  const explained = relationship.verification === "CONTEXT_EXPLAINED";
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="rel">{RELATIONSHIP_TYPE_META[relationship.type].label} signal</Badge>
          <Badge tone={STRENGTH_TONE[relationship.strength]}>{relationship.strength.toLowerCase()} strength</Badge>
          {explained && <Badge tone="ok">Explained by context</Badge>}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{relationship.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          {[a, b].map((id, i) => (
            <span key={id} className="flex items-center gap-2">
              {i === 1 && <span className="text-ink-3">↔</span>}
              <button type="button" onClick={() => onSelectVendor?.(id)} className="rounded-[3px] font-medium text-accent-ink hover:underline">
                {vendorName(id)}
              </button>
            </span>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-[5px] border border-line bg-panel-2 p-3">
        <KeyValue label="Relationship type" value={RELATIONSHIP_TYPE_META[relationship.type].label} />
        <KeyValue label="Strength" value={<span title={STRENGTH_META[relationship.strength].description}>{STRENGTH_META[relationship.strength].label}</span>} />
        <KeyValue label="Evidence" value={`${relationship.evidenceCount} records`} />
        {relationship.matchScore != null ? <KeyValue label="Match" value={`${relationship.matchScore}%`} /> : <KeyValue label="Via" value={relationship.via?.label ?? "Bid register"} />}
        <KeyValue label="First observed" value={formatDate(relationship.firstObserved)} />
        <KeyValue label="Last observed" value={formatDate(relationship.lastObserved)} />
      </dl>

      <div>
        <h3 className="type-label mb-2">Evidence</h3>
        <ol className="space-y-2">
          {relationship.evidence.map((item) => (
            <li key={`${item.recordId}-${item.date}`} className="rounded-[5px] border border-line bg-panel-2/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <RecordChip id={item.recordId} />
                <span className="text-[11px] tabular text-ink-3">{formatDate(item.date)}</span>
              </div>
              <div className="mt-1.5 text-xs text-ink-3">{item.source}</div>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{item.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      {relationship.context && (
        <div className="rounded-[5px] border border-ok/30 bg-ok/[0.06] p-3">
          <h3 className="type-label !text-ok-ink">Context</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{relationship.context}</p>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-[5px] border border-rel/30 bg-rel/[0.07] p-3 text-[13px] leading-snug text-ink">
        <ShieldAlert aria-hidden className="mt-px h-4 w-4 shrink-0 text-rel-ink" />
        <span>
          This is an investigative lead, <strong>not proof of wrongdoing</strong>. Verify ownership, control and disclosure before relying on it.
        </span>
      </div>
    </div>
  );
}

function VendorDetail({ vendorId, graph, onSelectEdge }: { vendorId: string; graph: NetworkGraph; onSelectEdge: (edge: NetworkEdge) => void }) {
  const vendor = VENDOR_BY_ID[vendorId];
  const profile = vendorProfile(vendorId);
  const relationships = relationshipsForVendor(vendorId);
  const signals = signalsForVendor(vendorId);
  const cases = casesForVendor(vendorId);
  const setCompare = useAegis((s) => s.setCompare);

  const edgeFor = (rel: Relationship) => graph.edges.find((e) => e.relationshipId === rel.id);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{vendor.verification.replace("_", " ").toLowerCase()}</Badge>
          {signals.length > 0 && <Badge tone="risk">{signals.length} signals</Badge>}
          <span className="font-mono text-[11px] text-ink-3">{vendor.id}</span>
        </div>
        <h3 className="type-title mt-2 text-xl text-ink">{vendor.name}</h3>
        <p className="mt-1 text-[13px] text-ink-3">
          {vendor.classLabel} · {vendor.city}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-[5px] border border-line bg-panel-2 p-3">
        <KeyValue label="Procurements" value={profile.participations} />
        <KeyValue label="Win rate" value={`${profile.winRate.toFixed(0)}%`} />
        <KeyValue label="Contracts" value={formatINR(profile.contractValue)} />
        <KeyValue label="Departments" value={profile.departments.length} />
      </dl>

      <div>
        <h3 className="type-label mb-2">Relationships ({relationships.length})</h3>
        <ul className="space-y-1.5">
          {relationships.slice(0, 10).map((rel) => {
            const other = rel.vendorIds[0] === vendorId ? rel.vendorIds[1] : rel.vendorIds[0];
            const edge = edgeFor(rel);
            return (
              <li key={rel.id}>
                <button
                  type="button"
                  disabled={!edge}
                  onClick={() => edge && onSelectEdge(edge)}
                  className="flex w-full items-center justify-between gap-3 rounded-[4px] border border-line px-2.5 py-2 text-left hover:border-line-strong hover:bg-panel-2 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{vendorName(other)}</span>
                    <span className="block text-[11px] text-ink-3">
                      {RELATIONSHIP_TYPE_META[rel.type].label} · {rel.evidenceCount} records
                    </span>
                  </span>
                  <Badge tone={STRENGTH_TONE[rel.strength]}>{rel.strength.toLowerCase()}</Badge>
                </button>
              </li>
            );
          })}
          {!relationships.length && <li className="text-[13px] text-ink-3">No relationship records for this vendor.</li>}
        </ul>
      </div>

      {cases.length > 0 && (
        <div>
          <h3 className="type-label mb-2">Cases</h3>
          <div className="flex flex-wrap gap-1.5">
            {cases.map((c) => (
              <RecordChip key={c.id} id={c.id} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/vendors/${vendorId}`} variant="primary" size="sm">
          Vendor intelligence <ArrowUpRight className="h-3.5 w-3.5" />
        </ButtonLink>
        <ButtonLink href="/vendors/compare" size="sm" onClick={() => setCompare({ a: vendorId })}>
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare
        </ButtonLink>
      </div>
    </div>
  );
}

function EntityDetail({ entityId, graph, onSelectEdge, onSelectVendor }: { entityId: string; graph: NetworkGraph; onSelectEdge: (edge: NetworkEdge) => void; onSelectVendor: (id: string) => void }) {
  const node = graph.nodeById.get(entityId)!;
  const Icon = ENTITY_ICON[node.kind];

  if (node.kind === "TENDER") {
    const tender = TENDER_BY_ID.get(entityId)!;
    const bids = BIDS_BY_TENDER.get(entityId) ?? [];
    const signals = signalsForTender(entityId);
    return (
      <div className="space-y-4">
        <div>
          <span className="font-mono text-[11px] text-ink-3">{tender.id}</span>
          <h3 className="type-title mt-1 text-lg text-ink">{tender.title}</h3>
          <p className="mt-1 text-[13px] text-ink-3">
            {DEPARTMENT_BY_ID[tender.departmentId].name} · {CATEGORY_BY_ID[tender.categoryId].name}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 rounded-[5px] border border-line bg-panel-2 p-3">
          <KeyValue label="Award" value={tender.awardValue ? formatINR(tender.awardValue) : "—"} />
          <KeyValue label="Bids" value={bids.length} />
          <KeyValue label="Winner" value={tender.winnerVendorId ? vendorName(tender.winnerVendorId) : "—"} />
          <KeyValue label="Signals" value={signals.length} />
        </dl>
        <ul className="space-y-1">
          {bids.map((bid) => (
            <li key={bid.id} className="flex items-center justify-between gap-2 text-[13px]">
              <button type="button" onClick={() => onSelectVendor(bid.vendorId)} className="truncate text-left text-ink-2 hover:text-ink">
                {vendorName(bid.vendorId)}
              </button>
              <span className="tabular text-ink-3">{formatINR(bid.amount)}</span>
            </li>
          ))}
        </ul>
        <ButtonLink href={`/procurement/${tender.id}`} size="sm" variant="primary">
          Open procurement <ArrowUpRight className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
    );
  }

  if (node.kind === "CONTRACT" || node.kind === "DEPARTMENT") {
    const contract = CONTRACT_BY_ID.get(entityId);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-ink-3">
          <Icon className="h-4 w-4" /> {ENTITY_KIND_META[node.kind].label}
        </div>
        <h3 className="type-title text-lg text-ink">{node.kind === "CONTRACT" ? contract?.title : node.label}</h3>
        {contract && (
          <dl className="grid grid-cols-2 gap-4 rounded-[5px] border border-line bg-panel-2 p-3">
            <KeyValue label="Value" value={formatINR(contract.value)} />
            <KeyValue label="Vendor" value={vendorName(contract.vendorId)} />
            <KeyValue label="Signed" value={formatDate(contract.signedOn)} />
            <KeyValue label="Paid" value={formatINR(contract.paidToDate)} />
          </dl>
        )}
        <p className="text-[13px] text-ink-3">{graph.adjacency.get(entityId)?.size ?? 0} connected entities in this view.</p>
      </div>
    );
  }

  const entity = ENTITIES[entityId];
  const edges = graph.edges.filter((e) => (e.source === entityId || e.target === entityId) && e.relationshipId);
  const relationships = [...new Set(edges.map((e) => e.relationshipId!))].map((id) => RELATIONSHIP_BY_ID.get(id)!).filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <Icon className="h-3.5 w-3.5 text-rel-ink" /> {ENTITY_KIND_META[node.kind].label} · <span className="font-mono">{entityId}</span>
        </div>
        <h3 className="type-title mt-2 text-lg text-ink">{entity?.label ?? node.label}</h3>
        {entity && <p className="mt-1 text-[13px] leading-snug text-ink-3">{entity.detail}</p>}
      </div>
      {relationships.map((rel) => (
        <div key={rel.id} className="rounded-[5px] border border-line p-3">
          <RelationshipDetail relationship={rel} onSelectVendor={onSelectVendor} />
          <button
            type="button"
            onClick={() => {
              const edge = edges.find((e) => e.relationshipId === rel.id);
              if (edge) onSelectEdge(edge);
            }}
            className="mt-3 text-xs text-accent-ink hover:underline"
          >
            Highlight this link
          </button>
        </div>
      ))}
    </div>
  );
}

export function IntelPanel({
  graph,
  nodeId,
  edge,
  onSelectNode,
  onSelectEdge,
  className,
}: {
  graph: NetworkGraph;
  nodeId: string | null;
  edge: NetworkEdge | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (edge: NetworkEdge) => void;
  className?: string;
}) {
  const relationship = edge?.relationshipId ? RELATIONSHIP_BY_ID.get(edge.relationshipId) : undefined;
  const node = nodeId ? graph.nodeById.get(nodeId) : undefined;

  return (
    <div className={cn("space-y-4", className)}>
      {relationship ? (
        <RelationshipDetail relationship={relationship} onSelectVendor={onSelectNode} />
      ) : node ? (
        node.kind === "VENDOR" ? (
          <VendorDetail vendorId={node.id} graph={graph} onSelectEdge={onSelectEdge} />
        ) : (
          <EntityDetail entityId={node.id} graph={graph} onSelectEdge={onSelectEdge} onSelectVendor={onSelectNode} />
        )
      ) : (
        <div className="py-8 text-center">
          <MousePointerClick aria-hidden className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-3 text-[13px] font-medium text-ink">Select an entity or a link</p>
          <p className="mx-auto mt-1 max-w-64 text-xs leading-relaxed text-ink-3">
            Vendors show their relationships and awards. Violet links open the evidence behind a relationship signal.
          </p>
        </div>
      )}
      <RelationshipNote />
    </div>
  );
}
