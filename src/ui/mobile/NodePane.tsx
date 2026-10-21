import { DERIVED_RELATIONS } from "../../../shared/graph";
import { useDetail, useNode, usePalette, useT } from "../../context";
import { Icon, TypeIcon } from "../../icons";
import { nameOf, otherNames } from "../../lib/names";
import { nodePasses, type Visible } from "../../lib/visibility";
import { useApp } from "../../store";
import { Badge } from "../common";
import { DataTab } from "../detail/DataTab";
import { NeighborsTab } from "../detail/Neighbors";
import { OverviewTab } from "../detail/Overview";
import { RelatedTab } from "../detail/Related";
import { subtypeLabel } from "../labels";
import { useLegendEntries } from "../Legend";
import { Segmented, TypeDot } from "./parts";

const DEPTHS = [1, 2, 3] as const;

/** The selected node under the graph: its name and actions, then the tab the bottom bar picks. */
export function NodePane({ onPath, onCopied }: { onPath: () => void; onCopied: () => void }) {
  const t = useT();
  const s = useApp();
  const node = useNode(s.selected);
  const { detail, error } = useDetail(s.selected);
  if (!node) return null;

  const name = nameOf(node.n, s.nameLang, node.k);
  const sub = subtypeLabel(t, node);
  const hidden = !nodePasses(node, { ...s, selected: null });
  const copy = () => navigator.clipboard?.writeText(window.location.href).then(onCopied, () => undefined);

  return (
    <article className="m-node" aria-label={name}>
      <header className="m-node-head">
        <div className="m-node-type">
          <TypeDot type={node.t} sub={node.s} size={24} />
          <span>{t.types[node.t]}</span>
          {sub && <Badge>{sub}</Badge>}
        </div>
        <h2 className="m-node-title">{name}</h2>
        <div className="m-node-other">
          {otherNames(node.n, s.nameLang).map((o) => <span key={o.lang} lang={o.lang === "rom" ? "en" : o.lang === "kana" ? "ja" : o.lang}>{o.text}</span>)}
        </div>
        <button type="button" className="m-round m-node-close" aria-label={t.close} onClick={() => s.select(null)}>
          <Icon name="close" />
        </button>
        <div className="m-actions">
          <button type="button" className={`m-pill${s.focus ? " on" : ""}`} aria-pressed={!!s.focus}
            onClick={() => s.set({ focus: s.focus ? 0 : 1, pathOn: false })}>
            <Icon name="focus" size={17} /> {s.focus ? t.focusExit : t.focus}
          </button>
          {s.focus > 0 && (
            <Segmented round name={t.depth} value={s.focus as (typeof DEPTHS)[number]} options={DEPTHS} label={(d) => d} onChange={(d) => s.set({ focus: d })} />
          )}
          <button type="button" className="m-pill" onClick={onPath}>
            <Icon name="route" size={17} /> {t.pathShort}
          </button>
          <button type="button" className="m-round m-outline" aria-label={t.copyLink} title={t.copyLink} onClick={copy}>
            <Icon name="link" size={17} />
          </button>
        </div>
      </header>

      {hidden && <p className="notice">{t.hidden}</p>}

      <div className="m-detail" role="tabpanel" aria-label={t.tabs[s.tab]}>
        {error && <p className="notice">{t.loadError}</p>}
        {s.tab === "overview" && <OverviewTab node={node} detail={detail} />}
        {s.tab === "data" && (detail ? <DataTab node={node} detail={detail} /> : !error && <p className="muted">{t.loading}</p>)}
        {s.tab === "neighbors" && <NeighborsTab node={node} />}
        {s.tab === "related" && <RelatedTab node={node} />}
      </div>
    </article>
  );
}

/** Before anything is selected: how to start, and what the colors mean. */
export function Welcome({ visible }: { visible: Visible }) {
  const t = useT();
  const p = usePalette();
  const colorBy = useApp((s) => s.colorBy);
  const derivedOn = useApp((s) => DERIVED_RELATIONS.some((r) => s.relations[r]));
  const entries = useLegendEntries();
  return (
    <div className="m-welcome">
      <h2>{t.tapNode}</h2>
      <p>{t.tapNodeHint}</p>
      <h3>{t.legend}</h3>
      <ul className={`m-legend${colorBy === "type" ? " types" : ""}`}>
        {entries.map((e) => (
          <li key={e.id} className={e.off ? "off" : ""}>
            <span className="m-dot" style={{ width: 24, height: 24, background: e.color }} aria-hidden="true">
              {e.icon && <TypeIcon type={e.icon} size={13} style={{ color: p.picto[e.icon] }} strokeWidth={2.6} />}
            </span>
            <span className="m-legend-label">{e.label}</span>
          </li>
        ))}
      </ul>
      <p className="m-legend-foot">
        <span><span className="swatch-fact" aria-hidden="true" /> {t.legendFact}</span>
        {derivedOn && <span><span className="swatch-derived" aria-hidden="true" /> {t.legendDerived}</span>}
        <span>{t.legendSize}</span>
      </p>
      <p className="m-legend-foot tabular">{t.shown(visible.nodes.size, visible.edges.size)}</p>
    </div>
  );
}
