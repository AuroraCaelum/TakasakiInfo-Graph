/**
 * Relatedness, computed in the browser on the fact graph without project membership
 * (`model.adj`): every node of a project is two steps from every other through its hub, which
 * would drown the signal.
 */

import type { Model } from "../model";
import type { Visible } from "./visibility";

export interface Scored {
  k: string;
  score: number;
}

/** Neighbours by the summed weight of every fact between them. */
export function directStrength(model: Model, key: string): Scored[] {
  return [...(model.adj.get(key) ?? [])]
    .map(({ k, w }) => ({ k, score: w }))
    .sort((a, b) => b.score - a.score || a.k.localeCompare(b.k));
}

interface Csr {
  index: Map<string, number>;
  keys: string[];
  start: Int32Array;
  to: Int32Array;
  /** transition probability of each arc (weights normalised per source) */
  p: Float64Array;
}

const csrCache = new WeakMap<Model, Csr>();

function csr(model: Model): Csr {
  let c = csrCache.get(model);
  if (c) return c;
  const keys = [...model.adj.keys()];
  const index = new Map(keys.map((k, i) => [k, i]));
  const start = new Int32Array(keys.length + 1);
  keys.forEach((k, i) => { start[i + 1] = start[i] + model.adj.get(k)!.length; });
  const to = new Int32Array(start[keys.length]);
  const p = new Float64Array(start[keys.length]);
  keys.forEach((k, i) => {
    const list = model.adj.get(k)!;
    const total = list.reduce((s, x) => s + x.w, 0);
    list.forEach((x, j) => {
      to[start[i] + j] = index.get(x.k)!;
      p[start[i] + j] = x.w / total;
    });
  });
  c = { index, keys, start, to, p };
  csrCache.set(model, c);
  return c;
}

/**
 * Personalized PageRank (random walk with restart at `key`), by power iteration. Walkers on
 * a node without links go back to the seed.
 */
export function personalizedPageRank(model: Model, key: string, { restart = 0.15, iterations = 50 } = {}): Scored[] {
  const g = csr(model);
  const seed = g.index.get(key);
  if (seed === undefined) return [];
  const n = g.keys.length;
  let rank = new Float64Array(n);
  rank[seed] = 1;
  for (let it = 0; it < iterations; it++) {
    const next = new Float64Array(n);
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      const r = rank[i];
      if (!r) continue;
      if (g.start[i] === g.start[i + 1]) { dangling += r; continue; }
      for (let a = g.start[i]; a < g.start[i + 1]; a++) next[g.to[a]] += (1 - restart) * r * g.p[a];
    }
    next[seed] += restart + (1 - restart) * dangling;
    rank = next;
  }
  const out: Scored[] = [];
  for (let i = 0; i < n; i++) if (i !== seed && rank[i] > 1e-6) out.push({ k: g.keys[i], score: rank[i] });
  return out.sort((a, b) => b.score - a.score || a.k.localeCompare(b.k));
}

export interface Similar {
  k: string;
  jaccard: number;
  adamicAdar: number;
  shared: string[];
}

/** Same-type nodes sharing neighbours: Jaccard first, Adamic-Adar to break ties. */
export function similarNodes(model: Model, key: string, limit = 10): Similar[] {
  const type = model.nodes.get(key)?.t;
  const mine = new Set((model.adj.get(key) ?? []).map((x) => x.k));
  if (!type || !mine.size) return [];
  const acc = new Map<string, { shared: string[]; aa: number }>();
  for (const z of mine) {
    const around = model.adj.get(z) ?? [];
    const aa = around.length > 1 ? 1 / Math.log(around.length) : 0;
    for (const { k: v } of around) {
      if (v === key || model.nodes.get(v)?.t !== type) continue;
      const a = acc.get(v) ?? { shared: [], aa: 0 };
      a.shared.push(z);
      a.aa += aa;
      acc.set(v, a);
    }
  }
  return [...acc].map(([k, a]) => {
    const theirs = model.adj.get(k)?.length ?? 0;
    return { k, jaccard: a.shared.length / (mine.size + theirs - a.shared.length), adamicAdar: a.aa, shared: a.shared };
  })
    .sort((a, b) => b.jaccard - a.jaccard || b.adamicAdar - a.adamicAdar || a.k.localeCompare(b.k))
    .slice(0, limit);
}

export interface PathResult {
  nodes: string[];
  edges: string[];
}

/**
 * Fewest steps over visible links; among equally short paths, the one with stronger links
 * (each step costs 1 + 0.01/weight, which can never outweigh a whole step). Project hubs are
 * not crossed unless allowed.
 */
export function shortestPath(model: Model, visible: Visible, from: string, to: string, allowHubs: boolean): PathResult | null {
  if (!visible.nodes.has(from) || !visible.nodes.has(to)) return null;
  if (from === to) return { nodes: [from], edges: [] };
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, { node: string; edge: string }>();
  const heap = new MinHeap();
  heap.push(0, from);
  const done = new Set<string>();
  while (heap.size) {
    const [d, k] = heap.pop()!;
    if (done.has(k)) continue;
    done.add(k);
    if (k === to) break;
    if (k !== from && !allowHubs && model.nodes.get(k)?.t === "project") continue;
    model.graph.forEachEdge(k, (edge, a, s, t) => {
      if (!visible.edges.has(edge)) return;
      const other = s === k ? t : s;
      if (done.has(other)) return;
      const nd = d + 1 + 0.01 / Math.max(a.w, 1);
      if (nd < (dist.get(other) ?? Infinity)) {
        dist.set(other, nd);
        prev.set(other, { node: k, edge });
        heap.push(nd, other);
      }
    });
  }
  if (!prev.has(to)) return null;
  const nodes = [to];
  const edges: string[] = [];
  for (let k = to; k !== from;) {
    const p = prev.get(k)!;
    edges.unshift(p.edge);
    nodes.unshift(p.node);
    k = p.node;
  }
  return { nodes, edges };
}

class MinHeap {
  private items: [number, string][] = [];
  get size() { return this.items.length; }
  push(priority: number, value: string) {
    const a = this.items;
    a.push([priority, value]);
    for (let i = a.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop(): [number, string] | undefined {
    const a = this.items;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
