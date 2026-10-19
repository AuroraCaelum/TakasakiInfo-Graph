import { Fragment } from "react";

import { useModel, useT } from "../context";
import { Icon } from "../icons";
import type { PathResult } from "../lib/analysis";
import { useApp } from "../store";
import { NodeLink } from "./common";
import { SearchBox } from "./SearchBox";

export function PathPanel({ path }: { path: PathResult | null }) {
  const t = useT();
  const model = useModel();
  const s = useApp();
  if (!s.pathOn || !s.selected) return null;

  const relationOf = (edge: string) => {
    const facts = model.graph.getEdgeAttribute(edge, "facts");
    return facts.map((f) => t.rel[f.r]).join(" · ");
  };

  return (
    <div className="path-panel" role="region" aria-label={t.pathTitle}>
      <header className="path-head">
        <Icon name="route" size={16} />
        <strong>{t.pathTitle}</strong>
        <button type="button" className="icon-btn small" aria-label={t.close} onClick={() => s.set({ pathOn: false, pathTo: null })}>
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="path-ends">
        <span className="muted">{t.pathFrom}</span>
        <NodeLink k={s.selected} />
        <span className="muted">{t.pathTo}</span>
        {s.pathTo ? (
          <span className="path-to">
            <NodeLink k={s.pathTo} plain />
            <button type="button" className="icon-btn small" aria-label={t.swap} title={t.swap}
              onClick={() => { const from = s.selected!; s.select(s.pathTo); s.set({ pathOn: true, pathTo: from }); }}>
              <Icon name="swap" size={14} />
            </button>
            <button type="button" className="icon-btn small" aria-label={t.close} onClick={() => s.set({ pathTo: null })}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ) : (
          <SearchBox placeholder={t.pathPick} autoFocus onPick={(k) => s.set({ pathTo: k === s.selected ? null : k })} />
        )}
      </div>
      <label className="check small">
        <input type="checkbox" checked={s.pathHubs} onChange={() => s.set({ pathHubs: !s.pathHubs })} />
        <span className="check-label">{t.pathViaHubs}</span>
      </label>
      {s.pathTo && (path ? (
        <div className="path-result">
          <div className="muted">{t.pathSteps(path.edges.length)}</div>
          <ol className="path-chain">
            {path.nodes.map((k, i) => (
              <Fragment key={k}>
                <li><NodeLink k={k} /></li>
                {i < path.edges.length && <li className="path-rel">{relationOf(path.edges[i])}</li>}
              </Fragment>
            ))}
          </ol>
        </div>
      ) : (
        <p className="hint">{t.pathNone}</p>
      ))}
      <p className="hint">{t.pathHint}</p>
    </div>
  );
}
