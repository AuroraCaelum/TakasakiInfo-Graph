import { DERIVED_RELATIONS, FACT_RELATIONS, NODE_TYPES, type Relation } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { useApp } from "../store";
import type { ColorBy } from "../view";
import { useProjectName } from "./common";

const COLOR_MODES: ColorBy[] = ["type", "project", "community"];

export function FilterPanel() {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const s = useApp();
  const projectName = useProjectName();
  const counts = model.meta.counts;
  const dramaCount = model.list.filter((n) => n.t === "work" && n.s === "drama").length;

  const toggleRel = (r: Relation) => s.set({ relations: { ...s.relations, [r]: !s.relations[r] } });
  const projectOn = (id: string) => !s.projects || s.projects.includes(id);
  const toggleProject = (id: string) => {
    const cur = s.projects ?? model.projects;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    s.set({ projects: next.length === model.projects.length ? null : next });
  };

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
                <input type="checkbox" checked={s.types[type]} onChange={() => s.set({ types: { ...s.types, [type]: !s.types[type] } })} />
                <TypeIcon type={type} size={15} style={{ color: p.type[type] }} />
                <span className="check-label">{t.types[type]}</span>
                <span className="count">{(counts[type] ?? 0).toLocaleString()}</span>
              </label>
              {type === "work" && (
                <label className="check sub">
                  <input type="checkbox" checked={s.drama} disabled={!s.types.work} onChange={() => s.set({ drama: !s.drama })} />
                  <span className="check-label">{t.includeDrama}</span>
                  <span className="count">{dramaCount.toLocaleString()}</span>
                </label>
              )}
            </div>
          ))}
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
