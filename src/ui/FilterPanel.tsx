import { useEffect, useState } from "react";

import { DERIVED_RELATIONS, FACT_RELATIONS, MOODS, NODE_TYPES, type NodeType, type Relation } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { audioFilterOn, BPM_LIMIT, parseBpm } from "../lib/audio";
import { useApp } from "../store";
import type { ColorBy } from "../view";
import { useProjectName } from "./common";

export const COLOR_MODES: ColorBy[] = ["type", "project", "community"];

/** Filter toggles shared by the side panel and the phone's filter sheet. */
export function useFilterToggles() {
  const model = useModel();
  const s = useApp();
  return {
    toggleType: (type: NodeType) => s.set({ types: { ...s.types, [type]: !s.types[type] } }),
    toggleRel: (r: Relation) => s.set({ relations: { ...s.relations, [r]: !s.relations[r] } }),
    projectOn: (id: string) => !s.projects || s.projects.includes(id),
    toggleProject: (id: string) => {
      const cur = s.projects ?? model.projects;
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      s.set({ projects: next.length === model.projects.length ? null : next });
    },
    /** works that are drama tracks and BGM cues, which have their own toggles */
    dramaCount: model.list.filter((n) => n.t === "work" && n.s === "drama").length,
    bgmCount: model.list.filter((n) => n.t === "work" && n.s === "bgm").length,
    toggleMood: (m: string) => s.set({ moods: s.moods.includes(m) ? s.moods.filter((x) => x !== m) : [...s.moods, m] }),
    clearAudio: () => s.set({ moods: [], bpm: [null, null] }),
    audioOn: audioFilterOn(s),
    /** works whose representative recording has a key or tempo, and those with each mood label */
    audioCount: model.list.filter((n) => n.t === "work" && (n.au?.key || n.au?.bpm)).length,
    moodCount: (m: string) => model.list.filter((n) => n.t === "work" && n.au?.mood?.includes(m)).length,
  };
}

/** One bound of the BPM filter. The text is the viewer's while they type; the filter takes it once it is a valid BPM or empty. */
function BpmInput({ which, className }: { which: 0 | 1; className: string }) {
  const t = useT();
  const bpm = useApp((s) => s.bpm);
  const set = useApp((s) => s.set);
  const value = bpm[which];
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => { setText(value === null ? "" : String(value)); }, [value]);
  const label = which === 0 ? t.bpmMin : t.bpmMax;
  return (
    <input
      type="number" inputMode="numeric" min={1} max={BPM_LIMIT} step={1} className={className} value={text} placeholder={label}
      aria-label={`${t.bpmRange}: ${label}`}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.value.trim() === "" ? null : parseBpm(e.target.value);
        if (n !== null || e.target.value.trim() === "") {
          const next: [number | null, number | null] = [...bpm];
          next[which] = n;
          set({ bpm: next });
        }
      }}
    />
  );
}

/** The BPM filter's two bounds, `min – max`. */
export function BpmRange({ inputClass }: { inputClass: string }) {
  const t = useT();
  return (
    <div className="bpm-range" role="group" aria-label={t.bpmRange}>
      <BpmInput which={0} className={inputClass} />
      <span className="muted" aria-hidden="true">–</span>
      <BpmInput which={1} className={inputClass} />
      <span className="muted small">BPM</span>
    </div>
  );
}

