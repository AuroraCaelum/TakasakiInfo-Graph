/**
 * The live ForceAtlas2's options, as in Gephi's panel: a floating panel beside the zoom buttons on
 * wide screens, and the body of the phone's settings pane. A change re-runs the layout from
 * where the nodes are.
 */

import { useId } from "react";

import { isDefaultFa2, type Fa2Options } from "../../shared/layout";
import { useT } from "../context";
import { Icon } from "../icons";
import { chooseFa2, useApp } from "../store";
import { SwitchRow } from "./mobile/parts";

type Fa2Toggle = { [K in keyof Fa2Options]: Fa2Options[K] extends boolean ? K : never }[keyof Fa2Options];
type Fa2Amount = Exclude<keyof Fa2Options, Fa2Toggle>;

interface Scale {
  min: number;
  max: number;
  /** a log scale, where the useful values span orders of magnitude */
  log?: boolean;
  step?: number;
}

const FA2_TOGGLES: Fa2Toggle[] = ["linLog", "dissuadeHubs", "strongGravity", "approximate"];
const FA2_AMOUNTS: [Fa2Amount, Scale][] = [
  ["scaling", { min: 0.5, max: 50, log: true }],
  ["gravity", { min: 0.005, max: 5, log: true }],
  ["edgeWeightInfluence", { min: 0, max: 2, step: 0.1 }],
];
const LOG_STEPS = 200;

/** Two significant digits: the values a log slider lands on stay short. */
const round2 = (x: number) => Number(x.toPrecision(2));

function Amount({ label, hint, value, scale, onChange }: {
  label: string; hint: string; value: number; scale: Scale; onChange: (v: number) => void;
}) {
  const id = useId();
  const { min, max, log, step = 1 } = scale;
  const pos = log ? Math.round((LOG_STEPS * Math.log(Math.max(value, min) / min)) / Math.log(max / min)) : value;
  const toValue = (p: number) => (log ? round2(min * (max / min) ** (p / LOG_STEPS)) : Number((Math.round(p / step) * step).toFixed(2)));
  return (
    <div className="fa2-amount">
      <label className="fa2-amount-head" htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id} className="tabular">{value}</output>
      </label>
      <input
        id={id} type="range" min={log ? 0 : min} max={log ? LOG_STEPS : max} step={log ? 1 : step} value={pos}
        aria-valuetext={String(value)} onChange={(e) => onChange(toValue(Number(e.target.value)))}
      />
      <span className="fa2-hint">{hint}</span>
    </div>
  );
}

function Toggle({ phone, on, label, hint, onChange }: { phone: boolean; on: boolean; label: string; hint: string; onChange: () => void }) {
  if (phone) return <SwitchRow on={on} onChange={onChange} label={label} hint={hint} />;
  return (
    <label className="check fa2-check">
      <input type="checkbox" checked={on} onChange={onChange} />
      <span className="fa2-check-text">
        <span>{label}</span>
        <span className="fa2-hint">{hint}</span>
      </span>
    </label>
  );
}

export function LayoutSettings({ phone = false }: { phone?: boolean }) {
  const t = useT();
  const fa2 = useApp((s) => s.fa2);
  return (
    <div className={`fa2-settings${phone ? " phone" : ""}`}>
      {FA2_TOGGLES.map((k) => (
        <Toggle key={k} phone={phone} on={fa2[k]} label={t.fa2Options[k]} hint={t.fa2Hints[k]} onChange={() => chooseFa2({ [k]: !fa2[k] })} />
      ))}
      {FA2_AMOUNTS.map(([k, scale]) => (
        <Amount key={k} label={t.fa2Options[k]} hint={t.fa2Hints[k]} value={fa2[k]} scale={scale} onChange={(v) => chooseFa2({ [k]: v })} />
      ))}
    </div>
  );
}

/** "Defaults": shown only when something differs from them. */
export function ResetLayout({ className }: { className: string }) {
  const t = useT();
  const changed = useApp((s) => !isDefaultFa2(s.fa2));
  if (!changed) return null;
  return (
    <button type="button" className={className} onClick={() => chooseFa2(null)}>
      {t.layoutDefaults}
    </button>
  );
}

/** The wide-screen panel, beside the zoom buttons. */
export function LayoutSettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <div className="layout-panel" role="dialog" aria-label={t.layoutSettings}>
      <header className="panel-head">
        <h2>{t.layoutSettings}</h2>
        <ResetLayout className="text-btn" />
        <button type="button" className="icon-btn small" aria-label={t.close} onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="layout-panel-body">
        <LayoutSettings />
      </div>
    </div>
  );
}
