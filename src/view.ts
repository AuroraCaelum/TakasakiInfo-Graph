/** View-state types and defaults, free of side effects (the store and the tests import them). */

import { DERIVED_RELATIONS, FACT_RELATIONS, NODE_TYPES, type NodeType, type Relation } from "../shared/graph";
import type { NameLang, UiLang } from "./i18n";

export type ThemeChoice = "system" | "light" | "dark";
export type ColorBy = "type" | "project" | "community";
export type Tab = "overview" | "data" | "neighbors" | "related";

export interface Filters {
  types: Record<NodeType, boolean>;
  drama: boolean;
  /** null = every project */
  projects: string[] | null;
  relations: Record<Relation, boolean>;
  hideIsolated: boolean;
}

export interface ViewState extends Filters {
  uiLang: UiLang;
  nameLang: NameLang;
  colorBy: ColorBy;
  /** ISO date when the time slider is on */
  time: string | null;
  selected: string | null;
  /** 0 = off, else the neighbourhood depth around `selected` */
  focus: number;
  /** path finding: from `selected` to `pathTo` */
  pathOn: boolean;
  pathTo: string | null;
  pathHubs: boolean;
  tab: Tab;
}

export const DEFAULT_FILTERS: Filters = {
  types: Object.fromEntries(NODE_TYPES.map((t) => [t, true])) as Record<NodeType, boolean>,
  drama: false,
  projects: null,
  relations: {
    ...(Object.fromEntries(FACT_RELATIONS.map((r) => [r, true])) as Record<Relation, boolean>),
    ...(Object.fromEntries(DERIVED_RELATIONS.map((r) => [r, false])) as Record<Relation, boolean>),
  },
  hideIsolated: true,
};

export function cloneFilters(f: Filters = DEFAULT_FILTERS): Filters {
  return { ...f, types: { ...f.types }, relations: { ...f.relations }, projects: f.projects ? [...f.projects] : null };
}
