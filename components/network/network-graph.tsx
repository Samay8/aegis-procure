"use client";

import { Maximize2, Minus, Plus, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { NetworkFilterId } from "@/data/reference";
import { RELATIONSHIP_BY_ID } from "@/data/relationships";
import { edgeVisible, neighborhood, subgraph, type NetworkGraph } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { EntityKind, NetworkEdge, NetworkNode } from "@/types";

interface View {
  x: number;
  y: number;
  k: number;
}

const RELATIONSHIP_TYPES = new Set([
  "SHARED_ADDRESS",
  "SHARED_PHONE",
  "SHARED_EMAIL",
  "SHARED_DIRECTOR",
  "SHARED_REGISTRATION",
  "COMMON_OWNERSHIP",
  "PAYMENT_LINK",
]);

export const NODE_STYLE: Record<EntityKind, { fill: string; stroke: string; shape: "circle" | "square" | "diamond" | "hexagon" | "triangle" | "pentagon"; size: number }> = {
  VENDOR: { fill: "#1c232c", stroke: "#9aa3ae", shape: "circle", size: 6.5 },
  TENDER: { fill: "#15213a", stroke: "#4d8ef7", shape: "square", size: 5.5 },
  CONTRACT: { fill: "#132520", stroke: "#5bb58a", shape: "square", size: 4.5 },
  DEPARTMENT: { fill: "#1a1f25", stroke: "#7d838b", shape: "hexagon", size: 8 },
  DIRECTOR: { fill: "#231f38", stroke: "#9085e9", shape: "diamond", size: 7 },
  ADDRESS: { fill: "#231f38", stroke: "#9085e9", shape: "triangle", size: 7.5 },
  CONTACT: { fill: "#231f38", stroke: "#9085e9", shape: "circle", size: 4.8 },
  BANK_ACCOUNT: { fill: "#231f38", stroke: "#9085e9", shape: "square", size: 5 },
  OWNER: { fill: "#231f38", stroke: "#9085e9", shape: "pentagon", size: 7 },
  REGISTRATION: { fill: "#231f38", stroke: "#9085e9", shape: "diamond", size: 5.5 },
};

function polygon(cx: number, cy: number, r: number, sides: number, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / sides;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
}

export function NodeShape({
  kind,
  cx,
  cy,
  size,
  fill,
  stroke,
  strokeWidth = 1.6,
}: {
  kind: EntityKind;
  cx: number;
  cy: number;
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const style = NODE_STYLE[kind];
  const props = { fill: fill ?? style.fill, stroke: stroke ?? style.stroke, strokeWidth };
  switch (style.shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={size} {...props} />;
    case "square":
      return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} rx={2} {...props} />;
    case "diamond":
      return <path d={`M${cx},${cy - size * 1.2} L${cx + size},${cy} L${cx},${cy + size * 1.2} L${cx - size},${cy} Z`} {...props} />;
    case "hexagon":
      return <polygon points={polygon(cx, cy, size, 6, 0)} {...props} />;
    case "triangle":
      return <polygon points={polygon(cx, cy + 1, size, 3)} {...props} />;
    case "pentagon":
      return <polygon points={polygon(cx, cy, size, 5)} {...props} />;
  }
}

function edgeStyle(edge: NetworkEdge) {
  const rel = edge.relationshipId ? RELATIONSHIP_BY_ID.get(edge.relationshipId) : undefined;
  const strengthWidth = edge.strength === "HIGH" ? 2.2 : edge.strength === "MEDIUM" ? 1.6 : 1.1;
  const strengthOpacity = edge.strength === "HIGH" ? 0.95 : edge.strength === "MEDIUM" ? 0.72 : 0.48;
  if (RELATIONSHIP_TYPES.has(edge.type)) {
    return { stroke: "#9085e9", width: strengthWidth, opacity: strengthOpacity, dash: rel?.verification === "CONTEXT_EXPLAINED" ? "4 3" : undefined };
  }
  switch (edge.type) {
    case "JOINT_BIDDING":
    case "REPEATED_PARTICIPATION":
      return { stroke: "#3987e5", width: strengthWidth, opacity: strengthOpacity, dash: undefined };
    case "BID":
      return { stroke: "#46505c", width: 1, opacity: 0.8, dash: undefined };
    case "AWARD":
      return { stroke: "#b8bcc2", width: 1.4, opacity: 0.85, dash: undefined };
    case "CONTRACT":
      return { stroke: "#5bb58a", width: 1.2, opacity: 0.7, dash: undefined };
    default:
      return { stroke: "#2d343d", width: 1, opacity: 0.9, dash: undefined };
  }
}

export interface NetworkGraphProps {
  graph: NetworkGraph;
  filters: NetworkFilterId[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedEdgeId?: string | null;
  onSelectEdge?: (edge: NetworkEdge | null) => void;
  hideUnrelated?: boolean;
  depth?: 1 | 2;
  restrictTo?: Set<string>;
  focusRequest?: { id: string; nonce: number } | null;
  height?: number;
  className?: string;
}

/** The view that frames a set of nodes inside the canvas, or null before the canvas has a size. */
function fitView(list: NetworkNode[], width: number, height: number): View | null {
  if (!width || !list.length) return null;
  const xs = list.map((n) => n.x);
  const ys = list.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 70;
  const k = Math.max(0.25, Math.min(2.2, Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad * 2) / Math.max(1, maxY - minY))));
  return { k, x: width / 2 - ((minX + maxX) / 2) * k, y: height / 2 - ((minY + maxY) / 2) * k };
}

