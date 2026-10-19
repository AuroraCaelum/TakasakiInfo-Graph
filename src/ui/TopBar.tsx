import { useEffect, useRef } from "react";

import { useT } from "../context";
import { DEFAULT_NAME_LANG, NAME_LANGS, UI_LANGS, type UiLang } from "../i18n";
import { Icon } from "../icons";
import { remember, useApp } from "../store";
import type { ThemeChoice } from "../view";
import { SearchBox } from "./SearchBox";

const UI_LANG_LABEL: Record<UiLang, string> = { ko: "한국어", en: "English", ja: "日本語" };
const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: "monitor", light: "sun", dark: "moon" } as const;

export function TopBar({ onAbout }: { onAbout: () => void }) {
  const t = useT();
  const s = useApp();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea|select/i.test(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setUi = (ui: UiLang) => {
    remember("tg.ui", ui);
    // names follow the UI language unless the viewer chose a script of their own
    const followed = s.nameLang === DEFAULT_NAME_LANG[s.uiLang];
    s.set({ uiLang: ui, ...(followed ? { nameLang: DEFAULT_NAME_LANG[ui] } : {}) });
  };

  return (
    <header className="topbar">
      <button
        type="button" className={`icon-btn${s.filtersOpen ? " on" : ""}`} aria-pressed={s.filtersOpen}
        title={t.filters} aria-label={t.openFilters} onClick={() => s.set({ filtersOpen: !s.filtersOpen })}
      >
        <Icon name="filter" />
      </button>
      <div className="brand">
        <h1>{t.appTitle}</h1>
        <p className="tagline">{t.appTagline}</p>
      </div>
      <SearchBox ref={searchRef} className="main-search" onPick={(k) => s.select(k)} />
      <div className="topbar-controls">
        <div className="segmented" role="radiogroup" aria-label={t.nameLang} title={t.nameLang}>
          {NAME_LANGS.map((l) => (
            <button
              key={l} type="button" role="radio" aria-checked={s.nameLang === l} className={s.nameLang === l ? "on" : ""}
              onClick={() => { remember("tg.names", l); s.set({ nameLang: l }); }}
            >
              {l === "rom" ? "Aa" : l === "ja" ? "あ" : "가"}
            </button>
          ))}
        </div>
        <label className="select-wrap" title={t.uiLang}>
          <span className="sr-only">{t.uiLang}</span>
          <select value={s.uiLang} onChange={(e) => setUi(e.target.value as UiLang)}>
            {UI_LANGS.map((l) => <option key={l} value={l}>{UI_LANG_LABEL[l]}</option>)}
          </select>
        </label>
        <button
          type="button" className="icon-btn" title={`${t.theme}: ${t.themes[s.theme]}`} aria-label={`${t.theme}: ${t.themes[s.theme]}`}
          onClick={() => { const next = NEXT_THEME[s.theme]; remember("tg.theme", next); s.set({ theme: next }); }}
        >
          <Icon name={THEME_ICON[s.theme]} />
        </button>
        <button type="button" className="icon-btn" title={t.about} aria-label={t.about} onClick={onAbout}>
          <Icon name="info" />
        </button>
      </div>
    </header>
  );
}
