import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { FA2_DEFAULTS, type Fa2Options } from "../shared/layout";
import { DEFAULT_NAME_LANG, detectUiLang, type NameLang, type UiLang } from "./i18n";
import {
  cloneFilters, LAYOUTS, NOVERLAP_DEFAULTS, type LayoutName, type NoverlapOptions, type ThemeChoice, type ViewState,
} from "./view";

export interface AppState extends ViewState {
  theme: ThemeChoice;
  layout: LayoutName;
  /** the live layouts' options */
  fa2: Fa2Options;
  noverlap: NoverlapOptions;
  filtersOpen: boolean;
  /** legend entry under the pointer: highlights that class */
  legendHover: string | null;
  set: (p: Partial<AppState>) => void;
  select: (key: string | null) => void;
  resetFilters: () => void;
}

function stored<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

/** Remembered layout options over their defaults; a value of the wrong kind is dropped. */
function storedOptions<T extends object>(key: string, defaults: T): T {
  const out = { ...defaults };
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
    for (const k of Object.keys(defaults) as (keyof T & string)[]) {
      const v = raw[k];
      if (typeof v === typeof defaults[k] && (typeof v !== "number" || (Number.isFinite(v) && v >= 0))) {
        (out as Record<string, unknown>)[k] = v;
      }
    }
  } catch {
    // unreadable or blocked storage: the defaults
  }
  return out;
}

/** Per-viewer conveniences only (theme, languages, layout); everything else lives in the URL. */
export function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private windows and blocked storage: the setting just isn't remembered
  }
}

export function defaultView(): ViewState {
  const uiLang = stored("tg.ui", ["ko", "en", "ja"] as const) ?? detectUiLang();
  return {
    ...cloneFilters(),
    uiLang,
    nameLang: stored("tg.names", ["ja", "rom", "ko"] as const) ?? DEFAULT_NAME_LANG[uiLang],
    colorBy: "type",
    time: null,
    selected: null,
    focus: 0,
    pathOn: false,
    pathTo: null,
    pathHubs: false,
    tab: "overview",
  };
}

export const useApp = create<AppState>((set) => ({
  ...defaultView(),
  theme: stored("tg.theme", ["system", "light", "dark"] as const) ?? "system",
  layout: stored("tg.layout", LAYOUTS) ?? "preset",
  fa2: storedOptions("tg.fa2", FA2_DEFAULTS),
  noverlap: storedOptions("tg.noverlap", NOVERLAP_DEFAULTS),
  filtersOpen: false,
  legendHover: null,
  set: (p) => set(p),
  select: (key) => set((s) => (key === s.selected ? {} : {
    selected: key,
    focus: key ? s.focus : 0,
    pathOn: key ? s.pathOn : false,
    pathTo: key && key !== s.pathTo ? s.pathTo : null,
  })),
  resetFilters: () => set({ ...cloneFilters(), time: null }),
}));

/** Remembered choices of the viewer: the top bar and the phone menu both set them. */
export function chooseUiLang(ui: UiLang): void {
  remember("tg.ui", ui);
  const s = useApp.getState();
  // names follow the UI language unless the viewer chose a script of their own
  const followed = s.nameLang === DEFAULT_NAME_LANG[s.uiLang];
  s.set({ uiLang: ui, ...(followed ? { nameLang: DEFAULT_NAME_LANG[ui] } : {}) });
}

export function chooseNameLang(l: NameLang): void {
  remember("tg.names", l);
  useApp.getState().set({ nameLang: l });
}

export function chooseTheme(theme: ThemeChoice): void {
  remember("tg.theme", theme);
  useApp.getState().set({ theme });
}

export function chooseLayout(layout: LayoutName): void {
  remember("tg.layout", layout);
  useApp.getState().set({ layout });
}

/** Changes some of the ForceAtlas2 options; `null` puts every one back to its default. */
export function chooseFa2(patch: Partial<Fa2Options> | null): void {
  const fa2 = patch ? { ...useApp.getState().fa2, ...patch } : { ...FA2_DEFAULTS };
  remember("tg.fa2", JSON.stringify(fa2));
  useApp.getState().set({ fa2 });
}

/** Changes some of the Noverlap options; `null` puts every one back to its default. */
export function chooseNoverlap(patch: Partial<NoverlapOptions> | null): void {
  const noverlap = patch ? { ...useApp.getState().noverlap, ...patch } : { ...NOVERLAP_DEFAULTS };
  remember("tg.noverlap", JSON.stringify(noverlap));
  useApp.getState().set({ noverlap });
}

/**
 * The filters alone, without the selection: what is on screen apart from the selected node
 * (kept even when filtered out) and the focus view. Stable while none of them changes.
 */
export function useFilters() {
  return useApp(useShallow((s) => ({
    types: s.types, drama: s.drama, bgm: s.bgm, projects: s.projects, relations: s.relations, hideIsolated: s.hideIsolated,
    time: s.time,
  })));
}
