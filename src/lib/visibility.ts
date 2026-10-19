/**
 * What is on screen, from the filters: a pure function of the model and the view state, so it
 * can be tested and shared by the graph, the counters and the path finder.
 */

import type { GEdge, GNode } from "../../shared/graph";
import type { Model } from "../model";
import type { Filters } from "../view";

export interface VisibilityInput extends Filters {
  time: string | null;
  selected: string | null;
  focus: number;
}

export interface Visible {
  nodes: Set<string>;
  edges: Set<string>;
}

export function nodePasses(n: GNode, f: VisibilityInput): boolean {
  if (!f.types[n.t]) return false;
  if (n.t === "work" && n.s === "drama" && !f.drama) return false;
  if (f.projects && n.p.length && !n.p.some((p) => f.projects!.includes(p))) return false;
  if (f.time && n.d && n.d > f.time) return false;
  return true;
}

/** Enabled relation, and at `time`: already existing, and inside one of its periods. */
export function factPasses(e: GEdge, f: VisibilityInput): boolean {
  if (!f.relations[e.r]) return false;
  if (!f.time) return true;
  if (e.d && e.d > f.time) return false;
  if (e.pd && !e.pd.some(([from, until]) => (!from || from <= f.time!) && (!until || f.time! <= until))) return false;
  return true;
}

export function computeVisible(model: Model, f: VisibilityInput): Visible {
  const pass = new Set<string>();
  for (const n of model.list) if (nodePasses(n, f) || n.k === f.selected) pass.add(n.k);

  let edges = new Set<string>();
  model.graph.forEachEdge((key, a, s, t) => {
    if (pass.has(s) && pass.has(t) && a.facts.some((e) => factPasses(e, f))) edges.add(key);
  });

  let nodes = pass;
  if (f.hideIsolated) {
    nodes = new Set<string>();
    for (const key of edges) {
      const [s, t] = model.graph.extremities(key);
      nodes.add(s);
      nodes.add(t);
    }
    if (f.selected && pass.has(f.selected)) nodes.add(f.selected);
  }

  if (f.focus > 0 && f.selected && nodes.has(f.selected)) {
    // breadth-first from the selection; project hubs are reached but not expanded (every
    // node of a project is two steps away through its hub)
    const keep = new Set([f.selected]);
    let frontier = [f.selected];
    for (let depth = 0; depth < f.focus && frontier.length; depth++) {
      const next: string[] = [];
      for (const k of frontier) {
        if (k !== f.selected && model.nodes.get(k)?.t === "project") continue;
        model.graph.forEachEdge(k, (key, _a, s, t) => {
          if (!edges.has(key)) return;
          const other = s === k ? t : s;
          if (!keep.has(other)) {
            keep.add(other);
            next.push(other);
          }
        });
      }
      frontier = next;
    }
    nodes = keep;
    edges = new Set([...edges].filter((key) => {
      const [s, t] = model.graph.extremities(key);
      return keep.has(s) && keep.has(t);
    }));
  }
  return { nodes, edges };
}
