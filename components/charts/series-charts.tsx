"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMonthShort } from "@/lib/format";
import { AXIS, CHART } from "./theme";
import { ChartTooltip, Legend } from "./chart-tooltip";

type Row = Record<string, string | number | boolean | null>;

interface SeriesKey {
  key: string;
  name: string;
  color: string;
}

const monthTick = (value: unknown) => formatMonthShort(String(value));
const monthLabel = (value: unknown) => formatMonth(String(value));

export function TrendArea({
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
  monthly = true,
  reference,
  yWidth = 44,
}: {
  data: Row[];
  xKey: string;
  series: SeriesKey[];
  height?: number;
  valueFormatter?: (value: number, name: string) => string;
  monthly?: boolean;
  reference?: { x: string; label: string };
  yWidth?: number;
}) {
  const [first, ...rest] = series;
  return (
    <div>
      {series.length > 1 && <Legend className="mb-3" items={series.map((s, i) => ({ label: s.name, color: s.color, kind: i === 0 ? "box" : "line" }))} />}
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={monthly ? monthTick : undefined} minTickGap={22} tickMargin={8} />
          <YAxis {...AXIS} width={yWidth} allowDecimals={false} tickFormatter={valueFormatter ? (v: number) => valueFormatter(v, "") : undefined} />
          <Tooltip
            cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
            content={(props) => <ChartTooltip {...props} labelFormatter={monthly ? monthLabel : undefined} valueFormatter={valueFormatter} />}
          />
          {reference && (
            <ReferenceLine
              x={reference.x}
              stroke={CHART.cursor}
              label={{ value: reference.label, position: "insideTopLeft", fill: CHART.tick, fontSize: 11, dx: 6, dy: -2 }}
            />
          )}
          <Area
            type="monotone"
            dataKey={first.key}
            name={first.name}
            stroke={first.color}
            strokeWidth={2}
            fill={first.color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
          />
          {rest.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBars({
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
  xFormatter,
  labelFormatter,
  stacked,
}: {
  data: Row[];
  xKey: string;
  series: SeriesKey[];
  height?: number;
  valueFormatter?: (value: number, name: string) => string;
  xFormatter?: (value: unknown) => string;
  labelFormatter?: (value: unknown) => string;
  stacked?: boolean;
}) {
  return (
    <div>
      {series.length > 1 && <Legend className="mb-3" items={series.map((s) => ({ label: s.name, color: s.color, kind: "box" }))} />}
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={xFormatter} minTickGap={12} tickMargin={8} />
          <YAxis {...AXIS} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.035)" }}
            content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} labelFormatter={labelFormatter} />}
          />
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              maxBarSize={22}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? (index === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLines({
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
  xFormatter,
  yDomain,
  monthly,
}: {
  data: Row[];
  xKey: string;
  series: SeriesKey[];
  height?: number;
  valueFormatter?: (value: number, name: string) => string;
  xFormatter?: (value: unknown) => string;
  yDomain?: [number | "auto", number | "auto"];
  monthly?: boolean;
}) {
  return (
    <div>
      {series.length > 1 && <Legend className="mb-3" items={series.map((s) => ({ label: s.name, color: s.color }))} />}
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={monthly ? monthTick : xFormatter} minTickGap={16} tickMargin={8} />
          <YAxis {...AXIS} width={44} domain={yDomain} tickFormatter={valueFormatter ? (v: number) => valueFormatter(v, "") : undefined} />
          <Tooltip
            cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
            content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} labelFormatter={monthly ? monthLabel : undefined} />}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              connectNulls
              dot={{ r: 3, strokeWidth: 2, stroke: CHART.surface, fill: s.color }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: CHART.surface }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SingleArea({
  data,
  xKey,
  dataKey,
  name,
  color = CHART.series[0],
  height = 180,
  valueFormatter,
  monthly = true,
  xFormatter,
}: {
  data: Row[];
  xKey: string;
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
  valueFormatter?: (value: number, name: string) => string;
  monthly?: boolean;
  xFormatter?: (value: unknown) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} tickFormatter={monthly ? monthTick : xFormatter} minTickGap={20} tickMargin={8} />
        <YAxis {...AXIS} width={44} tickFormatter={valueFormatter ? (v: number) => valueFormatter(v, "") : undefined} />
        <Tooltip
          cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
          content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} labelFormatter={monthly ? monthLabel : undefined} />}
        />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
