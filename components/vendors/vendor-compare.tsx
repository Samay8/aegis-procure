"use client";

import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { useMemo } from "react";
import { VENDOR_ROWS, vendorProfile } from "@/data/analytics";
import { CATEGORY_BY_ID, DEPARTMENT_BY_ID, REGION_BY_ID, RELATIONSHIP_TYPE_META } from "@/data/reference";
import { relationshipBetween, sharedTenders } from "@/data/relationships";
import { signalsForVendor } from "@/data/signals";
import { VENDOR_BY_ID } from "@/data/vendors";
import { formatDate, formatINR } from "@/lib/format";
import { useAegis } from "@/store/aegis";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/fields";
import { RelationshipNote } from "@/components/ui/notices";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { SimpleLines } from "@/components/charts/series-charts";
import { CHART } from "@/components/charts/theme";
import { STRENGTH_TONE } from "@/components/network/intel-panel";

function MirrorRow({ label, a, b, format }: { label: string; a: number; b: number; format: (v: number) => string }) {
  const max = Math.max(a, b, 0.0001);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-3 border-b border-line py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
      <div className="flex items-center justify-end gap-2">
        <span className="text-[13px] font-semibold tabular text-ink">{format(a)}</span>
        <div className="hidden h-2 w-full max-w-[220px] justify-end overflow-hidden rounded-[2px] bg-panel-3 sm:flex">
          <div className="h-full rounded-l-[4px]" style={{ width: `${(a / max) * 100}%`, background: CHART.series[0] }} />
        </div>
      </div>
      <div className="text-center text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="flex items-center gap-2">
        <div className="hidden h-2 w-full max-w-[220px] overflow-hidden rounded-[2px] bg-panel-3 sm:flex">
          <div className="h-full rounded-r-[4px]" style={{ width: `${(b / max) * 100}%`, background: CHART.series[1] }} />
        </div>
        <span className="text-[13px] font-semibold tabular text-ink">{format(b)}</span>
      </div>
    </div>
  );
}

