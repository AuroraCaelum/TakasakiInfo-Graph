/**
 * Colors for the graph canvas (WebGL can't read CSS variables, so the tokens live here too;
 * styles.css defines the same values for the HTML chrome).
 *
 * Categorical slots are the validated reference palette (dataviz skill, references/palette.md),
 * light and dark steps. A node-link map is an all-pairs form, where only three slots stay
 * distinct for every reader, so the three most numerous types (song, person, release; ~90% of
 * nodes) take slots 1-3. The other types also carry a pictogram, a type label in the tooltip,
 * and a legend that isolates them on hover: color is never the only cue. With slot 7 (violet)
 * kept for derived edges, the slots run out at cities: they fold into the neutral gray rather
 * than a generated ninth hue, and their pictogram tells them apart.
 *
 * Projects are not slots: they take their official colors, which readers know them by.
 */

import type { NodeType } from "../shared/graph";

export type ThemeMode = "light" | "dark";

const SLOTS: Record<ThemeMode, string[]> = {
  //       blue       orange     aqua       yellow     magenta    green      violet     red
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

/** Fixed slot per node type: identity never depends on what is filtered. */
const TYPE_SLOT: Record<Exclude<NodeType, "project" | "city">, number> = {
  work: 0, person: 1, release: 2, character: 3, artist: 4, venue: 5, concert: 7,
};

const NEUTRAL = "#898781";

/**
 * The official colors of the projects (the "Official SNS" labels on lovelive-anime.jp), by id,
 * so a project keeps its color across data updates. `dark` lifts the ones too dark to read on
 * the dark surface (to about 3:1).
 */
const PROJECT_COLORS: Record<string, { light: string; dark?: string }> = {
  muse: { light: "#e50080" },
  aqours: { light: "#19b1f6" },
  nijigasaki: { light: "#eebd0d" },
  liella: { light: "#da57d8" },
  musical: { light: "#c40035", dark: "#cf1a3d" },
  hasunosora: { light: "#fb8a9b" },
  yohane: { light: "#19737d" },
  ikizulive: { light: "#ed6d00" },
  // the series as a whole (Love Live!'s own pink, see COMMON)
  lovelive: { light: "#b06680" },
};

/**
 * Groups with official colors of their own inside a project (shared/graph.ts COLOR_GROUPS says
 * which nodes take them), by artist id.
 */
const GROUP_COLORS: Record<string, { light: string; dark?: string }> = {
  "a-rise": { light: "#6518ac", dark: "#8a49d8" },
  "saint-snow": { light: "#664488", dark: "#7d5ba1" },
  "sunny-passion": { light: "#ff8f70" },
};

/**
 * The series' color, for the series project and everything else: several projects, no project,
 * a project not listed. Love Live!'s own pink (#e4007f) is μ's' color to the eye, so this is it
 * greyed toward rose.
 */
const COMMON = PROJECT_COLORS.lovelive.light;

/** Display order of projects (filters, legend); ids not listed follow, alphabetically. */
export const PROJECT_ORDER = ["muse", "aqours", "nijigasaki", "liella", "musical", "hasunosora", "yohane", "ikizulive", "lovelive"];

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
  /** neutral for "other community" */
  other: string;
  /** project id → its color */
  projects: Record<string, string>;
  /** artist id of a group with its own color → the color */
  groups: Record<string, string>;
  /** the project colors' "everything else" */
  common: string;
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
  type.city = NEUTRAL;
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
    other: NEUTRAL,
    projects: Object.fromEntries(Object.entries(PROJECT_COLORS).map(([id, c]) => [id, (!light && c.dark) || c.light])),
    groups: Object.fromEntries(Object.entries(GROUP_COLORS).map(([id, c]) => [id, (!light && c.dark) || c.light])),
    common: COMMON,
    slots,
    type,
    picto,
  };
}

/** The color of one project, or of a node's projects: its one project's, else the common one. */
export function projectColor(p: Palette, projects: string[]): string {
  return (projects.length === 1 && p.projects[projects[0]]) || p.common;
}

/** A node's color by project: its group's when it has one (GNode.g), else its project's. */
export function nodeProjectColor(p: Palette, n: { p: string[]; g?: string }): string {
  return (n.g && p.groups[n.g]) || projectColor(p, n.p);
}

export function communityColor(p: Palette, community: number): string {
  return community < COMMUNITY_COLORS ? p.slots[community] : p.other;
}
