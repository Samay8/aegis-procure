import { ACTIVE_CASES } from "@/data/cases";
import { BIDS_BY_TENDER, CONTRACT_BY_TENDER, TENDER_BY_ID } from "@/data/procurement";
import { DEPARTMENT_BY_ID, RELATIONSHIP_TYPE_META, type NetworkFilterId } from "@/data/reference";
import { ENTITIES, RELATIONSHIPS } from "@/data/relationships";
import { SIGNALS } from "@/data/signals";
import { CLUSTER_TENDER_SET } from "@/data/signals";
import { VENDOR_BY_ID } from "@/data/vendors";
import { createRng } from "@/lib/random";
import type { NetworkEdge, NetworkEdgeType, NetworkNode } from "@/types";

export const NETWORK_WIDTH = 1600;
export const NETWORK_HEIGHT = 1120;

export const EDGE_FILTER: Record<NetworkEdgeType, NetworkFilterId> = {
  SHARED_ADDRESS: "address",
  SHARED_PHONE: "contact",
  SHARED_EMAIL: "contact",
  SHARED_DIRECTOR: "management",
  SHARED_REGISTRATION: "ownership",
  COMMON_OWNERSHIP: "ownership",
  JOINT_BIDDING: "bidding",
  REPEATED_PARTICIPATION: "bidding",
  PAYMENT_LINK: "payments",
  BID: "bidding",
  AWARD: "awards",
  CONTRACT: "contracts",
  ISSUED_BY: "all",
};

export const EDGE_LABEL: Record<NetworkEdgeType, string> = {
  ...Object.fromEntries(Object.entries(RELATIONSHIP_TYPE_META).map(([k, v]) => [k, v.label])),
  BID: "Submitted bid",
  AWARD: "Awarded to",
  CONTRACT: "Contract",
  ISSUED_BY: "Issued by",
} as Record<NetworkEdgeType, string>;

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  nodeById: Map<string, NetworkNode>;
  adjacency: Map<string, Set<string>>;
}

let cached: NetworkGraph | null = null;