export function NetworkGraphView({
  graph: fullGraph,
  filters,
  selectedId,
  onSelect,
  selectedEdgeId,
  onSelectEdge,
  hideUnrelated = false,
  depth = 1,
  restrictTo,
  focusRequest,
  height = 620,
  className,
}: NetworkGraphProps) {
  // A restricted view gets its own layout so the cluster fills the canvas.
  const graph = useMemo(() => (restrictTo ? subgraph(fullGraph, restrictTo) : fullGraph), [fullGraph, restrictTo]);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.5 });
  const [showLabels, setShowLabels] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; k: number; mx: number; my: number; vx: number; vy: number } | null>(null);

  /* ---------------- visibility ---------------- */
  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) => edgeVisible(edge, filters) && (!restrictTo || (restrictTo.has(edge.source) && restrictTo.has(edge.target))),
      ),
    [graph, filters, restrictTo],
  );

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const all = !filters.length || filters.includes("all");
    if (all) {
      for (const node of graph.nodes) if (!restrictTo || restrictTo.has(node.id)) ids.add(node.id);
    } else {
      for (const edge of visibleEdges) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
    if (selectedId && graph.nodeById.has(selectedId)) ids.add(selectedId);
    return ids;
  }, [graph, filters, visibleEdges, restrictTo, selectedId]);

  // A relationship can span several edges (vendor → shared address ← vendor); selecting one selects the whole path.
  const selectedRelationshipId = useMemo(
    () => (selectedEdgeId ? graph.edges.find((e) => e.id === selectedEdgeId)?.relationshipId ?? null : null),
    [graph, selectedEdgeId],
  );

  const highlight = useMemo(() => {
    if (selectedEdgeId) {
      const edge = graph.edges.find((e) => e.id === selectedEdgeId);
      if (edge) {
        const ids = new Set([edge.source, edge.target]);
        if (selectedRelationshipId) {
          for (const sibling of graph.edges) {
            if (sibling.relationshipId !== selectedRelationshipId) continue;
            ids.add(sibling.source);
            ids.add(sibling.target);
          }
        }
        return ids;
      }
    }
    if (!selectedId) return null;
    return neighborhood(graph, selectedId, visibleEdges, depth);
  }, [graph, selectedId, selectedEdgeId, selectedRelationshipId, visibleEdges, depth]);

  const nodes = useMemo(
    () => graph.nodes.filter((n) => visibleNodeIds.has(n.id) && (!hideUnrelated || !highlight || highlight.has(n.id))),
    [graph, visibleNodeIds, hideUnrelated, highlight],
  );
  const nodeSet = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const edges = useMemo(() => visibleEdges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target)), [visibleEdges, nodeSet]);

  /* ---------------- sizing + fitting ---------------- */
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setWidth(Math.round(entries[0].contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitTo = useCallback(
    (list: NetworkNode[]) => {
      const next = fitView(list, width, height);
      if (next) setView(next);
    },
    [width, height],
  );

  // Frame the graph once the canvas has a width, and again whenever the visible set is re-filtered.
  // Adjusted during render rather than in an effect, so the unframed view never paints.
  const [framedFor, setFramedFor] = useState<{ filters: typeof filters; restrictTo: typeof restrictTo; hideUnrelated: boolean } | null>(null);
  if (width && (!framedFor || framedFor.filters !== filters || framedFor.restrictTo !== restrictTo || framedFor.hideUnrelated !== hideUnrelated)) {
    setFramedFor({ filters, restrictTo, hideUnrelated });
    const next = fitView(nodes, width, height);
    if (next) setView(next);
  }

  // Center on a node when a caller requests focus; every request carries a fresh nonce.
  const [focusedFor, setFocusedFor] = useState<typeof focusRequest>(null);
  if (width && focusRequest && focusRequest !== focusedFor) {
    setFocusedFor(focusRequest);
    const node = graph.nodeById.get(focusRequest.id);
    if (node) {
      setView((current) => {
        const k = Math.max(current.k, 1.1);
        return { k, x: width * 0.45 - node.x * k, y: height / 2 - node.y * k };
      });
    }
  }

  /* ---------------- zoom + pan ---------------- */
  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((current) => {
      const k = Math.max(0.2, Math.min(4, current.k * factor));
      const ratio = k / current.k;
      return { k, x: sx - (sx - current.x) * ratio, y: sy - (sy - current.y) * ratio };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, width]);

  const localPoint = (event: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = localPoint(event);
    svgRef.current?.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      pan.current = { x: point.x, y: point.y, vx: view.x, vy: view.y, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        k: view.k,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        vx: view.x,
        vy: view.y,
      };
      pan.current = null;
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const start = pinch.current;
      const k = Math.max(0.2, Math.min(4, start.k * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, start.dist))));
      const ratio = k / start.k;
      setView({ k, x: start.mx - (start.mx - start.vx) * ratio, y: start.my - (start.my - start.vy) * ratio });
    } else if (pan.current) {
      const dx = point.x - pan.current.x;
      const dy = point.y - pan.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.current.moved = true;
      if (pan.current.moved) setView((current) => ({ ...current, x: pan.current!.vx + dx, y: pan.current!.vy + dy }));
    }
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const wasPan = pan.current;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      pan.current = null;
      if (wasPan && !wasPan.moved) {
        onSelect(null);
        onSelectEdge?.(null);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 60;
    if (event.target !== event.currentTarget && !["+", "=", "-", "0"].includes(event.key)) return;
    if (event.key === "+" || event.key === "=") zoomAt(1.25, width / 2, height / 2);
    else if (event.key === "-") zoomAt(0.8, width / 2, height / 2);
    else if (event.key === "0") fitTo(nodes);
    else if (event.key === "ArrowLeft") setView((v) => ({ ...v, x: v.x + step }));
    else if (event.key === "ArrowRight") setView((v) => ({ ...v, x: v.x - step }));
    else if (event.key === "ArrowUp") setView((v) => ({ ...v, y: v.y + step }));
    else if (event.key === "ArrowDown") setView((v) => ({ ...v, y: v.y - step }));
    else if (event.key === "Escape") {
      onSelect(null);
      onSelectEdge?.(null);
    } else return;
    event.preventDefault();
  };

  /* ---------------- render ---------------- */
  const sx = (x: number) => x * view.k + view.x;
  const sy = (y: number) => y * view.k + view.y;
  // Small clusters are read entity by entity: larger marks, and labels without zooming in.
  const compact = nodes.length <= 32;
  const growth = Math.max(compact ? 1 : 0.8, Math.min(1.6, Math.pow(view.k, 0.35)));
  const nodeById = graph.nodeById;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full min-w-0 overflow-hidden rounded-md border border-line bg-[#101418] bg-grid-fine focus-visible:outline-2 focus-visible:outline-accent", className)}
      style={{ height }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="Relationship network. Drag to pan, scroll or pinch to zoom, plus and minus keys to zoom, arrow keys to pan, zero to fit."
    >
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="absolute inset-0 block cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <g>
            {edges.map((edge) => {
              const a = nodeById.get(edge.source)!;
              const b = nodeById.get(edge.target)!;
              const style = edgeStyle(edge);
              const active = highlight ? highlight.has(edge.source) && highlight.has(edge.target) : true;
              const selected = edge.id === selectedEdgeId || (selectedRelationshipId !== null && edge.relationshipId === selectedRelationshipId);
              const clickable = Boolean(edge.relationshipId);
              return (
                <g key={edge.id}>
                  <line
                    x1={sx(a.x)}
                    y1={sy(a.y)}
                    x2={sx(b.x)}
                    y2={sy(b.y)}
                    stroke={selected ? "#ece7df" : style.stroke}
                    strokeWidth={selected ? style.width + 1.2 : style.width}
                    strokeOpacity={active ? style.opacity : 0.07}
                    strokeDasharray={style.dash}
                    strokeLinecap="round"
                  />
                  {clickable && (
                    <line
                      x1={sx(a.x)}
                      y1={sy(a.y)}
                      x2={sx(b.x)}
                      y2={sy(b.y)}
                      stroke="transparent"
                      strokeWidth={12}
                      className="cursor-pointer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onSelectEdge?.(edge)}
                    >
                      <title>{edge.label}</title>
                    </line>
                  )}
                </g>
              );
            })}
          </g>

          <g>
            {nodes.map((node) => {
              const style = NODE_STYLE[node.kind];
              const size = (style.size + (node.kind === "VENDOR" ? Math.min(5, node.degree * 0.4) : 0)) * growth;
              const active = highlight ? highlight.has(node.id) : true;
              const selected = node.id === selectedId;
              const hovered = node.id === hoverId;
              const flaggedStroke = node.flagged ? (node.kind === "TENDER" || node.kind === "CONTRACT" ? "#e4a23e" : node.kind === "VENDOR" ? "#e5564c" : undefined) : undefined;
              const labelVisible =
                selected ||
                hovered ||
                (showLabels &&
                  ((highlight && highlight.has(node.id) && (node.kind === "VENDOR" || node.kind === "ADDRESS" || node.kind === "DIRECTOR" || node.kind === "TENDER")) ||
                    (!highlight && node.kind === "VENDOR" && (node.flagged || node.degree >= 6)) ||
                    (!highlight && (view.k >= 1.35 || compact) && node.kind !== "CONTRACT")));
              const x = sx(node.x);
              const y = sy(node.y);
              if (x < -80 || y < -40 || x > width + 80 || y > height + 40) return null;
              const focusable = node.kind === "VENDOR" || node.kind === "TENDER" || node.kind === "ADDRESS" || node.kind === "DIRECTOR";
              return (
                <g
                  key={node.id}
                  opacity={active ? 1 : 0.14}
                  className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[#4d8ef7]"
                  role="button"
                  tabIndex={focusable ? 0 : -1}
                  aria-label={`${node.label}${node.flagged ? ", has signals" : ""}`}
                  aria-pressed={selected}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    onSelectEdge?.(null);
                    onSelect(selected ? null : node.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEdge?.(null);
                      onSelect(selected ? null : node.id);
                    }
                  }}
                  onMouseEnter={() => setHoverId(node.id)}
                  onMouseLeave={() => setHoverId((h) => (h === node.id ? null : h))}
                >
                  <circle cx={x} cy={y} r={size + 7} fill="transparent" stroke={selected ? "#ece7df" : "transparent"} strokeWidth={1.2} strokeDasharray={selected ? "2 3" : undefined} />
                  <NodeShape kind={node.kind} cx={x} cy={y} size={size} stroke={flaggedStroke} strokeWidth={selected || hovered ? 2.4 : 1.6} />
                  {node.flagged && node.kind === "VENDOR" && <circle cx={x + size * 0.75} cy={y - size * 0.75} r={2.6} fill="#e5564c" stroke="#101418" strokeWidth={1.2} />}
                  {labelVisible && (
                    <text
                      x={x + size + 5}
                      y={y + 4}
                      fontSize={selected ? 12.5 : 11.5}
                      fontWeight={selected ? 600 : 500}
                      fill={selected ? "#ece7df" : node.kind === "VENDOR" ? "#c9cbcf" : "#9aa0a8"}
                      stroke="#101418"
                      strokeWidth={3.5}
                      paintOrder="stroke"
                      className="pointer-events-none"
                    >
                      {node.kind === "TENDER" ? node.label.replace("Road Maintenance — ", "Road Mtce ") : node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-[5px] border border-line-strong bg-panel/95 backdrop-blur">
        <button type="button" onClick={() => zoomAt(1.25, width / 2, height / 2)} className="flex h-8 w-8 items-center justify-center text-ink-2 hover:bg-panel-3 hover:text-ink" aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => zoomAt(0.8, width / 2, height / 2)} className="flex h-8 w-8 items-center justify-center border-t border-line text-ink-2 hover:bg-panel-3 hover:text-ink" aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => fitTo(nodes)} className="flex h-8 w-8 items-center justify-center border-t border-line text-ink-2 hover:bg-panel-3 hover:text-ink" aria-label="Fit network to view">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowLabels((v) => !v)}
          aria-pressed={showLabels}
          className={cn("flex h-8 w-8 items-center justify-center border-t border-line hover:bg-panel-3", showLabels ? "text-accent-ink" : "text-ink-3")}
          aria-label={showLabels ? "Hide labels" : "Show labels"}
        >
          <Tags className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-[4px] bg-[#101418]/80 px-2 py-1 text-[11px] tabular text-ink-3">
        {nodes.length} entities · {edges.length} links · {Math.round(view.k * 100)}%
      </div>
    </div>
  );
}

export function NetworkLegend({ className }: { className?: string }) {
  const kinds: { kind: EntityKind; label: string }[] = [
    { kind: "VENDOR", label: "Vendor" },
    { kind: "TENDER", label: "Tender" },
    { kind: "CONTRACT", label: "Contract" },
    { kind: "DEPARTMENT", label: "Department" },
    { kind: "DIRECTOR", label: "Director" },
    { kind: "ADDRESS", label: "Address" },
    { kind: "CONTACT", label: "Contact" },
    { kind: "BANK_ACCOUNT", label: "Bank account" },
    { kind: "OWNER", label: "Owner" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-3", className)}>
      {kinds.map(({ kind, label }) => (
        <span key={kind} className="flex items-center gap-1.5">
          <svg width={16} height={16} aria-hidden>
            <NodeShape kind={kind} cx={8} cy={8} size={Math.min(5.5, NODE_STYLE[kind].size * 0.75)} />
          </svg>
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-[2px] w-4 rounded bg-rel" /> Relationship
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[2px] w-4 rounded bg-series-1" /> Joint bidding
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-risk" /> Has signals
      </span>
    </div>
  );
}
