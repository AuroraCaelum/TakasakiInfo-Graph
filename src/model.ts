import Graph from "graphology";

import {
  isDerived, NODE_TYPES,
  type Community, type DetailFile, type GEdge, type GNode, type GraphFile, type GraphMeta, type NodeType,
} from "../shared/graph";
import { pictogramUrl } from "./icons";
import { PROJECT_SLOT } from "./theme";

export interface NodeAttrs {
  x: number;
  y: number;
  size: number;
  label: string;
  image: string;
  pictoColor: string;
  color: string;
}

export interface EdgeAttrs {
  /** the data's facts between the two nodes (one per relation) */
  facts: GEdge[];
  derived: boolean;
  /** sum of the facts' weights */
  w: number;
  size: number;
  type: "line" | "curve";
}

export type MetricName = "deg" | "wdeg" | "pr" | "bc";

export interface Rank {
  overall: number;
  inType: number;
}

export interface Model {
  meta: GraphMeta;
  nodes: Map<string, GNode>;
  list: GNode[];
  graph: Graph<NodeAttrs, EdgeAttrs>;
  communities: Community[];
  /** project ids, in the fixed color order */
  projects: string[];
  /** fact adjacency without project membership: the graph the analyses walk */
  adj: Map<string, { k: string; w: number }[]>;
  ranks: Record<MetricName, Map<string, Rank>>;
  typeCounts: Record<NodeType, number>;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Node radius in screen pixels: a floor per type, growing with link strength. */
export function nodeSize(n: GNode): number {
  const s = Math.sqrt(n.m.wdeg);
  switch (n.t) {
    case "project": return 15;
    case "concert": return clamp(7 + s * 0.3, 7, 13);
    case "venue": return 4.5;
    case "artist": return clamp(4.5 + s * 0.45, 4.5, 13);
    case "character": return clamp(3.5 + s * 0.4, 3.5, 11);
    case "person": return clamp(2.2 + s * 0.5, 2.2, 13);
    case "work": return clamp(2.2 + s * 0.35, 2.2, 9);
    case "release": return clamp(2.6 + s * 0.3, 2.6, 8);
  }
}

export const edgeKey = (derived: boolean, a: string, b: string) => {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `${derived ? "d" : "f"}|${x}|${y}`;
};

export function buildModel(file: GraphFile): Model {
  const nodes = new Map(file.nodes.map((n) => [n.k, n]));
  const graph = new Graph<NodeAttrs, EdgeAttrs>({ type: "undirected", multi: true, allowSelfLoops: false });
  const images = Object.fromEntries(NODE_TYPES.map((t) => [t, pictogramUrl(t)])) as Record<NodeType, string>;
  for (const n of file.nodes) {
    graph.addNode(n.k, { x: n.x, y: n.y, size: nodeSize(n), label: "", image: images[n.t], pictoColor: "#fff", color: "#888" });
  }
  for (const e of file.edges) {
    if (!nodes.has(e.s) || !nodes.has(e.t) || e.s === e.t) continue;
    const derived = isDerived(e.r);
    const key = edgeKey(derived, e.s, e.t);
    if (graph.hasEdge(key)) {
      graph.updateEdgeAttributes(key, (a) => ({ ...a, facts: [...a.facts, e], w: a.w + e.w }));
    } else {
      graph.addUndirectedEdgeWithKey(key, e.s, e.t, { facts: [e], derived, w: e.w, size: 1, type: derived ? "curve" : "line" });
    }
  }
  graph.updateEachEdgeAttributes((_k, a) => ({ ...a, size: 0.6 + Math.log2(1 + a.w) * 0.45 }));

  const adj = new Map<string, { k: string; w: number }[]>();
  for (const n of file.nodes) adj.set(n.k, []);
  graph.forEachEdge((_key, a, s, t) => {
    if (a.derived) return;
    const w = a.facts.filter((f) => f.r !== "project").reduce((sum, f) => sum + f.w, 0);
    if (!w) return;
    adj.get(s)!.push({ k: t, w });
    adj.get(t)!.push({ k: s, w });
  });

  const typeCounts = Object.fromEntries(NODE_TYPES.map((t) => [t, 0])) as Record<NodeType, number>;
  for (const n of file.nodes) typeCounts[n.t] += 1;

  const projects = file.nodes.filter((n) => n.t === "project").map((n) => n.k.slice("project:".length))
    .sort((a, b) => (PROJECT_SLOT[a] ?? 99) - (PROJECT_SLOT[b] ?? 99) || a.localeCompare(b));

  return {
    meta: file.meta, nodes, list: file.nodes, graph, communities: file.communities, projects, adj,
    ranks: computeRanks(file.nodes), typeCounts,
  };
}

/** 1-based ranks (ties share the better rank), overall and within the node's type. */
function computeRanks(list: GNode[]): Record<MetricName, Map<string, Rank>> {
  const out = {} as Record<MetricName, Map<string, Rank>>;
  for (const metric of ["deg", "wdeg", "pr", "bc"] as const) {
    const ranks = new Map<string, Rank>();
    const rankBy = (xs: GNode[], set: (k: string, r: number) => void) => {
      const sorted = [...xs].sort((a, b) => b.m[metric] - a.m[metric]);
      let prev = Number.NaN;
      let rank = 0;
      sorted.forEach((n, i) => {
        if (n.m[metric] !== prev) { rank = i + 1; prev = n.m[metric]; }
        set(n.k, rank);
      });
    };
    rankBy(list, (k, r) => ranks.set(k, { overall: r, inType: 0 }));
    for (const t of NODE_TYPES) rankBy(list.filter((n) => n.t === t), (k, r) => { ranks.get(k)!.inType = r; });
    out[metric] = ranks;
  }
  return out;
}

const BASE = import.meta.env.BASE_URL;

export async function loadGraph(): Promise<Model> {
  const res = await fetch(`${BASE}data/graph.json`);
  if (!res.ok) throw new Error(`graph.json: HTTP ${res.status}`);
  return buildModel((await res.json()) as GraphFile);
}

const detailCache = new Map<NodeType, Promise<DetailFile>>();

export function loadDetails(t: NodeType): Promise<DetailFile> {
  let p = detailCache.get(t);
  if (!p) {
    p = fetch(`${BASE}data/detail/${t}.json`).then((r) => {
      if (!r.ok) throw new Error(`detail/${t}.json: HTTP ${r.status}`);
      return r.json() as Promise<DetailFile>;
    });
    p.catch(() => detailCache.delete(t));
    detailCache.set(t, p);
  }
  return p;
}
