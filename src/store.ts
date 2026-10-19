import { create } from "zustand";

import { DEFAULT_NAME_LANG, detectUiLang } from "./i18n";
import { cloneFilters, type ThemeChoice, type ViewState } from "./view";

export interface AppState extends ViewState {
  theme: ThemeChoice;
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

/** Per-viewer conveniences only (theme, languages); everything else lives in the URL. */
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