export function getNetwork(): NetworkGraph {
  if (cached) return cached;

  const flaggedVendors = new Set(SIGNALS.flatMap((s) => s.vendorIds));
  const flaggedTenders = new Set(SIGNALS.flatMap((s) => s.tenderIds));
  const nodes = new Map<string, Omit<NetworkNode, "x" | "y" | "degree">>();
  const edges: NetworkEdge[] = [];
  const edgeKeys = new Set<string>();

  const addVendor = (id: string) => {
    if (nodes.has(id)) return;
    const vendor = VENDOR_BY_ID[id];
    nodes.set(id, { id, kind: "VENDOR", label: vendor?.name ?? id, sublabel: id, flagged: flaggedVendors.has(id) });
  };

  const addEdge = (edge: Omit<NetworkEdge, "id">) => {
    const key = `${edge.source}|${edge.target}|${edge.type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: `E-${edges.length + 1}`, ...edge });
  };

  // Relationship intelligence
  for (const rel of RELATIONSHIPS) {
    const [a, b] = rel.vendorIds;
    if ((rel.type === "JOINT_BIDDING" || rel.type === "REPEATED_PARTICIPATION") && rel.evidenceCount < 5) continue;
    addVendor(a);
    addVendor(b);
    if (rel.via) {
      const entity = ENTITIES[rel.via.id];
      if (!nodes.has(rel.via.id)) {
        nodes.set(rel.via.id, {
          id: rel.via.id,
          kind: entity.kind,
          label: entity.label,
          sublabel: rel.via.id,
          flagged: rel.verification === "REQUIRES_VERIFICATION" && rel.strength !== "LOW",
        });
      }
      for (const vendorId of rel.vendorIds) {
        addEdge({
          source: vendorId,
          target: rel.via.id,
          type: rel.type,
          strength: rel.strength,
          relationshipId: rel.id,
          label: RELATIONSHIP_TYPE_META[rel.type].label,
        });
      }
    } else {
      addEdge({
        source: a,
        target: b,
        type: rel.type,
        strength: rel.strength,
        relationshipId: rel.id,
        label: `${RELATIONSHIP_TYPE_META[rel.type].label} · ${rel.evidenceCount} tenders`,
      });
    }
  }

  // Procurement context: tenders behind open cases and the coastal program
  const tenderIds = new Set<string>([
    ...ACTIVE_CASES.map((c) => c.tenderId),
    ...CLUSTER_TENDER_SET.map((t) => t.id),
  ]);

  for (const tenderId of tenderIds) {
    const tender = TENDER_BY_ID.get(tenderId);
    if (!tender) continue;
    nodes.set(tender.id, {
      id: tender.id,
      kind: "TENDER",
      label: tender.title,
      sublabel: tender.id,
      flagged: flaggedTenders.has(tender.id),
    });
    const deptId = `DEPT-${tender.departmentId}`;
    if (!nodes.has(deptId)) {
      nodes.set(deptId, { id: deptId, kind: "DEPARTMENT", label: DEPARTMENT_BY_ID[tender.departmentId].short, sublabel: DEPARTMENT_BY_ID[tender.departmentId].code });
    }
    addEdge({ source: tender.id, target: deptId, type: "ISSUED_BY", label: "Issued by" });

    for (const bid of BIDS_BY_TENDER.get(tender.id) ?? []) {
      addVendor(bid.vendorId);
      addEdge({ source: bid.vendorId, target: tender.id, type: "BID", label: "Submitted bid" });
    }
    if (tender.winnerVendorId) {
      addEdge({ source: tender.id, target: tender.winnerVendorId, type: "AWARD", label: "Awarded to" });
    }
    const contract = CONTRACT_BY_TENDER.get(tender.id);
    if (contract && ACTIVE_CASES.some((c) => c.tenderId === tender.id)) {
      nodes.set(contract.id, { id: contract.id, kind: "CONTRACT", label: contract.id, sublabel: contract.title, flagged: flaggedTenders.has(tender.id) });
      addEdge({ source: contract.id, target: tender.id, type: "CONTRACT", label: "Contract from tender" });
      addEdge({ source: contract.id, target: contract.vendorId, type: "CONTRACT", label: "Executed by" });
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const id of nodes.keys()) adjacency.set(id, new Set());
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const positioned = layout([...nodes.values()], edges, adjacency);
  const nodeById = new Map(positioned.map((n) => [n.id, n]));
  cached = { nodes: positioned, edges, nodeById, adjacency };
  return cached;
}

const subgraphCache = new Map<string, NetworkGraph>();

/**
 * A self-contained graph of just `ids`, laid out on its own. A cluster that is a
 * small knot inside the full network fills its canvas instead of shrinking to a dot.
 */
export function subgraph(graph: NetworkGraph, ids: Set<string>): NetworkGraph {
  const key = [...ids].sort().join("|");
  const hit = subgraphCache.get(key);
  if (hit) return hit;
  const nodes = graph.nodes.filter((node) => ids.has(node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of edges) {
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  const positioned = layout(nodes, edges, adjacency);
  const result: NetworkGraph = { nodes: positioned, edges, nodeById: new Map(positioned.map((n) => [n.id, n])), adjacency };
  subgraphCache.set(key, result);
  return result;
}

/** Deterministic Fruchterman–Reingold layout, computed once per graph. */
function layout(
  raw: Omit<NetworkNode, "x" | "y" | "degree">[],
  edges: NetworkEdge[],
  adjacency: Map<string, Set<string>>,
): NetworkNode[] {
  const rng = createRng(1042);
  const W = NETWORK_WIDTH;
  const H = NETWORK_HEIGHT;

  // Seed each connected component around its own center so clusters stay legible.
  const component = new Map<string, number>();
  let componentCount = 0;
  for (const node of raw) {
    if (component.has(node.id)) continue;
    const stack = [node.id];
    component.set(node.id, componentCount);
    while (stack.length) {
      const current = stack.pop()!;
      for (const next of adjacency.get(current) ?? []) {
        if (!component.has(next)) {
          component.set(next, componentCount);
          stack.push(next);
        }
      }
    }
    componentCount += 1;
  }
  const sizes = new Map<number, number>();
  for (const c of component.values()) sizes.set(c, (sizes.get(c) ?? 0) + 1);
  const order = [...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const centers = new Map<number, { x: number; y: number }>();
  order.forEach((c, i) => {
    if (i === 0) {
      centers.set(c, { x: W * 0.42, y: H * 0.5 });
    } else {
      const angle = i * 2.399963;
      const radius = 330 + i * 26;
      centers.set(c, { x: W / 2 + Math.cos(angle) * radius * 1.25, y: H / 2 + Math.sin(angle) * radius * 0.82 });
    }
  });

  const pos = raw.map((node) => {
    const center = centers.get(component.get(node.id)!)!;
    return { x: center.x + rng.float(-90, 90), y: center.y + rng.float(-90, 90), dx: 0, dy: 0 };
  });
  const idIndex = new Map(raw.map((n, i) => [n.id, i]));
  const k = Math.sqrt((W * H) / raw.length) * 0.46;
  let temperature = W / 9;
  const iterations = 420;

  for (let iter = 0; iter < iterations; iter++) {
    for (const p of pos) {
      p.dx = 0;
      p.dy = 0;
    }
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) {
          dx = rng.float(-1, 1);
          dy = rng.float(-1, 1);
          dist = 1;
        }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        pos[i].dx += fx;
        pos[i].dy += fy;
        pos[j].dx -= fx;
        pos[j].dy -= fy;
      }
    }
    for (const edge of edges) {
      const a = pos[idIndex.get(edge.source)!];
      const b = pos[idIndex.get(edge.target)!];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
      const weight = edge.type === "ISSUED_BY" ? 0.35 : edge.type === "BID" ? 0.8 : 1.15;
      const force = ((dist * dist) / k) * weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.dx -= fx;
      a.dy -= fy;
      b.dx += fx;
      b.dy += fy;
    }
    for (const p of pos) {
      // gentle gravity keeps satellites on the canvas
      p.dx += (W / 2 - p.x) * 0.012 * k * 0.02;
      p.dy += (H / 2 - p.y) * 0.018 * k * 0.02;
      const disp = Math.sqrt(p.dx * p.dx + p.dy * p.dy) || 1;
      p.x += (p.dx / disp) * Math.min(disp, temperature);
      p.y += (p.dy / disp) * Math.min(disp, temperature);
    }
    temperature = Math.max(1.2, temperature * 0.985);
  }

  // Normalise into the canvas with padding.
  const pad = 90;
  const minX = Math.min(...pos.map((p) => p.x));
  const maxX = Math.max(...pos.map((p) => p.x));
  const minY = Math.min(...pos.map((p) => p.y));
  const maxY = Math.max(...pos.map((p) => p.y));
  const sx = (W - pad * 2) / Math.max(1, maxX - minX);
  const sy = (H - pad * 2) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy);
  const offsetX = (W - (maxX - minX) * s) / 2;
  const offsetY = (H - (maxY - minY) * s) / 2;

  return raw.map((node, i) => ({
    ...node,
    x: Math.round((pos[i].x - minX) * s + offsetX),
    y: Math.round((pos[i].y - minY) * s + offsetY),
    degree: adjacency.get(node.id)?.size ?? 0,
  }));
}

export function edgeVisible(edge: NetworkEdge, filters: NetworkFilterId[]) {
  if (!filters.length || filters.includes("all")) return true;
  return filters.includes(EDGE_FILTER[edge.type]);
}

/** Nodes within `depth` hops of a node, following only the visible edges. */
export function neighborhood(graph: NetworkGraph, nodeId: string, visibleEdges: NetworkEdge[], depth = 1) {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of visibleEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  const seen = new Set([nodeId]);
  let frontier = [nodeId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adjacency.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return seen;
}
