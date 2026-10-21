import { DERIVED_RELATIONS, FACT_RELATIONS, NODE_TYPES } from "../../../shared/graph";
import { useModel, usePalette, useT } from "../../context";
import { Icon } from "../../icons";
import type { Visible } from "../../lib/visibility";
import { useApp } from "../../store";
import { useProjectName } from "../common";
import { COLOR_MODES, useFilterToggles } from "../FilterPanel";
import { Segmented, SwitchRow, TypeDot } from "./parts";

/** Every filter of the side panel, as a sheet with touch-sized controls. */
export function FilterSheet({ visible, onClose }: { visible: Visible; onClose: () => void }) {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const s = useApp();
  const projectName = useProjectName();
  const counts = model.meta.counts;
  const { toggleType, toggleRel, projectOn, toggleProject, dramaCount, bgmCount } = useFilterToggles();

  return (
    <>
      <div className="m-scrim" onClick={onClose} />
      <div className="m-filters" role="dialog" aria-modal="true" aria-labelledby="m-filters-title">
        <header className="m-filters-head">
          <h2 id="m-filters-title">{t.filters}</h2>
          <button type="button" className="m-text-btn" onClick={s.resetFilters}>{t.reset}</button>
          <button type="button" className="m-round" aria-label={t.close} onClick={onClose}><Icon name="close" /></button>
        </header>

        <div className="m-filters-body">
          <h3 className="m-label">{t.colorBy}</h3>
          <Segmented name={t.colorBy} value={s.colorBy} options={COLOR_MODES} label={(m) => t.colorModes[m]} onChange={(m) => s.set({ colorBy: m })} />

          <h3 className="m-label">{t.nodeTypes}</h3>
          <div className="m-type-grid">
            {NODE_TYPES.map((type) => (
              <button
                key={type} type="button" role="checkbox" aria-checked={s.types[type]} className={`m-type${s.types[type] ? " on" : ""}`}
                style={{ borderColor: s.types[type] ? p.type[type] : undefined }} onClick={() => toggleType(type)}
              >
                <TypeDot type={type} size={28} color={s.types[type] ? undefined : "var(--baseline)"} />
                <span className="m-type-text">
                  <span className="m-type-name">{t.types[type]}</span>
                  <span className="m-type-count tabular">{(counts[type] ?? 0).toLocaleString()}</span>
                </span>
              </button>
            ))}
          </div>
          <SwitchRow on={s.bgm} disabled={!s.types.work} onChange={() => s.set({ bgm: !s.bgm })} label={t.includeBgm} count={bgmCount}
            lead={<TypeDot type="work" sub="bgm" size={24} />} />
          <SwitchRow on={s.drama} disabled={!s.types.work} onChange={() => s.set({ drama: !s.drama })} label={t.includeDrama} count={dramaCount}
            lead={<TypeDot type="work" size={24} />} />

          <h3 className="m-label">
            {t.projects}
            <span className="m-label-actions">
              <button type="button" className="m-text-btn" onClick={() => s.set({ projects: null })}>{t.all}</button>
              <button type="button" className="m-text-btn" onClick={() => s.set({ projects: [] })}>{t.none}</button>
            </span>
          </h3>
          <div className="m-chips">
            {model.projects.map((id) => (
              <button key={id} type="button" role="checkbox" aria-checked={projectOn(id)} className={`m-chip${projectOn(id) ? " on" : ""}`} onClick={() => toggleProject(id)}>
                {projectName(id)}
              </button>
            ))}
          </div>

          <h3 className="m-label">{t.relations}</h3>
          {FACT_RELATIONS.map((r) => (
            <SwitchRow key={r} on={s.relations[r]} onChange={() => toggleRel(r)} label={t.rel[r]} count={counts[`edge:${r}`] ?? 0}
              lead={<span className="swatch-fact" aria-hidden="true" />} />
          ))}

          <h3 className="m-label">{t.derived}</h3>
          <p className="m-hint">{t.derivedHint}</p>
          {DERIVED_RELATIONS.map((r) => (
            <SwitchRow key={r} on={s.relations[r]} onChange={() => toggleRel(r)} label={t.rel[r]} hint={t.relWeight[r]} count={counts[`edge:${r}`] ?? 0}
              lead={<span className="swatch-derived" aria-hidden="true" />} />
          ))}

          <SwitchRow plain on={s.hideIsolated} onChange={() => s.set({ hideIsolated: !s.hideIsolated })} label={t.hideIsolated} />
        </div>

        <footer className="m-filters-foot">
          <button type="button" className="m-apply" onClick={onClose}>{t.showNodes(visible.nodes.size)}</button>
        </footer>
      </div>
    </>
  );
}
