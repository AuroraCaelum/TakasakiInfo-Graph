import { useMemo, useState } from "react";

import { NODE_TYPES, type GNode, type NodeType } from "../../../shared/graph";
import { useModel, usePalette, useT } from "../../context";
import { TypeIcon } from "../../icons";
import { directStrength, personalizedPageRank, similarNodes } from "../../lib/analysis";
import type { MetricName } from "../../model";
import { useApp } from "../../store";
import { Bar, NodeLink, Section } from "../common";

export function RelatedTab({ node }: { node: GNode }) {
  const t = useT();
  const model = useModel();
  const direct = useMemo(() => directStrength(model, node.k), [model, node.k]);
  const ppr = useMemo(() => personalizedPageRank(model, node.k), [model, node.k]);
  const similar = useMemo(() => similarNodes(model, node.k, 10), [model, node.k]);
  const neighbors = useMemo(() => new Set(direct.map((d) => d.k)), [direct]);

  return (
    <>
      <Centrality node={node} />

      <Section title={t.direct} hint={t.directHint}>
        {direct.length ? (
          <ol className="score-list">
            {direct.slice(0, 10).map((d) => (
              <li key={d.k}>
                <NodeLink k={d.k} />
                <span className="score"><Bar value={d.score} max={direct[0].score} /><span className="tabular">{d.score}</span></span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">{t.noneFound}</p>}
      </Section>

      <Indirect ppr={ppr} neighbors={neighbors} />

      <Section title={t.similar} hint={t.similarHint}>
        {similar.length ? (
          <ol className="score-list">
            {similar.map((s) => <SimilarRow key={s.k} k={s.k} jaccard={s.jaccard} aa={s.adamicAdar} shared={s.shared} max={similar[0].jaccard} />)}
          </ol>
        ) : <p className="muted">{t.noneFound}</p>}
      </Section>
    </>
  );
}

function Centrality({ node }: { node: GNode }) {
  const t = useT();
  const model = useModel();
  const set = useApp((s) => s.set);
  const community = model.communities[node.m.cm];
  const total = model.list.length;
  const inType = model.typeCounts[node.t];
  const rows: { metric: MetricName; label: string; value: string }[] = [
    { metric: "deg", label: t.degree, value: node.m.deg.toLocaleString() },
    { metric: "wdeg", label: t.wdegree, value: node.m.wdeg.toLocaleString() },
    { metric: "pr", label: t.pagerank, value: (node.m.pr * 1000).toFixed(2) + "‰" },
    { metric: "bc", label: t.betweenness, value: node.m.bc.toFixed(4) },
  ];
  return (
    <Section title={t.centrality} hint={t.centralityHint}>
      <table className="table metrics">
        <tbody>
          {rows.map((r) => {
            const rank = model.ranks[r.metric].get(node.k)!;
            return (
              <tr key={r.metric}>
                <th scope="row">{r.label}</th>
                <td className="tabular">{r.value}</td>
                <td>
                  <div>{t.rankIn(rank.inType, inType, t.types[node.t])}</div>
                  <div className="muted small">{t.rankAll(rank.overall, total)} · {t.topPercent((100 * rank.overall) / total)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {community && (
        <div className="community">
          <button type="button" className="text-btn" onClick={() => set({ colorBy: "community" })}>{t.communityN(community.id, community.size)}</button>
          <span className="chips">{community.top.map((k) => <NodeLink key={k} k={k} plain />)}</span>
        </div>
      )}
    </Section>
  );
}

function Indirect({ ppr, neighbors }: { ppr: { k: string; score: number }[]; neighbors: Set<string> }) {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const [type, setType] = useState<NodeType | null>(null);
  const present = NODE_TYPES.filter((nt) => nt !== "project" && ppr.some((x) => model.nodes.get(x.k)?.t === nt));
  const list = ppr.filter((x) => model.nodes.get(x.k)?.t !== "project" && (!type || model.nodes.get(x.k)?.t === type)).slice(0, 15);
  return (
    <Section title={t.indirect} hint={t.indirectHint}>
      <div className="type-chips" role="radiogroup">
        <button type="button" role="radio" aria-checked={!type} className={!type ? "on" : ""} onClick={() => setType(null)}>{t.all}</button>
        {present.map((nt) => (
          <button key={nt} type="button" role="radio" aria-checked={type === nt} className={type === nt ? "on" : ""} onClick={() => setType(nt)} title={t.types[nt]}>
            <TypeIcon type={nt} size={13} style={{ color: p.type[nt] }} /> {t.types[nt]}
          </button>
        ))}
      </div>
      {list.length ? (
        <ol className="score-list">
          {list.map((x) => (
            <li key={x.k}>
              <NodeLink k={x.k}>{neighbors.has(x.k) && <span className="badge badge-muted">{t.directBadge}</span>}</NodeLink>
              <span className="score"><Bar value={x.score} max={list[0].score} /><span className="tabular">{(x.score * 100).toFixed(2)}</span></span>
            </li>
          ))}
        </ol>
      ) : <p className="muted">{t.noneFound}</p>}
    </Section>
  );
}

function SimilarRow({ k, jaccard, aa, shared, max }: { k: string; jaccard: number; aa: number; shared: string[]; max: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <li className="similar">
      <div className="similar-main">
        <NodeLink k={k} />
        <span className="score">
          <Bar value={jaccard} max={max} />
          <span className="tabular" title={`Jaccard ${jaccard.toFixed(3)} · Adamic-Adar ${aa.toFixed(2)}`}>{(jaccard * 100).toFixed(0)}%</span>
        </span>
      </div>
      <button type="button" className="text-btn small" aria-expanded={open} onClick={() => setOpen(!open)}>{t.sharedNeighbors(shared.length)}</button>
      {open && <span className="chips">{shared.map((s) => <NodeLink key={s} k={s} plain />)}</span>}
    </li>
  );
}
