import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { useT } from "../../context";
import { GraphView } from "../../graph/GraphView";
import { NAME_LANGS, UI_LANGS } from "../../i18n";
import { Icon, type UiIconName } from "../../icons";
import type { PathResult } from "../../lib/analysis";
import type { Visible } from "../../lib/visibility";
import { chooseNameLang, chooseTheme, chooseUiLang, useApp } from "../../store";
import type { Tab, ThemeChoice } from "../../view";
import { About } from "../About";
import { useTimeline } from "../TimeBar";
import { NAME_LANG_MARK, THEME_ICON, UI_LANG_LABEL } from "../TopBar";
import { FilterSheet } from "./FilterSheet";
import { NodePane, Welcome } from "./NodePane";
import { Segmented } from "./parts";
import { PathCard, PathPane } from "./PathPane";
import { SearchSheet } from "./SearchSheet";

/** Heights the graph pane snaps to, as shares of the screen. */
const SNAPS = [0.32, 0.44, 0.62];
const TABS: [Tab, UiIconName][] = [["overview", "info"], ["data", "list"], ["neighbors", "graph"], ["related", "bars"]];
const THEMES: ThemeChoice[] = ["system", "light", "dark"];
/** How far the floating controls reach into the graph (styles.css: .m-top, .m-path-card, .m-time). */
const TOP_BAR_BOTTOM = 64;
const PATH_CARD_BOTTOM = 128;
const TIME_STRIP_TOP = 62;

type Overlay = "search" | "path" | "filters" | "about" | null;

/**
 * The phone layout: the graph above, the selected node below, and its tabs at the bottom.
 * Filters, search and display settings float over the graph; finding a path swaps the top bar
 * for the two ends and the node for the steps.
 */
