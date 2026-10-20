import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { ModelContext, PaletteContext, useModel, useNode, useT } from "./context";
import { DICTS } from "./i18n";
import { GraphView } from "./graph/GraphView";
import { Icon } from "./icons";
import { shortestPath } from "./lib/analysis";
import { nameOf } from "./lib/names";
import { fromQuery, toQuery } from "./lib/url";
import { computeVisible, type Visible } from "./lib/visibility";
import { loadGraph, type Model } from "./model";
import { defaultView, useApp } from "./store";
import { palette as makePalette } from "./theme";
import { About } from "./ui/About";
import { DetailPanel } from "./ui/detail/DetailPanel";
import { FilterPanel } from "./ui/FilterPanel";
import { Legend } from "./ui/Legend";
import { PathPanel } from "./ui/PathPanel";
import { TimeBar } from "./ui/TimeBar";
import { TopBar } from "./ui/TopBar";

const isNodeIn = (model: Model) => (k: string) => model.nodes.has(k);

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

export function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useApp((s) => s.theme);
  const uiLang = useApp((s) => s.uiLang);
  const systemDark = useSystemDark();
  const mode = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  const palette = useMemo(() => makePalette(mode), [mode]);
  const t = DICTS[uiLang];

  useEffect(() => {
    loadGraph().then((m) => {
      // the URL wins over the defaults on first load
      useApp.setState(fromQuery(window.location.search, useApp.getState(), isNodeIn(m)));
      setModel(m);
    }, (e: unknown) => setError(String(e)));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.title = t.appTitle;
  }, [uiLang, t]);

  if (error) {
    return <div className="splash"><p>{t.loadError}</p><code>{error}</code></div>;
  }
  if (!model) {
    return <div className="splash" aria-busy="true"><span className="spinner" aria-hidden="true" /><p>{t.loading}</p></div>;
  }
  return (
    <ModelContext.Provider value={model}>
      <PaletteContext.Provider value={palette}>
        <Shell />
      </PaletteContext.Provider>
    </ModelContext.Provider>
  );
}

/** Keeps the URL in step with the view: a new selection is a history entry, the rest replaces. */
function useUrlSync(model: Model) {
  const defaults = useRef(defaultView());
  useEffect(() => {
    let last = useApp.getState().selected;
    const unsub = useApp.subscribe((s) => {
      const url = `${window.location.pathname}${toQuery(s, defaults.current)}${window.location.hash}`;
      if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        if (s.selected !== last) window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
      }
      last = s.selected;
    });
    const onPop = () => {
      const s = useApp.getState();
      const base = { ...defaults.current, uiLang: s.uiLang, nameLang: s.nameLang };
      last = null;
      useApp.setState(fromQuery(window.location.search, base, isNodeIn(model)));
      last = useApp.getState().selected;
    };
    window.addEventListener("popstate", onPop);
    return () => { unsub(); window.removeEventListener("popstate", onPop); };
  }, [model]);
}

function Shell() {
  const model = useModel();
  useUrlSync(model);
  const f = useApp(useShallow((s) => ({
    types: s.types, drama: s.drama, bgm: s.bgm, projects: s.projects, relations: s.relations, hideIsolated: s.hideIsolated,
    time: s.time, selected: s.selected, focus: s.focus,
  })));
  const { pathOn, pathTo, pathHubs, selected, filtersOpen } = useApp(useShallow((s) => ({
    pathOn: s.pathOn, pathTo: s.pathTo, pathHubs: s.pathHubs, selected: s.selected, filtersOpen: s.filtersOpen,
  })));
  const set = useApp((s) => s.set);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1280) set({ filtersOpen: true });
  }, [set]);

  const visible = useMemo(() => computeVisible(model, f), [model, f]);
  const unfocused = useMemo(() => (f.focus ? computeVisible(model, { ...f, focus: 0 }) : visible), [model, f, visible]);
  const path = useMemo(
    () => (pathOn && selected && pathTo ? shortestPath(model, unfocused, selected, pathTo, pathHubs) : null),
    [model, unfocused, pathOn, selected, pathTo, pathHubs],
  );

  return (
    <div className={`app${selected ? " has-detail" : ""}${filtersOpen ? " has-filters" : ""}`}>
      <TopBar onAbout={() => setAbout(true)} />
      <div className="main">
        <FilterPanel />
        <div className="stage">
          <GraphView visible={visible} path={path} />
          <StatusLine visible={visible} />
          <PathPanel path={path} />
          <Legend visible={visible} />
        </div>
        <DetailPanel />
      </div>
      <TimeBar />
      {about && <About onClose={() => setAbout(false)} />}
    </div>
  );
}

function StatusLine({ visible }: { visible: Visible }) {
  const t = useT();
  const s = useApp();
  const node = useNode(s.selected);
  return (
    <div className="status-line">
      <span className="tabular">{t.shown(visible.nodes.size, visible.edges.size)}</span>
      {s.time && <span className="badge badge-strong tabular">{s.time}</span>}
      {s.focus > 0 && node && (
        <span className="focus-banner">
          <Icon name="focus" size={14} />
          {t.focusOn(nameOf(node.n, s.nameLang, node.k))} · {t.depth} {s.focus}
          <button type="button" className="text-btn" onClick={() => s.set({ focus: 0 })}>{t.focusExit}</button>
        </span>
      )}
      {!s.selected && <span className="muted hide-narrow">{t.selectHint}</span>}
    </div>
  );
}
