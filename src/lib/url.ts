/**
 * Deep links: the view state as a query string, writing only what differs from the defaults.
 *
 *   ?n=work:nijigasaki/dive&tab=related&focus=2&names=ja&p=nijigasaki,aqours&r=-project&at=2022-01-01&bgm=0
 */

import { DERIVED_RELATIONS, FACT_RELATIONS, NODE_TYPES, type NodeType, type Relation } from "../../shared/graph";
import { DEFAULT_NAME_LANG, NAME_LANGS, UI_LANGS, type NameLang, type UiLang } from "../i18n";
import { DEFAULT_FILTERS, type ColorBy, type Tab, type ViewState } from "../view";

const RELATIONS: Relation[] = [...FACT_RELATIONS, ...DERIVED_RELATIONS];
const TABS: Tab[] = ["overview", "data", "neighbors", "related"];
const COLORS: ColorBy[] = ["type", "project", "community"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A toggle set as a diff against its default, only what changed: `-a,b` turns a off and b on. */
function diff<K extends string>(keys: readonly K[], value: Record<K, boolean>, base: Record<K, boolean>): string {
  return keys.filter((k) => value[k] !== base[k]).map((k) => (value[k] ? k : `-${k}`)).join(",");
}

function applyDiff<K extends string>(keys: readonly K[], text: string, base: Record<K, boolean>): Record<K, boolean> {
  const out = { ...base };
  for (const part of text.split(",")) {
    const off = part.startsWith("-");
    const k = (off ? part.slice(1) : part) as K;
    if (keys.includes(k)) out[k] = !off;
  }
  return out;
}

export function toQuery(s: ViewState, defaults: Pick<ViewState, "uiLang" | "nameLang">): string {
  const q = new URLSearchParams();
  if (s.selected) q.set("n", s.selected);
  if (s.selected && s.tab !== "overview") q.set("tab", s.tab);
  if (s.selected && s.focus) q.set("focus", String(s.focus));
  if (s.selected && s.pathOn) {
    q.set("path", s.pathTo ?? "");
    if (s.pathHubs) q.set("hubs", "1");
  }
  if (s.uiLang !== defaults.uiLang) q.set("ui", s.uiLang);
  // a `ui` in the link brings that language's names along (see fromQuery)
  const impliedNames = s.uiLang !== defaults.uiLang ? DEFAULT_NAME_LANG[s.uiLang] : defaults.nameLang;
  if (s.nameLang !== impliedNames) q.set("names", s.nameLang);
  if (s.colorBy !== "type") q.set("color", s.colorBy);
  if (s.projects) q.set("p", s.projects.join(","));
  const t = diff(NODE_TYPES, s.types, DEFAULT_FILTERS.types);
  if (t) q.set("t", t);
  if (s.drama) q.set("drama", "1");
  if (!s.bgm) q.set("bgm", "0");
  const r = diff(RELATIONS, s.relations, DEFAULT_FILTERS.relations);
  if (r) q.set("r", r);
  if (!s.hideIsolated) q.set("isolated", "1");
  if (s.time) q.set("at", s.time);
  const text = q.toString();
  return text ? `?${text.replace(/%3A/g, ":").replace(/%2F/g, "/").replace(/%2C/g, ",")}` : "";
}

/** Parses a query string over `base`; unknown or malformed values are ignored. */
export function fromQuery(search: string, base: ViewState, isNode: (k: string) => boolean): ViewState {
  const q = new URLSearchParams(search);
  const s: ViewState = { ...base, types: { ...base.types }, relations: { ...base.relations } };
  const n = q.get("n");
  if (n && isNode(n)) s.selected = n;
  const tab = q.get("tab") as Tab | null;
  if (tab && TABS.includes(tab)) s.tab = tab;
  const focus = Number(q.get("focus"));
  if (s.selected && [1, 2, 3].includes(focus)) s.focus = focus;
  if (s.selected && q.has("path")) {
    s.pathOn = true;
    const to = q.get("path");
    s.pathTo = to && isNode(to) && to !== s.selected ? to : null;
    s.pathHubs = q.get("hubs") === "1";
  }
  const ui = q.get("ui") as UiLang | null;
  if (ui && UI_LANGS.includes(ui)) {
    s.uiLang = ui;
    s.nameLang = DEFAULT_NAME_LANG[ui]; // names follow the UI language unless the link says otherwise
  }
  const names = q.get("names") as NameLang | null;
  if (names && NAME_LANGS.includes(names)) s.nameLang = names;
  const color = q.get("color") as ColorBy | null;
  if (color && COLORS.includes(color)) s.colorBy = color;
  const p = q.get("p");
  if (p !== null) s.projects = p.split(",").filter((x) => isNode(`project:${x}`));
  const t = q.get("t");
  if (t) s.types = applyDiff<NodeType>(NODE_TYPES, t, DEFAULT_FILTERS.types);
  if (q.get("drama") === "1") s.drama = true;
  if (q.get("bgm") === "0") s.bgm = false;
  const r = q.get("r");
  if (r) s.relations = applyDiff<Relation>(RELATIONS, r, DEFAULT_FILTERS.relations);
  if (q.get("isolated") === "1") s.hideIsolated = false;
  const at = q.get("at");
  if (at && DATE.test(at)) s.time = at;
  return s;
}
