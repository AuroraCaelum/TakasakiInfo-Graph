import type { GNode } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { TypeIcon } from "../icons";
import { nameOf, otherNames } from "../lib/names";
import type { EdgeAttrs } from "../model";
import { useApp } from "../store";
import { subtypeLabel } from "../ui/labels";

function place(x: number, y: number) {
  return { left: x + 14, top: y + 14 };
}

export function NodeTip({ node, x, y }: { node: GNode; x: number; y: number }) {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const lang = useApp((s) => s.nameLang);
  const other = otherNames(node.n, lang).slice(0, 1);
  const sub = subtypeLabel(t, node);
  const projects = node.p.map((id) => nameOf(model.nodes.get(`project:${id}`)?.n, lang, id));
  return (
    <div className="tip" style={place(x, y)} role="tooltip">
      <div className="tip-type">
        <TypeIcon type={node.t} sub={node.s} size={14} style={{ color: p.type[node.t] }} />
        <span>{t.types[node.t]}</span>
        {sub && <span className="muted">· {sub}</span>}
      </div>
      <div className="tip-name">{nameOf(node.n, lang, node.k)}</div>
      {other.map((o) => <div key={o.lang} className="tip-sub">{o.text}</div>)}
      <div className="tip-meta">
        {node.d && <span>{node.d}</span>}
        {projects.length > 0 && node.t !== "project" && <span>{projects.slice(0, 3).join(", ")}{projects.length > 3 ? ` +${projects.length - 3}` : ""}</span>}
      </div>
    </div>
  );
}

export function EdgeTip({ attrs, x, y }: { attrs: EdgeAttrs; x: number; y: number }) {
  const t = useT();
  return (
    <div className="tip" style={place(x, y)} role="tooltip">
      {attrs.facts.map((f) => (
        <div key={f.r} className="tip-edge">
          <span className={attrs.derived ? "swatch-derived" : "swatch-fact"} aria-hidden="true" />
          <span>{t.rel[f.r]}</span>
          <span className="muted tabular">{f.w}</span>
        </div>
      ))}
    </div>
  );
}