export function FilterPanel() {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const s = useApp();
  const projectName = useProjectName();
  const counts = model.meta.counts;
  const { toggleType, toggleRel, projectOn, toggleProject, dramaCount, bgmCount, toggleMood, clearAudio, audioOn, audioCount, moodCount } = useFilterToggles();

  return (
    <aside className={`filters${s.filtersOpen ? " open" : ""}`} aria-label={t.filters}>
      <header className="panel-head">
        <h2>{t.filters}</h2>
        <button type="button" className="text-btn" onClick={s.resetFilters}>{t.reset}</button>
        <button type="button" className="icon-btn only-narrow" aria-label={t.close} onClick={() => s.set({ filtersOpen: false })}>
          <Icon name="close" />
        </button>
      </header>

      <div className="filters-body">
        <section className="fs">
          <h3 className="fs-title">{t.colorBy}</h3>
          <div className="segmented wide" role="radiogroup">
            {COLOR_MODES.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={s.colorBy === m} className={s.colorBy === m ? "on" : ""} onClick={() => s.set({ colorBy: m })}>
                {t.colorModes[m]}
              </button>
            ))}
          </div>
        </section>

        <section className="fs">
          <h3 className="fs-title">{t.nodeTypes}</h3>
          {NODE_TYPES.map((type) => (
            <div key={type}>
              <label className="check">
                <input type="checkbox" checked={s.types[type]} onChange={() => toggleType(type)} />
                <TypeIcon type={type} size={15} style={{ color: p.type[type] }} />
                <span className="check-label">{t.types[type]}</span>
                <span className="count">{(counts[type] ?? 0).toLocaleString()}</span>
              </label>
              {type === "work" && (
                <>
                  <label className="check sub">
                    <input type="checkbox" checked={s.bgm} disabled={!s.types.work} onChange={() => s.set({ bgm: !s.bgm })} />
                    <TypeIcon type="work" sub="bgm" size={15} style={{ color: p.type.work }} />
                    <span className="check-label">{t.includeBgm}</span>
                    <span className="count">{bgmCount.toLocaleString()}</span>
                  </label>
                  <label className="check sub">
                    <input type="checkbox" checked={s.drama} disabled={!s.types.work} onChange={() => s.set({ drama: !s.drama })} />
                    <span className="check-label">{t.includeDrama}</span>
                    <span className="count">{dramaCount.toLocaleString()}</span>
                  </label>
                </>
              )}
            </div>
          ))}
        </section>

        <section className="fs">
          <h3 className="fs-title">
            {t.audioFilter}
            {audioOn && (
              <span className="legend-actions">
                <button type="button" className="text-btn" onClick={clearAudio}>{t.clear}</button>
              </span>
            )}
          </h3>
          <p className="hint">{t.audioFilterHint(audioCount)}</p>
          {MOODS.map((m) => (
            <label key={m} className="check">
              <input type="checkbox" checked={s.moods.includes(m)} disabled={!s.types.work} onChange={() => toggleMood(m)} />
              <span className="check-label">{t.moods[m]}</span>
              <span className="count">{moodCount(m).toLocaleString()}</span>
            </label>
          ))}
          <p className="hint">{t.moodAxisHint}</p>
          <BpmRange inputClass="num-input" />
        </section>

        <section className="fs">
          <h3 className="fs-title">
            {t.projects}
            <span className="legend-actions">
              <button type="button" className="text-btn" onClick={() => s.set({ projects: null })}>{t.all}</button>
              <button type="button" className="text-btn" onClick={() => s.set({ projects: [] })}>{t.none}</button>
            </span>
          </h3>
          {model.projects.map((id) => (
            <label key={id} className="check">
              <input type="checkbox" checked={projectOn(id)} onChange={() => toggleProject(id)} />
              <span className="check-label">{projectName(id)}</span>
              <span className="count">{(model.projectCounts[id] ?? 0).toLocaleString()}</span>
              <button type="button" className="text-btn only-btn" onClick={(e) => { e.preventDefault(); s.set({ projects: [id] }); }}>{t.only}</button>
            </label>
          ))}
        </section>

        <section className="fs">
          <h3 className="fs-title">{t.relations}</h3>
          {FACT_RELATIONS.map((r) => (
            <label key={r} className="check" title={t.relWeight[r]}>
              <input type="checkbox" checked={s.relations[r]} onChange={() => toggleRel(r)} />
              <span className="swatch-fact" aria-hidden="true" />
              <span className="check-label">{t.rel[r]}</span>
              <span className="count">{(counts[`edge:${r}`] ?? 0).toLocaleString()}</span>
            </label>
          ))}
        </section>

        <section className="fs">
          <h3 className="fs-title">{t.derived}</h3>
          <p className="hint">{t.derivedHint}</p>
          {DERIVED_RELATIONS.map((r) => (
            <label key={r} className="check" title={t.relWeight[r]}>
              <input type="checkbox" checked={s.relations[r]} onChange={() => toggleRel(r)} />
              <span className="swatch-derived" aria-hidden="true" />
              <span className="check-label">{t.rel[r]}</span>
              <span className="count">{(counts[`edge:${r}`] ?? 0).toLocaleString()}</span>
            </label>
          ))}
          <ul className="rule-list">
            {DERIVED_RELATIONS.map((r) => <li key={r}><strong>{t.rel[r]}</strong>: {t.relWeight[r]}</li>)}
          </ul>
        </section>

        <section className="fs">
          <label className="check">
            <input type="checkbox" checked={s.hideIsolated} onChange={() => s.set({ hideIsolated: !s.hideIsolated })} />
            <span className="check-label">{t.hideIsolated}</span>
          </label>
        </section>
      </div>
    </aside>
  );
}
