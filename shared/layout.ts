/**
 * The forces of the map's ForceAtlas2 layout, shared by the build (the precomputed map,
 * scripts/lib/analyze.ts) and the site (the live layout, src/lib/layouts.ts), so a live run
 * over every node settles into the same picture the build drew.
 */

import type { Relation } from "./graph";

/**
 * A fact's pull: project membership is weak (each project still forms a region), other facts
 * are log-damped so one heavy edge does not collapse its endpoints. Parallel facts add up.
 */
export function layoutWeight(r: Relation, w: number): number {
  return r === "project" ? 0.5 : 1 + Math.log2(w);
}

/**
 * The ForceAtlas2 options a viewer can change (Gephi's panel); the defaults draw the build's map.
 * Gephi's "prevent overlap" is left out: sigma draws nodes at a fixed pixel size, so nodes are
 * apart only at some zoom, and the live layout's fit to its frame undoes the spacing anyway.
 */
export interface Fa2Options {
  linLog: boolean;
  /** outbound attraction distribution: hubs pull less, so they drift outward */
  dissuadeHubs: boolean;
  strongGravity: boolean;
  /** Barnes-Hut approximation of the repulsion */
  approximate: boolean;
  gravity: number;
  scaling: number;
  edgeWeightInfluence: number;
}

/**
 * graphology's inferred settings with weak, strong-mode gravity: each project settles into its
 * own region, with the people who work across projects in between (tuned visually;
 * scalingRatio only rescales the picture, apart from its balance against gravity).
 */
export const FA2_DEFAULTS: Fa2Options = {
  linLog: false,
  dissuadeHubs: false,
  strongGravity: true,
  approximate: true,
  gravity: 0.05,
  scaling: 6,
  edgeWeightInfluence: 1,
};

export function fa2Settings(order: number, o: Fa2Options = FA2_DEFAULTS) {
  return {
    barnesHutOptimize: o.approximate,
    strongGravityMode: o.strongGravity,
    gravity: o.gravity,
    scalingRatio: o.scaling,
    slowDown: 1 + Math.log(order),
    edgeWeightInfluence: o.edgeWeightInfluence,
    linLogMode: o.linLog,
    outboundAttractionDistribution: o.dissuadeHubs,
  };
}
