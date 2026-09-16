"use client";

import { useMemo, useState } from "react";
import { REGIONS, REGION_BY_ID } from "@/data/reference";
import type { ZoneStat } from "@/data/analytics";
import { formatINR } from "@/lib/format";
import type { RegionId } from "@/types";
import { Segmented } from "@/components/ui/tabs";
import { CHART, rampColor } from "./theme";

/** Approximate geographic placement of each procurement zone (column, row). */
const TILE_POSITION: Record<string, [number, number]> = {
  "kittur-1": [1, 0],
  "kittur-3": [2, 0],
  "kalyana-1": [3, 0],
  "kalyana-4": [4, 0],
  "kittur-2": [1, 1],
  "kittur-4": [2, 1],
  "kalyana-3": [3, 1],
  "coastal-3": [0, 2],
  "kalyana-2": [3, 2],
  "coastal-6": [0, 3],
  "malnad-1": [1, 3],
  "bengaluru-4": [3, 3],
  "coastal-5": [0, 4],
  "malnad-2": [1, 4],
  "malnad-3": [2, 4],
  "bengaluru-2": [4, 4],
  "coastal-2": [0, 5],
  "malnad-4": [2, 5],
  "bengaluru-3": [3, 5],
  "bengaluru-1": [4, 5],
  "coastal-1": [0, 6],
  "coastal-4": [1, 6],
  "mysuru-1": [2, 6],
  "mysuru-2": [3, 6],
  "mysuru-4": [2, 7],
  "mysuru-3": [3, 7],
};

type Metric = "tenders" | "value" | "signalDensity";

const METRIC_META: Record<Metric, { label: string; color: string; format: (z: ZoneStat) => string }> = {
  tenders: { label: "Procurement volume", color: CHART.series[0], format: (z) => `${z.tenders} tenders` },
  value: { label: "Contract value", color: CHART.series[0], format: (z) => formatINR(z.value) },
  signalDensity: { label: "Signal density", color: CHART.risk, format: (z) => `${z.signals} signals · ${z.signalDensity.toFixed(1)} per 100 awards` },
};

export function ZoneTileMap({ zones, onSelectRegion, selectedRegion }: { zones: ZoneStat[]; onSelectRegion?: (id: RegionId | null) => void; selectedRegion?: RegionId | null }) {
  const [metric, setMetric] = useState<Metric>("signalDensity");
  const [hover, setHover] = useState<ZoneStat | null>(null);
  const meta = METRIC_META[metric];
  const max = useMemo(() => Math.max(...zones.map((z) => z[metric])), [zones, metric]);
  const tile = 58;
  const gap = 5;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Map metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "signalDensity", label: "Signal density" },
            { value: "tenders", label: "Volume" },
            { value: "value", label: "Value" },
          ]}
        />
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <span>Low</span>
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${rampColor(meta.color, 0.12)}, ${rampColor(meta.color, 1)})` }} />
          <span>High</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <svg
          viewBox={`0 0 ${5 * (tile + gap)} ${8 * (tile + gap)}`}
          className="mx-auto h-auto w-full max-w-[330px] shrink-0"
          role="img"
          aria-label={`${meta.label} by procurement zone`}
        >
          {zones.map((zone) => {
            const key = `${zone.regionId}-${zone.zone}`;
            const pos = TILE_POSITION[key];
            if (!pos) return null;
            const value = zone[metric];
            const t = max ? Math.sqrt(value / max) : 0;
            const dimmed = selectedRegion && selectedRegion !== zone.regionId;
            const x = pos[0] * (tile + gap);
            const y = pos[1] * (tile + gap);
            return (
              <g
                key={key}
                onMouseEnter={() => setHover(zone)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectRegion?.(selectedRegion === zone.regionId ? null : zone.regionId)}
                className="cursor-pointer"
                opacity={dimmed ? 0.35 : 1}
              >
                <rect
                  x={x}
                  y={y}
                  width={tile}
                  height={tile}
                  rx={5}
                  fill={rampColor(meta.color, 0.1 + t * 0.9)}
                  stroke={hover === zone ? CHART.ink : "rgba(255,255,255,0.05)"}
                  strokeWidth={hover === zone ? 1.5 : 1}
                />
                <text x={x + 7} y={y + 16} fill={t > 0.55 ? "#0f1215" : CHART.label} fontSize={9.5} fontWeight={600} letterSpacing="0.04em">
                  {REGION_BY_ID[zone.regionId].short.slice(0, 3).toUpperCase()}
                </text>
                <text x={x + 7} y={y + tile - 9} fill={t > 0.55 ? "#0f1215" : CHART.ink} fontSize={14} fontWeight={700}>
                  Z{zone.zone}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="min-w-0 flex-1">
          <div className="min-h-[74px] rounded-[5px] border border-line bg-panel-2 p-3">
            {hover ? (
              <>
                <div className="text-[13px] font-medium text-ink">
                  {REGION_BY_ID[hover.regionId].name} · Zone {hover.zone}
                </div>
                <div className="mt-1 text-xs text-ink-2">{hover.tenders} tenders · {formatINR(hover.value)} awarded</div>
                <div className="mt-0.5 text-xs text-ink-3">
                  {hover.signals} open signals · {hover.signalDensity.toFixed(1)} per 100 awards
                </div>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-ink-3">Hover a zone for its figures. Click a zone to focus its region.</p>
            )}
          </div>
          <ul className="mt-3 space-y-1.5">
            {REGIONS.map((region) => {
              const regionZones = zones.filter((z) => z.regionId === region.id);
              const signals = regionZones.reduce((s, z) => s + z.signals, 0);
              const tenders = regionZones.reduce((s, z) => s + z.tenders, 0);
              const active = selectedRegion === region.id;
              return (
                <li key={region.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRegion?.(active ? null : region.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-xs transition-colors ${active ? "bg-panel-3 text-ink" : "text-ink-2 hover:bg-panel-2"}`}
                  >
                    <span>{region.name}</span>
                    <span className="tabular text-ink-3">
                      {tenders} tenders · {signals} signals
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-ink-3">Synthetic demo geography. Figures do not describe any real office.</p>
        </div>
      </div>
    </div>
  );
}
