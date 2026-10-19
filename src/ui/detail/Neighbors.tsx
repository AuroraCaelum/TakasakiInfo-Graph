import { useMemo, useState } from "react";

import { isDerived, type GNode } from "../../../shared/graph";
import { useModel, useT } from "../../context";
import { neighborsByRelation, type NeighborFact } from "../../lib/neighbors";
import { Bar, More, NodeLink, PeriodText, Section } from "../common";

export function NeighborsTab({ node }: { node: GNode }) {
  const t = useT();
  const model = useModel();
  const groups = useMemo(() => neighborsByRelation(model, node.k), [model, node.k]);
  const total = groups.reduce((s, [, list]) => s + list.length, 0);
  return (
    <>
      <p className="hint">{t.neighborsHint} · {total.toLocaleString()}</p>
      {groups.map(([r, list]) => {
        const max = Math.max(...list.map((f) => f.w));
        return (
          <Section key={r} title={<>{isDerived(r) && <span className="swatch-derived" aria-hidden="true" />}{t.rel[r]} <span className="count">{list.length}</span></>} hint={`${t.weight}: ${t.relWeight[r]}`}>
            <ul className="neighbor-list">
              <More items={list} n={20} render={(f) => <NeighborRow key={f.k} f={f} max={max} />} />
            </ul>
          </Section>
        );
      })}
    </>
  );
}

function NeighborRow({ f, max }: { f: NeighborFact; max: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <li className="neighbor">
      <div className="neighbor-main">
        <NodeLink k={f.k} />
        <span className="neighbor-meta">
          {f.pd ? f.pd.map((p, i) => <PeriodText key={i} period={p} />) : f.d ? <span className="muted tabular">{f.d}</span> : null}
        </span>
        <span className="neighbor-weight">
          <Bar value={f.w} max={max} />
          <span className="tabular">{f.w}</span>
        </span>
      </div>
      {f.via && (
        <div className="via">
          <button type="button" className="text-btn small" aria-expanded={open} onClick={() => setOpen(!open)}>{t.viaN(f.via.length)}</button>
          {open && <span className="chips">{f.via.map((k) => <NodeLink key={k} k={k} plain />)}</span>}
        </div>
      )}
    </li>
  );
}
