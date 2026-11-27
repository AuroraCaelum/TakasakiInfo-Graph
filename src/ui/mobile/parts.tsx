import type { ReactNode } from "react";

import type { NodeType } from "../../../shared/graph";
import { usePalette } from "../../context";
import { TypeIcon } from "../../icons";

/** A node type's pictogram on a disc of its color; `color` overrides the disc (an off filter). */
export function TypeDot({ type, sub, size, color }: { type: NodeType; sub?: string; size: number; color?: string }) {
  const p = usePalette();
  return (
    <span className="m-dot" style={{ width: size, height: size, background: color ?? p.type[type] }} aria-hidden="true">
      <TypeIcon type={type} sub={sub} size={Math.round(size * 0.52)} style={{ color: color ? "#fff" : p.picto[type] }} strokeWidth={2.6} />
    </span>
  );
}

/** One choice out of a few, as a row of buttons. */
export function Segmented<T extends string | number>({ value, options, label, onChange, name, round }: {
  value: T;
  options: readonly T[];
  label: (o: T) => ReactNode;
  onChange: (o: T) => void;
  name: string;
  /** the pill-shaped variant that sits among the node actions */
  round?: boolean;
}) {
  return (
    <div className={`m-seg${round ? " round" : ""}`} role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

/** A full-width row that turns something on or off. */
export function SwitchRow({ on, onChange, label, lead, count, hint, disabled, plain }: {
  on: boolean;
  onChange: () => void;
  label: ReactNode;
  lead?: ReactNode;
  count?: number;
  hint?: string;
  disabled?: boolean;
  /** without the rule below it */
  plain?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} className={`m-switch-row${plain ? " plain" : ""}`} onClick={onChange}>
      {lead}
      <span className="m-switch-text">
        <span>{label}</span>
        {hint && <span className="m-switch-hint">{hint}</span>}
      </span>
      {count !== undefined && <span className="count">{count.toLocaleString()}</span>}
      <span className="m-switch" aria-hidden="true" />
    </button>
  );
}