export function VendorCompare({ initialA, initialB }: { initialA?: string; initialB?: string }) {
  const compare = useAegis((s) => s.compare);
  const setCompare = useAegis((s) => s.setCompare);
  const a = initialA && VENDOR_BY_ID[initialA] ? initialA : compare.a;
  const b = initialB && VENDOR_BY_ID[initialB] ? initialB : compare.b;

  const options = useMemo(() => VENDOR_ROWS.filter((r) => r.bids > 0).sort((x, y) => x.vendor.name.localeCompare(y.vendor.name)), []);
  const pa = vendorProfile(a);
  const pb = vendorProfile(b);
  const shared = sharedTenders(a, b);
  const links = relationshipBetween(a, b);

  const quarterly = pa.quarterly.map((q, i) => ({ quarter: q.quarter, a: q.awards, b: pb.quarterly[i]?.awards ?? 0 }));

  const setList = (label: string, left: string[], right: string[]) => (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-3 border-b border-line py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
      <div className="flex flex-wrap justify-end gap-1">
        {left.map((item) => (
          <Badge key={item} tone={right.includes(item) ? "accent" : "neutral"} className="normal-case tracking-normal">
            {item}
          </Badge>
        ))}
      </div>
      <div className="text-center text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="flex flex-wrap gap-1">
        {right.map((item) => (
          <Badge key={item} tone={left.includes(item) ? "accent" : "neutral"} className="normal-case tracking-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <GitCompareArrows className="h-3.5 w-3.5" /> Vendor comparison
          </>
        }
        title="Compare vendors"
        description="Side-by-side participation, awards and footprint, with any joint participation and relationships between the two."
      />

      <Panel>
        <PanelBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Vendor A">
            <Select value={a} onChange={(e) => setCompare({ a: e.target.value })}>
              {options.map((row) => (
                <option key={row.vendor.id} value={row.vendor.id}>
                  {row.vendor.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vendor B">
            <Select value={b} onChange={(e) => setCompare({ b: e.target.value })}>
              {options.map((row) => (
                <option key={row.vendor.id} value={row.vendor.id}>
                  {row.vendor.name}
                </option>
              ))}
            </Select>
          </Field>
        </PanelBody>
      </Panel>

      <Panel>
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-3 border-b border-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
          <Link href={`/vendors/${a}`} className="text-right">
            <span className="flex items-center justify-end gap-2">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHART.series[0] }} />
              <span className="type-title min-w-0 break-words text-base text-ink hover:underline sm:text-lg">{VENDOR_BY_ID[a]?.name}</span>
            </span>
            <span className="text-xs text-ink-3">{signalsForVendor(a).length} signals</span>
          </Link>
          <span className="self-center text-center text-xs text-ink-3">vs</span>
          <Link href={`/vendors/${b}`}>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHART.series[1] }} />
              <span className="type-title min-w-0 break-words text-base text-ink hover:underline sm:text-lg">{VENDOR_BY_ID[b]?.name}</span>
            </span>
            <span className="text-xs text-ink-3">{signalsForVendor(b).length} signals</span>
          </Link>
        </div>
        <PanelBody className="py-1">
          <MirrorRow label="Award count" a={pa.wins} b={pb.wins} format={(v) => String(v)} />
          <MirrorRow label="Procurements" a={pa.participations} b={pb.participations} format={(v) => String(v)} />
          <MirrorRow label="Win rate" a={pa.winRate} b={pb.winRate} format={(v) => `${Math.round(v)}%`} />
          <MirrorRow label="Average bid" a={pa.averageBid} b={pb.averageBid} format={formatINR} />
          <MirrorRow label="Average contract" a={pa.averageContract} b={pb.averageContract} format={formatINR} />
          <MirrorRow label="Total contracts" a={pa.contractValue} b={pb.contractValue} format={formatINR} />
          {setList("Departments", pa.departments.map((d) => DEPARTMENT_BY_ID[d].short), pb.departments.map((d) => DEPARTMENT_BY_ID[d].short))}
          {setList("Categories", pa.categories.map((c) => CATEGORY_BY_ID[c].short), pb.categories.map((c) => CATEGORY_BY_ID[c].short))}
          {setList("Regions", pa.regions.map((r) => REGION_BY_ID[r].short), pb.regions.map((r) => REGION_BY_ID[r].short))}
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Awards per quarter" />
          <PanelBody>
            <SimpleLines
              data={quarterly}
              xKey="quarter"
              series={[
                { key: "a", name: VENDOR_BY_ID[a]?.name ?? "Vendor A", color: CHART.series[0] },
                { key: "b", name: VENDOR_BY_ID[b]?.name ?? "Vendor B", color: CHART.series[1] },
              ]}
              height={240}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Joint participation & relationships" description={`${shared.length} tenders where both vendors bid.`} />
          <PanelBody className="space-y-4">
            {links.length ? (
              <ul className="space-y-2">
                {links.map((rel) => (
                  <li key={rel.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-line px-3 py-2">
                    <Link href={`/relationships?relationship=${rel.id}`} className="text-[13px] text-ink hover:underline">
                      {RELATIONSHIP_TYPE_META[rel.type].label}
                      <span className="block text-[11px] text-ink-3">
                        {rel.evidenceCount} records · {formatDate(rel.firstObserved)} – {formatDate(rel.lastObserved)}
                      </span>
                    </Link>
                    <Badge tone={STRENGTH_TONE[rel.strength]}>{rel.strength.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No relationship records connect these two vendors.</p>
            )}
            {shared.length > 0 && (
              <ul className="max-h-56 space-y-1 overflow-auto">
                {shared.map((id) => (
                  <li key={id}>
                    <Link href={`/procurement/${id}`} className="flex justify-between gap-3 rounded px-1 py-1 text-xs hover:bg-panel-2">
                      <span className="font-mono text-ink-3">{id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <RelationshipNote />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
