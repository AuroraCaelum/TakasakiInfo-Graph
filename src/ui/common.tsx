import { useState, type ReactNode } from "react";

import type { Period } from "../../shared/graph";
import type { Evidence, EvidenceMap } from "../../shared/v1";
import { useModel, useNode, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { nameOf, otherNames } from "../lib/names";
import { useApp } from "../store";

/** A node reference: icon, name in the current script; selects the node. */
export function NodeLink({ k, children, plain }: { k: string; children?: ReactNode; plain?: boolean }) {
  const node = useNode(k);
  const t = useT();
  const p = usePalette();
  const lang = useApp((s) => s.nameLang);
  const select = useApp((s) => s.select);
  if (!node) return <span className="muted">{k}</span>;
  const other = otherNames(node.n, lang).map((o) => o.text).join(" / ");
  return (
    <button
      type="button" className={plain ? "node-link plain" : "node-link"} onClick={() => select(k)}
      title={`${t.types[node.t]}${other ? ` · ${other}` : ""}`}
    >
      <TypeIcon type={node.t} size={14} style={{ color: p.type[node.t] }} />
      <span className="node-link-name">{nameOf(node.n, lang, k)}</span>
      {children}
    </button>
  );
}

export function Section({ title, hint, children, extra }: { title: ReactNode; hint?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h3>{title}</h3>
        {extra}
      </header>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  );
}

export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  if (!shown.length) return null;
  return (
    <dl className="kv">
      {shown.map(([k, v], i) => (
        <div key={i} className="kv-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: "strong" | "muted" }) {
  return <span className={`badge${tone ? ` badge-${tone}` : ""}`}>{children}</span>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="ext-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <Icon name="external" size={12} />
    </a>
  );
}

export function PeriodText({ period }: { period: Period }) {
  const t = useT();
  if (period[0] === null && period[1] === null) return <span className="muted">{t.always}</span>;
  return <span className="tabular">{t.period(period[0], period[1])}</span>;
}

/** A thin magnitude bar: one series, one color; the number beside it carries the value. */
export function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (100 * value) / max) : 0;
  return (
    <span className="bar" aria-hidden="true">
      <span className="bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function EvidenceList({ evidence }: { evidence?: EvidenceMap }) {
  const entries = Object.entries(evidence ?? {});
  if (!entries.length) return null;
  return (
    <ul className="evidence">
      {entries.map(([field, ev]) => <EvidenceRow key={field} field={field} ev={ev} />)}
    </ul>
  );
}

function EvidenceRow({ field, ev }: { field: string; ev: Evidence }) {
  const t = useT();
  const url = ev.source && /^https?:\/\//.test(ev.source) ? ev.source : null;
  return (
    <li className="evidence-row">
      <span className="evidence-field">{field}</span>
      <Badge tone={ev.status === "official" ? "strong" : ev.status === "draft" ? "muted" : undefined}>{t.evidence[ev.status] ?? ev.status}</Badge>
      {url ? <ExtLink href={url}>{shortUrl(url)}</ExtLink> : ev.source ? <span className="muted">{ev.source}</span> : null}
      {ev.checked && <span className="muted tabular">{t.checked} {ev.checked}</span>}
      {ev.note && <span className="evidence-note">{ev.note}</span>}
    </li>
  );
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/$/, "");
    const s = `${u.hostname.replace(/^www\./, "")}${path}`;
    return s.length > 48 ? `${s.slice(0, 46)}…` : s;
  } catch {
    return url;
  }
}

/** Shows the first `n` items and a "more" button. */
export function More<T>({ items, n = 12, render }: { items: T[]; n?: number; render: (x: T, i: number) => ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, n);
  return (
    <>
      {shown.map(render)}
      {items.length > n && (
        <button type="button" className="text-btn" onClick={() => setAll(!all)}>
          {all ? "−" : `+${items.length - n}`}
        </button>
      )}
    </>
  );
}

export function useProjectName(): (id: string) => string {
  const model = useModel();
  const lang = useApp((s) => s.nameLang);
  return (id) => nameOf(model.nodes.get(`project:${id}`)?.n, lang, id);
}
