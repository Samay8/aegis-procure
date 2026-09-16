/** Chart tokens. Categorical order validated for CVD separation on the panel surface (#15191e). */
export const CHART = {
  surface: "#15191e",
  grid: "#232930",
  axis: "#343b45",
  tick: "#7d838b",
  label: "#a6a9ae",
  ink: "#ece7df",
  cursor: "#4a525e",
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  accent: "#4d8ef7",
  risk: "#e5564c",
  warn: "#e4a23e",
  ok: "#5bb58a",
  rel: "#9085e9",
  slate: "#7d8794",
} as const;

export const AXIS = {
  tick: { fill: CHART.tick, fontSize: 11 },
  axisLine: { stroke: CHART.axis },
  tickLine: false,
} as const;

/** Mix a hex color toward the panel surface: t = 0 surface, t = 1 full color. */
export function rampColor(hex: string, t: number, from = "#1d232a") {
  const clamp = Math.max(0, Math.min(1, t));
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = parse(from);
  const b = parse(hex);
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * clamp));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}
