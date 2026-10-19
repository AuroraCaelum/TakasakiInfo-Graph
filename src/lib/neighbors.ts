import { DERIVED_RELATIONS, FACT_RELATIONS, type Period, type Relation } from "../../shared/graph";
import type { Model } from "../model";

export interface NeighborFact {
  k: string;
  r: Relation;
  w: number;
  d?: string;
  pd?: Period[];
  via?: string[];
}

const ORDER: Relation[] = [...FACT_RELATIONS, ...DERIVED_RELATIONS];

/** Every fact touching `key`, regardless of filters, grouped by relation in a fixed order. */
export function neighborsByRelation(model: Model, key: string): [Relation, NeighborFact[]][] {
  const groups = new Map<Relation, NeighborFact[]>();
  if (!model.graph.hasNode(key)) return [];
  model.graph.forEachEdge(key, (_e, a, s, t) => {
    const k = s === key ? t : s;
    for (const f of a.facts) {
      groups.set(f.r, [...(groups.get(f.r) ?? []), { k, r: f.r, w: f.w, d: f.d, pd: f.pd, via: f.via }]);
    }
  });
  for (const list of groups.values()) {
    list.sort((a, b) => b.w - a.w || (a.d ?? "9").localeCompare(b.d ?? "9") || a.k.localeCompare(b.k));
  }
  return ORDER.filter((r) => groups.has(r)).map((r) => [r, groups.get(r)!]);
}

/** Facts of one relation, oldest first (for chronological lists). */
export function chronological(model: Model, key: string, r: Relation, otherType?: string): NeighborFact[] {
  const group = neighborsByRelation(model, key).find(([rel]) => rel === r)?.[1] ?? [];
  return group
    .filter((f) => !otherType || f.k.startsWith(`${otherType}:`))
    .sort((a, b) => (a.d ?? "9").localeCompare(b.d ?? "9") || a.k.localeCompare(b.k));
}
