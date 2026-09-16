"use client";

import Link from "next/link";
import { Bookmark, FolderPlus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { CASES } from "@/data/cases";
import { TENDER_BY_ID } from "@/data/procurement";
import { VENDOR_BY_ID } from "@/data/vendors";
import { formatDateTime, formatINR } from "@/lib/format";
import { useCaseViews } from "@/lib/hooks";
import { useAegis } from "@/store/aegis";
import type { Evidence, SavedItemKind } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PriorityBadge, StatusBadge } from "@/components/ui/priority";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/tabs";

type Tab = "CASE" | "VENDOR" | "PROCUREMENT" | "EVIDENCE" | "COLLECTIONS";

const EVIDENCE_INDEX = new Map<string, { evidence: Evidence; caseId: string }>(
  CASES.flatMap((c) => c.evidence.map((e) => [e.id, { evidence: e, caseId: c.id }] as const)),
);

export function SavedView() {
  const saved = useAegis((s) => s.saved);
  const toggleSaved = useAegis((s) => s.toggleSaved);
  const collections = useAegis((s) => s.collections);
  const createCollection = useAegis((s) => s.createCollection);
  const toggleInCollection = useAegis((s) => s.toggleInCollection);
  const deleteCollection = useAegis((s) => s.deleteCollection);
  const views = useCaseViews();
  const [tab, setTab] = useState<Tab>("CASE");
  const [name, setName] = useState("");

  const caseViews = useMemo(() => views.filter((v) => saved.CASE.includes(v.investigation.id)), [views, saved.CASE]);

  const label = (kind: SavedItemKind, id: string) => {
    if (kind === "CASE") return views.find((v) => v.investigation.id === id)?.investigation.title ?? id;
    if (kind === "VENDOR") return VENDOR_BY_ID[id]?.name ?? id;
    if (kind === "PROCUREMENT") return TENDER_BY_ID.get(id)?.title ?? id;
    return EVIDENCE_INDEX.get(id)?.evidence.title ?? id;
  };

  const href = (kind: SavedItemKind, id: string) => {
    if (kind === "CASE") return `/investigations/${id}`;
    if (kind === "VENDOR") return `/vendors/${id}`;
    if (kind === "PROCUREMENT") return `/procurement/${id}`;
    const entry = EVIDENCE_INDEX.get(id);
    return entry ? `/investigations/${entry.caseId}/evidence` : "/saved";
  };

  const allSaved: { kind: SavedItemKind; id: string }[] = (["CASE", "VENDOR", "PROCUREMENT", "EVIDENCE"] as SavedItemKind[]).flatMap((kind) => saved[kind].map((id) => ({ kind, id })));

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Bookmark className="h-3.5 w-3.5" /> Stored in this browser
          </>
        }
        title="Saved cases"
        description="Cases, vendors, procurements and evidence you have bookmarked, and the collections you build from them."
      />

      <Segmented
        label="Saved item type"
        value={tab}
        onChange={setTab}
        options={[
          { value: "CASE", label: "Cases", count: saved.CASE.length },
          { value: "VENDOR", label: "Vendors", count: saved.VENDOR.length },
          { value: "PROCUREMENT", label: "Procurements", count: saved.PROCUREMENT.length },
          { value: "EVIDENCE", label: "Evidence", count: saved.EVIDENCE.length },
          { value: "COLLECTIONS", label: "Collections", count: collections.length },
        ]}
      />

      {tab === "CASE" && (
        <Panel>
          {caseViews.length ? (
            <ul className="divide-y divide-line">
              {caseViews.map(({ investigation, state, score }) => (
                <li key={investigation.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center">
                  <Link href={`/investigations/${investigation.id}`} className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] text-ink-3">{investigation.id}</div>
                    <div className="truncate text-[14px] text-ink hover:underline">{investigation.title}</div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <PriorityBadge level={score.level} score={score.total} label={false} />
                    <StatusBadge status={state.status} />
                    <Button size="icon" variant="ghost" aria-label="Remove saved case" onClick={() => toggleSaved("CASE", investigation.id)}>
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Bookmark} title="No saved cases" description="Use Save case on any investigation to keep it here." />
          )}
        </Panel>
      )}

      {(tab === "VENDOR" || tab === "PROCUREMENT" || tab === "EVIDENCE") && (
        <Panel>
          {saved[tab].length ? (
            <ul className="divide-y divide-line">
              {saved[tab].map((id) => (
                <li key={id} className="flex items-center gap-3 px-4 py-3">
                  <RecordChip id={tab === "EVIDENCE" ? EVIDENCE_INDEX.get(id)?.evidence.recordId ?? id : id} />
                  <Link href={href(tab, id)} className="min-w-0 flex-1 truncate text-[14px] text-ink hover:underline">
                    {label(tab, id)}
                  </Link>
                  {tab === "PROCUREMENT" && TENDER_BY_ID.get(id)?.awardValue && <span className="text-xs tabular text-ink-3">{formatINR(TENDER_BY_ID.get(id)!.awardValue!)}</span>}
                  {tab === "EVIDENCE" && <Badge tone="neutral">{EVIDENCE_INDEX.get(id)?.caseId}</Badge>}
                  <Button size="icon" variant="ghost" aria-label="Remove saved item" onClick={() => toggleSaved(tab, id)}>
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Bookmark}
              title={tab === "VENDOR" ? "No bookmarked vendors" : tab === "PROCUREMENT" ? "No saved procurements" : "No saved evidence"}
              description="Bookmark records while you investigate and they collect here."
            />
          )}
        </Panel>
      )}

      {tab === "COLLECTIONS" && (
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Create investigation collection" />
            <PanelBody>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  createCollection(name);
                  setName("");
                }}
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coastal maintenance program" aria-label="Collection name" className="sm:max-w-md" />
                <Button type="submit" variant="primary" disabled={!name.trim()}>
                  <FolderPlus className="h-4 w-4" /> Create collection
                </Button>
              </form>
            </PanelBody>
          </Panel>

          {collections.length === 0 ? (
            <Panel>
              <EmptyState icon={FolderPlus} title="No collections" description="Group saved cases, vendors, procurements and evidence into a collection for a line of inquiry." />
            </Panel>
          ) : (
            collections.map((collection) => (
              <Panel key={collection.id}>
                <PanelHeader
                  title={collection.name}
                  description={`${collection.items.length} items · created ${formatDateTime(collection.createdAt)}`}
                  actions={
                    <Button size="xs" variant="ghost" onClick={() => deleteCollection(collection.id)}>
                      <Trash className="h-3.5 w-3.5" /> Delete
                    </Button>
                  }
                />
                <PanelBody className="space-y-3">
                  {collection.items.length > 0 && (
                    <ul className="space-y-1.5">
                      {collection.items.map((item) => (
                        <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-[13px]">
                          <Badge tone="neutral">{item.kind.toLowerCase()}</Badge>
                          <Link href={href(item.kind, item.id)} className="min-w-0 flex-1 truncate text-ink hover:underline">
                            {label(item.kind, item.id)}
                          </Link>
                          <button type="button" onClick={() => toggleInCollection(collection.id, item)} className="text-xs text-ink-3 hover:text-risk-ink">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {allSaved.length ? (
                    <Select
                      aria-label={`Add a saved item to ${collection.name}`}
                      value=""
                      onChange={(e) => {
                        const [kind, id] = e.target.value.split("|");
                        if (kind && id) toggleInCollection(collection.id, { kind: kind as SavedItemKind, id });
                      }}
                      wrapperClassName="sm:max-w-md"
                    >
                      <option value="">Add a saved item…</option>
                      {allSaved
                        .filter((item) => !collection.items.some((i) => i.kind === item.kind && i.id === item.id))
                        .map((item) => (
                          <option key={`${item.kind}|${item.id}`} value={`${item.kind}|${item.id}`}>
                            {item.kind.toLowerCase()} · {label(item.kind, item.id)}
                          </option>
                        ))}
                    </Select>
                  ) : (
                    <p className="text-xs text-ink-3">Save cases, vendors, procurements or evidence first, then add them here.</p>
                  )}
                </PanelBody>
              </Panel>
            ))
          )}
        </div>
      )}
    </div>
  );
}
