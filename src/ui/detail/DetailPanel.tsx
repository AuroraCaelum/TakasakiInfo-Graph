import { useState } from "react";

import { useDetail, useNode, usePalette, useT } from "../../context";
import { Icon, TypeIcon } from "../../icons";
import { nameOf, otherNames } from "../../lib/names";
import { nodePasses } from "../../lib/visibility";
import { useApp } from "../../store";
import type { Tab } from "../../view";
import { Badge } from "../common";
import { subtypeLabel } from "../labels";
import { DataTab } from "./DataTab";
import { NeighborsTab } from "./Neighbors";
import { OverviewTab } from "./Overview";
import { RelatedTab } from "./Related";

const TABS: Tab[] = ["overview", "data", "neighbors", "related"];

export function DetailPanel() {
  const t = useT();
  const p = usePalette();
  const s = useApp();
  const node = useNode(s.selected);
  const { detail, error } = useDetail(s.selected);
  const [copied, setCopied] = useState(false);
  if (!node) return null;

  const sub = subtypeLabel(t, node);
  const hidden = !nodePasses(node, { ...s, selected: null });
  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, () => undefined);
  };

  return (
    <aside className="detail" aria-label={nameOf(node.n, s.nameLang, node.k)}>
      <header className="detail-head">
        <div className="detail-type">
          <span className="type-dot" style={{ background: p.type[node.t] }}>
            <TypeIcon type={node.t} sub={node.s} size={13} style={{ color: p.picto[node.t] }} strokeWidth={2.6} />
          </span>
          <span>{t.types[node.t]}</span>
          {sub && <Badge>{sub}</Badge>}
        </div>
        <h2 className="detail-title">{nameOf(node.n, s.nameLang, node.k)}</h2>
        <div className="detail-other">
          {otherNames(node.n, s.nameLang).map((o) => <span key={o.lang} lang={o.lang === "rom" ? "en" : o.lang === "kana" ? "ja" : o.lang}>{o.text}</span>)}
        </div>
        <button type="button" className="icon-btn detail-close" aria-label={t.close} onClick={() => s.select(null)}>
          <Icon name="close" />
        </button>
      </header>

      {hidden && <p className="notice">{t.hidden}</p>}

      <div className="detail-actions">
        <button type="button" className={`btn${s.focus ? " on" : ""}`} aria-pressed={!!s.focus}
          onClick={() => s.set({ focus: s.focus ? 0 : 1, pathOn: false })}>
          <Icon name="focus" size={16} /> {s.focus ? t.focusExit : t.focus}
        </button>
        {s.focus > 0 && (
          <div className="segmented" role="radiogroup" aria-label={t.depth} title={t.depth}>
            {[1, 2, 3].map((d) => (
              <button key={d} type="button" role="radio" aria-checked={s.focus === d} className={s.focus === d ? "on" : ""} onClick={() => s.set({ focus: d })}>{d}</button>
            ))}
          </div>
        )}
        <button type="button" className={`btn${s.pathOn ? " on" : ""}`} aria-pressed={s.pathOn}
          onClick={() => s.set({ pathOn: !s.pathOn, focus: 0 })}>
          <Icon name="route" size={16} /> {t.findPath}
        </button>
        <button type="button" className="btn" onClick={copy}>
          <Icon name="link" size={16} /> {copied ? t.copied : t.copyLink}
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={s.tab === tab} className={s.tab === tab ? "on" : ""} onClick={() => s.set({ tab })}>
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      <div className="detail-body" role="tabpanel">
        {error && <p className="notice">{t.loadError}</p>}
        {s.tab === "overview" && <OverviewTab node={node} detail={detail} />}
        {s.tab === "data" && (detail ? <DataTab node={node} detail={detail} /> : !error && <p className="muted">{t.loading}</p>)}
        {s.tab === "neighbors" && <NeighborsTab node={node} />}
        {s.tab === "related" && <RelatedTab node={node} />}
      </div>
    </aside>
  );
}