export function MobileShell({ visible, path }: { visible: Visible; path: PathResult | null }) {
  const t = useT();
  const s = useApp();
  const pathMode = s.pathOn && !!s.selected;
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const split = useSplit();
  const pane = useRef<HTMLDivElement>(null);

  const pathKey = path?.nodes.join("|") ?? null;
  useEffect(() => { setStep(null); }, [pathKey, pathMode]);
  useEffect(() => { pane.current?.scrollTo(0, 0); }, [s.selected, s.tab, pathMode]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (overlay) setOverlay(null);
      else setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  // in a path, a tap on one of its nodes moves to that step; any other node becomes the end
  const onNodeTap = (k: string) => {
    setMenu(false);
    if (!pathMode) return s.select(k);
    const i = path ? path.nodes.indexOf(k) : -1;
    if (i >= 0) setStep(i);
    else s.set({ pathTo: k === s.selected ? null : k });
  };
  const toPath = () => {
    if (s.pathTo && s.pathTo !== s.selected) s.set({ pathOn: true, focus: 0 });
    else {
      s.set({ pathOn: true, pathTo: null, focus: 0 });
      setOverlay("path");
    }
  };
  const open = (o: Overlay) => { setMenu(false); setOverlay(o); };

  return (
    <div ref={split.root} className="m-app">
      <div className={`m-graph${split.dragging ? " dragging" : ""}`} style={{ height: split.height }}>
        <GraphView
          visible={visible} path={path} compact active={path && step !== null ? path.nodes[step] : null}
          onNodeTap={onNodeTap} onStageTap={() => setMenu(false)}
          inset={{ top: pathMode ? PATH_CARD_BOTTOM : TOP_BAR_BOTTOM, bottom: s.time ? TIME_STRIP_TOP : 0 }}
        />
        {s.time && <TimeStrip />}
      </div>

      <div className="m-handle" {...split.handle} aria-label={t.resize}><span /></div>

      <div ref={pane} className="m-pane">
        {pathMode ? <PathPane path={path} step={step} onStep={setStep} onPickTo={() => open("path")} />
          : s.selected ? <NodePane onPath={toPath} onCopied={() => setToast(t.linkCopied)} />
          : <Welcome visible={visible} />}
      </div>

      <nav className="m-tabs" role="tablist">
        {TABS.map(([tab, icon]) => {
          const on = !!s.selected && !pathMode && s.tab === tab;
          return (
            <button key={tab} type="button" role="tab" aria-selected={on} disabled={!s.selected} className={on ? "on" : ""}
              onClick={() => s.set({ tab, pathOn: false })}>
              <Icon name={icon} size={22} />
              <span>{t.tabs[tab]}</span>
            </button>
          );
        })}
      </nav>

      {pathMode ? <PathCard onPickTo={() => open("path")} /> : (
        <div className="m-top">
          <button type="button" className="fab" aria-label={t.openFilters} title={t.filters} onClick={() => open("filters")}>
            <Icon name="filter" size={20} />
          </button>
          <button type="button" className="m-search-pill" onClick={() => open("search")}>
            <Icon name="search" />
            <span>{t.searchShort}</span>
          </button>
          <button type="button" className="fab m-names" aria-label={t.display} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {NAME_LANG_MARK[s.nameLang]}
          </button>
        </div>
      )}
      {menu && !pathMode && <DisplayMenu onClose={() => setMenu(false)} onAbout={() => open("about")} />}

      {(overlay === "search" || overlay === "path") && <SearchSheet forPath={overlay === "path"} onClose={() => setOverlay(null)} />}
      {overlay === "filters" && <FilterSheet visible={visible} onClose={() => setOverlay(null)} />}
      {overlay === "about" && <About onClose={() => setOverlay(null)} />}
      <div className="m-toast" role="status">{toast}</div>
    </div>
  );
}

/** Name script, UI language, theme, the time slider and the about box. */
function DisplayMenu({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  const t = useT();
  const s = useApp();
  const timeline = useTimeline();
  return (
    <>
      <div className="m-scrim-clear" onPointerDown={onClose} />
      <div className="m-menu" role="dialog" aria-label={t.display}>
        <div className="m-label">{t.nameLang}</div>
        <Segmented name={t.nameLang} value={s.nameLang} options={NAME_LANGS} label={(l) => NAME_LANG_MARK[l]} onChange={chooseNameLang} />
        <div className="m-label">{t.uiLang}</div>
        <Segmented name={t.uiLang} value={s.uiLang} options={UI_LANGS} label={(l) => UI_LANG_LABEL[l]} onChange={chooseUiLang} />
        <div className="m-label">{t.theme}</div>
        <Segmented name={t.theme} value={s.theme} options={THEMES} onChange={chooseTheme}
          label={(th) => <><Icon name={THEME_ICON[th]} size={16} /><span className="sr-only">{t.themes[th]}</span></>} />
        {timeline.range && (
          <button type="button" className="m-menu-btn" aria-pressed={!!s.time} onClick={() => { timeline.toggle(); onClose(); }}>
            <Icon name="clock" />
            {t.timeOn}
            <span className="m-menu-aside tabular">{s.time ?? t.timeOff}</span>
          </button>
        )}
        <button type="button" className="m-menu-btn" onClick={onAbout}>
          <Icon name="info" />
          {t.about}
        </button>
      </div>
    </>
  );
}

/** The time slider over the bottom of the graph. */
function TimeStrip() {
  const t = useT();
  const { range, min, max, time, playing, value, setDay, togglePlay } = useTimeline();
  if (!range || !time) return null;
  return (
    <div className="m-time">
      <button type="button" className="m-play" aria-label={playing ? t.pause : t.play} onClick={togglePlay}>
        <Icon name={playing ? "pause" : "play"} size={16} />
      </button>
      <input
        type="range" min={min} max={max} step={1} value={value} aria-label={t.time} aria-valuetext={time}
        onChange={(e) => setDay(Number(e.target.value))}
      />
      <span className="m-time-date tabular">{time}</span>
    </div>
  );
}

/**
 * The graph pane's height: one of three snaps, or wherever the handle is being dragged. A tap
 * on the handle steps to the next snap; the arrow keys move between them.
 */
function useSplit() {
  const root = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(() => window.innerHeight);
  const [snap, setSnap] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; from: number; moved: boolean; at: number } | null>(null);

  useLayoutEffect(() => {
    const el = root.current!;
    const ro = new ResizeObserver(() => setTotal(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snaps = SNAPS.map((f) => Math.round(total * f));
  const height = drag ?? snaps[snap];
  const nearest = (h: number) => snaps.reduce((best, v, i) => (Math.abs(v - h) < Math.abs(snaps[best] - h) ? i : best), 0);
  const end = (cycle: boolean) => {
    const st = start.current;
    if (!st) return;
    start.current = null;
    setDrag(null);
    if (st.moved) setSnap(nearest(st.at));
    else if (cycle) setSnap((snap + 1) % snaps.length);
  };

  const handle = {
    role: "separator",
    "aria-orientation": "horizontal" as const,
    "aria-valuemin": 0,
    "aria-valuemax": snaps.length - 1,
    "aria-valuenow": snap,
    tabIndex: 0,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { y: e.clientY, from: height, moved: false, at: height };
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const st = start.current;
      if (!st) return;
      const dy = e.clientY - st.y;
      if (Math.abs(dy) > 4) st.moved = true;
      if (!st.moved) return;
      st.at = Math.max(snaps[0] - 40, Math.min(snaps[snaps.length - 1] + 20, st.from + dy));
      setDrag(st.at);
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowUp") setSnap(Math.max(0, snap - 1));
      else if (e.key === "ArrowDown") setSnap(Math.min(snaps.length - 1, snap + 1));
      else if (e.key === "Enter" || e.key === " ") setSnap((snap + 1) % snaps.length);
      else return;
      e.preventDefault();
    },
  };
  return { root, height, dragging: drag !== null, handle };
}
