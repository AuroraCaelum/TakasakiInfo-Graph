import { useModel, useNode, useT } from "../../context";
import { Icon } from "../../icons";
import type { PathResult } from "../../lib/analysis";
import { nameOf } from "../../lib/names";
import { useApp } from "../../store";
import { SwitchRow, TypeDot } from "./parts";

/** The two ends of the path, over the graph where the top bar was. */
export function PathCard({ onPickTo }: { onPickTo: () => void }) {
  const t = useT();
  const s = useApp();
  const from = useNode(s.selected);
  const to = useNode(s.pathTo);
  const swap = () => {
    const start = s.selected!;
    s.select(s.pathTo);
    s.set({ pathOn: true, pathTo: start });
  };
  return (
    <div className="m-top m-path-card" role="region" aria-label={t.pathTitle}>
      <div className="m-end">
        <span className="m-end-label">{t.pathFrom}</span>
        {from && <TypeDot type={from.t} sub={from.s} size={22} />}
        <span className="m-end-name">{from && nameOf(from.n, s.nameLang, from.k)}</span>
      </div>
      <button type="button" className="m-end" onClick={onPickTo}>
        <span className="m-end-label">{t.pathTo}</span>
        {to ? (
          <>
            <TypeDot type={to.t} sub={to.s} size={22} />
            <span className="m-end-name">{nameOf(to.n, s.nameLang, to.k)}</span>
          </>
        ) : (
          <>
            <span className="m-dot empty" style={{ width: 22, height: 22 }} aria-hidden="true" />
            <span className="m-end-name placeholder">{t.pathPickShort}</span>
          </>
        )}
      </button>
      <button type="button" className="m-round m-swap" aria-label={t.swap} title={t.swap} disabled={!s.pathTo} onClick={swap}>
        <Icon name="swap" />
      </button>
      <button type="button" className="m-round m-path-close" aria-label={t.close} onClick={() => s.set({ pathOn: false })}>
        <Icon name="close" />
      </button>
    </div>
  );
}

/** The path, one step per row: a tap moves the graph to that node. */
export function PathPane({ path, step, onStep, onPickTo }: {
  path: PathResult | null;
  step: number | null;
  onStep: (i: number | null) => void;
  onPickTo: () => void;
}) {
  const t = useT();
  const model = useModel();
  const s = useApp();
  const relationOf = (edge: string) => model.graph.getEdgeAttribute(edge, "facts").map((f) => t.rel[f.r]).join(" · ");
  const status = path ? t.pathSteps(path.edges.length) : s.pathTo ? t.pathNoneShort : "";

  return (
    <div className="m-path" role="region" aria-label={t.pathTitle}>
      <div className="m-path-head">
        <Icon name="route" size={20} />
        <h2>{t.pathTitle}</h2>
        <span>{status}</span>
      </div>
      <SwitchRow plain on={s.pathHubs} onChange={() => s.set({ pathHubs: !s.pathHubs })} label={t.pathViaHubs} />
      {path && (
        <ol className="m-steps">
          {path.nodes.map((k, i) => {
            const n = model.nodes.get(k)!;
            return (
              <li key={k}>
                <button type="button" className={`m-step${step === i ? " on" : ""}`} aria-pressed={step === i} onClick={() => onStep(step === i ? null : i)}>
                  <TypeDot type={n.t} sub={n.s} size={30} />
                  <span className="m-step-text">
                    <span className="m-step-name">{nameOf(n.n, s.nameLang, k)}</span>
                    <span className="m-step-type">{t.types[n.t]}</span>
                  </span>
                </button>
                {i < path.edges.length && <div className="m-step-rel"><span aria-hidden="true" />{relationOf(path.edges[i])}</div>}
              </li>
            );
          })}
        </ol>
      )}
      {!s.pathTo && <button type="button" className="m-primary" onClick={onPickTo}>{t.pathPickShort}</button>}
      {s.pathTo && !path && <p className="m-note">{t.pathNone}</p>}
      <p className="m-note">{path ? t.pathStepHint : t.pathHint}</p>
    </div>
  );
}
