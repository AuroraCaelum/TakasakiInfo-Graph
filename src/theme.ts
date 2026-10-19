/**
 * Colors for the graph canvas (WebGL can't read CSS variables, so the tokens live here too;
 * styles.css defines the same values for the HTML chrome).
 *
 * Categorical slots are the validated reference palette (dataviz skill, references/palette.md),
 * light and dark steps. A node-link map is an all-pairs form, where only three slots stay
 * distinct for every reader, so the three most numerous types (song, person, release; ~90% of
 * nodes) take slots 1-3. The other types also carry a pictogram, a type label in the tooltip,
 * and a legend that isolates them on hover: color is never the only cue.
 */

import type { NodeType } from "../shared/graph";

export type ThemeMode = "light" | "dark";

const SLOTS: Record<ThemeMode, string[]> = {
  //       blue       orange     aqua       yellow     magenta    green      violet     red
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

/** Fixed slot per node type: identity never depends on what is filtered. */
const TYPE_SLOT: Record<Exclude<NodeType, "project">, number> = {
  work: 0, person: 1, release: 2, character: 3, artist: 4, venue: 5, concert: 7,
};

/**
 * Fixed slot per project, by id, so a project keeps its color across data updates.
 * Projects not listed here fold into "other" (gray) rather than generating a ninth hue.
 */
export const PROJECT_SLOT: Record<string, number> = {
  nijigasaki: 0, aqours: 1, hasunosora: 2, liella: 3, ikizulive: 4, musical: 5, muse: 6, external: 7,
};

/** Display order of projects (filters, legend); ids not listed follow, alphabetically. */
export const PROJECT_ORDER = ["muse", "aqours", "nijigasaki", "liella", "musical", "hasunosora", "ikizulive", "external"];

export const COMMUNITY_COLORS = 8;

export interface Palette {
  mode: ThemeMode;
  surface: string;
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  /** a node outside the current highlight */
  dim: string;
  edge: string;
  /** an edge outside the current highlight */
  edgeFaint: string;
  edgeStrong: string;
  derived: string;
  derivedStrong: string;
  /** neutral for "several projects", "no project", "other community" */
  other: string;
  slots: string[];
  type: Record<NodeType, string>;
  /** pictogram color drawn on top of the node fill */
  picto: Record<NodeType, string>;
}

/**
 * A translucent color for the WebGL canvas. Sigma blends with (ONE, ONE_MINUS_SRC_ALPHA), so
 * colors must be premultiplied: rgba(240,239,236,0.1) would add almost full white on a dark
 * surface, while rgba(24,24,24,0.1) adds a tenth of it as intended.
 */
export function glAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * alpha));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export function palette(mode: ThemeMode): Palette {
  const slots = SLOTS[mode];
  const light = mode === "light";
  const ink = light ? "#0b0b0b" : "#f0efec";
  const surface = light ? "#fcfcfb" : "#1a1a19";
  const type = Object.fromEntries(Object.entries(TYPE_SLOT).map(([t, i]) => [t, slots[i]])) as Record<NodeType, string>;
  type.project = ink;
  const picto = Object.fromEntries(Object.keys(type).map((t) => [t, "#ffffff"])) as Record<NodeType, string>;
  picto.project = surface;
  return {
    mode,
    surface,
    ink,
    ink2: light ? "#52514e" : "#c3c2b7",
    muted: "#898781",
    grid: light ? "#e1e0d9" : "#2c2c2a",
    dim: light ? "#e9e8e3" : "#2a2a28",
    edge: glAlpha(ink, light ? 0.09 : 0.1),
    edgeFaint: glAlpha(ink, 0.035),
    edgeStrong: glAlpha(ink, light ? 0.55 : 0.6),
    derived: glAlpha(slots[6], 0.3),
    derivedStrong: glAlpha(slots[6], 0.9),
    other: "#898781",
    slots,
    type,
    picto,
  };
}

export function projectColor(p: Palette, projects: string[]): string {
  if (projects.length !== 1) return p.other;
  const slot = PROJECT_SLOT[projects[0]];
  return slot === undefined ? p.other : p.slots[slot];
}

export function communityColor(p: Palette, community: number): string {
  return community < COMMUNITY_COLORS ? p.slots[community] : p.other;
}
