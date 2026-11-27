import { useState, type ReactNode } from "react";

import type { Period, PersonDetail } from "../../shared/graph";
import type { Evidence, EvidenceMap } from "../../shared/v1";
import { useModel, useNode, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { nameOf, otherNames } from "../lib/names";
import { useApp } from "../store";

/**
 * A node reference: icon, name in the current script; selects the node. `label` replaces the
 * name (a credit printed under a pen name), and `title` the hover text.
 */
export function NodeLink({ k, children, plain, label, title }: { k: string; children?: ReactNode; plain?: boolean; label?: string; title?: string }) {
  const node = useNode(k);
  const t = useT();
  const p = usePalette();
  const lang = useApp((s) => s.nameLang);
  const ui = useApp((s) => s.uiLang);
  const select = useApp((s) => s.select);
  if (!node) return <span className="muted">{k}</span>;
  const other = otherNames(node.n, lang, ui).map((o) => o.text).join(" / ");
  return (
    <button
      type="button" className={plain ? "node-link plain" : "node-link"} onClick={() => select(k)}
      title={title ?? `${t.types[node.t]}${other ? ` · ${other}` : ""}`}
    >
      <TypeIcon type={node.t} sub={node.s} size={14} style={{ color: p.type[node.t] }} />
      <span className="node-link-name">{label ?? nameOf(node.n, lang, k)}</span>
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

/** Shown by a person or character on their birthday (the graph puts a party hat on the node). */
export function BirthdayBadge() {
  const t = useT();
  return (
    <span className="badge badge-birthday">
      <Icon name="hat" size={12} strokeWidth={2.4} /> {t.birthdayToday}
    </span>
  );
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

/** Mood labels of a recording (D61), in the UI language. */
export function MoodBadges({ moods }: { moods?: string[] }) {
  const t = useT();
  if (!moods?.length) return null;
  return <span className="chips">{moods.map((m) => <Badge key={m}>{t.moods[m] ?? m}</Badge>)}</span>;
}

/**
 * A person's aliases: kind and note, misprints left out (they stay searchable). A pen name or
 * former name with names of its own is shown in the current script, its printed form beside it.
 */
export function Aliases({ list }: { list: PersonDetail["aliases"] }) {
  const t = useT();
  const lang = useApp((s) => s.nameLang);
  const shown = list.filter((a) => a.kind !== "misprint");
  if (!shown.length) return null;
  return (
    <span className="alias-list">
      {shown.map((a, i) => (
        <span key={i} className="alias">
          <span>{a.names ? nameOf(a.names, lang, a.text) : a.text}</span>
          {a.names && nameOf(a.names, lang, a.text) !== a.text && <span className="muted">{a.text}</span>}
          <Badge tone="muted">{t.aliasKind[a.kind] ?? a.kind}</Badge>
          {a.note && <span className="muted small">{a.note}</span>}
        </span>
      ))}
    </span>
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

/** A node's name in the current script, by key. */
export function useNodeName(): (k: string) => string {
  const model = useModel();
  const lang = useApp((s) => s.nameLang);
  return (k) => nameOf(model.nodes.get(k)?.n, lang, k);
}

export function useProjectName(): (id: string) => string {
  const model = useModel();
  const lang = useApp((s) => s.nameLang);
  return (id) => nameOf(model.nodes.get(`project:${id}`)?.n, lang, id);
}
