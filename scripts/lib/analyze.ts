/**
 * Metrics, communities and the global layout, computed once at build time so every visitor
 * sees the same, stable picture.
 *
 * The analysis graph is the fact graph without project membership: every work, release and
 * character is linked to its project, so project hubs would otherwise dominate PageRank and
 * betweenness and every community would just be a project. Derived edges are excluded too.
 */

import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import forceAtlas2 from "graphology-layout-forceatlas2";
import betweenness from "graphology-metrics/centrality/betweenness";
import pagerank from "graphology-metrics/centrality/pagerank";

import { isDerived, type Community, type GEdge, type Metrics } from "../../shared/graph";
import type { NodeDraft } from "./build-graph";

export interface Analysis {
  metrics: Map<string, Metrics>;
  positions: Map<string, { x: number; y: number }>;
  communities: Community[];
}

/** Small deterministic PRNG (mulberry32), so Louvain and the layout are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Undirected simple graph; parallel facts between the same pair add their weights. */
function simpleGraph(keys: string[], edges: GEdge[], keep: (e: GEdge) => boolean, weight: (e: GEdge) => number): Graph {
  const g = new Graph({ type: "undirected", multi: false, allowSelfLoops: false });
  for (const k of keys) g.addNode(k);
  for (const e of edges) {
    if (!keep(e) || e.s === e.t) continue;
    const w = weight(e);
    if (g.hasEdge(e.s, e.t)) g.updateEdgeAttribute(e.s, e.t, "weight", (x: number) => x + w);
    else g.addEdge(e.s, e.t, { weight: w });
  }
  return g;
}

export function analyze(nodes: Map<string, NodeDraft>, edges: GEdge[], { iterations = 3000 } = {}): Analysis {
  const keys = [...nodes.keys()].sort();
  const facts = (e: GEdge) => !isDerived(e.r) && e.r !== "project";
  const g = simpleGraph(keys, edges, facts, (e) => e.w);

  const pr = pagerank(g, { getEdgeWeight: "weight", alpha: 0.85, maxIterations: 500, tolerance: 1e-10 });
  const bc = betweenness(g, { getEdgeWeight: null, normalized: true });
  const rawCommunity = louvain(g, { getEdgeWeight: "weight", resolution: 1, rng: rng(42) });

  // renumber communities: largest first, ties by their smallest key
  const groups = new Map<number, string[]>();
  for (const k of keys) groups.set(rawCommunity[k], [...(groups.get(rawCommunity[k]) ?? []), k]);
  const ordered = [...groups.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const community = new Map<string, number>();
  const communities: Community[] = ordered.map((members, id) => {
    for (const k of members) community.set(k, id);
    const top = [...members].sort((a, b) => pr[b] - pr[a] || a.localeCompare(b)).slice(0, 3);
    return { id, size: members.length, top };
  });

  const metrics = new Map<string, Metrics>();
  for (const k of keys) {
    let wdeg = 0;
    g.forEachEdge(k, (_e, attr) => { wdeg += attr.weight as number; });
    metrics.set(k, {
      deg: g.degree(k),
      wdeg,
      pr: round(pr[k], 6),
      bc: round(bc[k], 6),
      cm: community.get(k)!,
    });
  }

  return { metrics, positions: layout(nodes, keys, edges, iterations), communities };
}

/**
 * ForceAtlas2 over the fact graph with project membership included (so each project forms a
 * region), weights log-damped so one heavy edge does not collapse its endpoints. Starting
 * positions are deterministic: around the node's projects' anchors plus a hash-based jitter.
 */
function layout(nodes: Map<string, NodeDraft>, keys: string[], edges: GEdge[], iterations: number) {
  const g = simpleGraph(keys, edges, (e) => !isDerived(e.r), (e) => (e.r === "project" ? 0.5 : 1 + Math.log2(e.w)));
  const projects = keys.filter((k) => nodes.get(k)!.t === "project").map((k) => k.slice("project:".length));
  const anchor = new Map(projects.map((p, i) => {
    const a = (2 * Math.PI * i) / projects.length;
    return [p, { x: 100 * Math.cos(a), y: 100 * Math.sin(a) }];
  }));
  g.forEachNode((k) => {
    const n = nodes.get(k)!;
    const anchors = n.p.map((p) => anchor.get(p)).filter((a): a is { x: number; y: number } => !!a);
    const cx = anchors.length ? anchors.reduce((s, a) => s + a.x, 0) / anchors.length : 0;
    const cy = anchors.length ? anchors.reduce((s, a) => s + a.y, 0) / anchors.length : 0;
    const r = rng(hash(k));
    g.mergeNodeAttributes(k, { x: cx + (r() - 0.5) * 60, y: cy + (r() - 0.5) * 60 });
  });
  // weak gravity lets each project settle into its own region, with the people who work
  // across projects in between (tuned visually; scalingRatio only rescales the picture)
  const settings = {
    ...forceAtlas2.inferSettings(g),
    barnesHutOptimize: true,
    edgeWeightInfluence: 1,
    gravity: 0.05,
    scalingRatio: 6,
    linLogMode: false,
  };
  forceAtlas2.assign(g, { iterations, settings, getEdgeWeight: "weight" });
  const out = new Map<string, { x: number; y: number }>();
  g.forEachNode((k, a) => out.set(k, { x: round(a.x as number, 2), y: round(a.y as number, 2) }));
  return out;
}

function round(x: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}
