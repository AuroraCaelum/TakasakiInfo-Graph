/**
 * Layout for the focus view: the selection in the middle, its neighbourhood in rings by depth,
 * relaxed by a short ForceAtlas2 run, then fitted into a disc around the selection's place in
 * the global map (so leaving the focus view animates back without the map jumping).
 */

import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

import type { Model } from "../model";
import type { Visible } from "./visibility";

export type Positions = Map<string, { x: number; y: number }>;

const spanCache = new WeakMap<Model, number>();

function globalSpan(model: Model): number {
  let s = spanCache.get(model);
  if (s === undefined) {
    const xs = model.list.map((n) => n.x);
    const ys = model.list.map((n) => n.y);
    s = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
    spanCache.set(model, s);
  }
  return s;
}

export function focusLayout(model: Model, center: string, visible: Visible): Positions {
  const origin = model.nodes.get(center)!;
  const depth = new Map([[center, 0]]);
  const queue = [center];
  while (queue.length) {
    const k = queue.shift()!;
    model.graph.forEachEdge(k, (edge, _a, s, t) => {
      if (!visible.edges.has(edge)) return;
      const o = s === k ? t : s;
      if (!depth.has(o) && visible.nodes.has(o)) {
        depth.set(o, depth.get(k)! + 1);
        queue.push(o);
      }
    });
  }

  const g = new Graph({ type: "undirected" });
  const rings = new Map<number, string[]>();
  for (const [k, d] of depth) rings.set(d, [...(rings.get(d) ?? []), k]);
  for (const [d, keys] of rings) {
    // keep the global orientation: order each ring by the nodes' angle around the selection
    const angle = (k: string) => { const n = model.nodes.get(k)!; return Math.atan2(n.y - origin.y, n.x - origin.x); };
    keys.sort((a, b) => angle(a) - angle(b));
    keys.forEach((k, i) => {
      const a = keys.length > 1 ? (2 * Math.PI * i) / keys.length : 0;
      g.addNode(k, { x: d * 10 * Math.cos(a), y: d * 10 * Math.sin(a), fixed: k === center });
    });
  }
  visible.edges.forEach((edge) => {
    const [s, t] = model.graph.extremities(edge);
    if (g.hasNode(s) && g.hasNode(t) && !g.hasEdge(s, t)) g.addEdge(s, t, { weight: 1 + Math.log2(model.graph.getEdgeAttribute(edge, "w")) });
  });
  if (g.order > 2) {
    forceAtlas2.assign(g, {
      iterations: 150,
      getEdgeWeight: "weight",
      settings: { ...forceAtlas2.inferSettings(g), gravity: 2, scalingRatio: 4, barnesHutOptimize: g.order > 300 },
    });
  }

  let far = 0;
  const cx = g.getNodeAttribute(center, "x") as number;
  const cy = g.getNodeAttribute(center, "y") as number;
  g.forEachNode((_k, a) => { far = Math.max(far, Math.hypot(a.x - cx, a.y - cy)); });
  const radius = globalSpan(model) * Math.min(0.32, Math.max(0.07, 0.035 * Math.sqrt(g.order)));
  const scale = far ? radius / far : 1;
  const out: Positions = new Map();
  g.forEachNode((k, a) => out.set(k, { x: origin.x + (a.x - cx) * scale, y: origin.y + (a.y - cy) * scale }));
  return out;
}
