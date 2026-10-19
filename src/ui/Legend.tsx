import { useMemo, useState } from "react";

import { NODE_TYPES } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { classOf } from "../lib/classes";
import { nameOf } from "../lib/names";
import type { Visible } from "../lib/visibility";
import { useApp } from "../store";
import { COMMUNITY_COLORS, communityColor, projectColor } from "../theme";

interface Entry {
  id: string;
  label: string;
  color: string;
  icon?: (typeof NODE_TYPES)[number];
  onClick?: () => void;
  off?: boolean;
}

export function Legend({ visible }: { visible: Visible }) {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const s = useApp();
  // folded on phones, where it would cover much of the map
  const [open, setOpen] = useState(() => window.innerWidth > 820);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const k of visible.nodes) {
      const id = classOf(model.nodes.get(k)!, s.colorBy);
      c.set(id, (c.get(id) ?? 0) + 1);
    }
    return c;
  }, [visible, model, s.colorBy]);

  let entries: Entry[];
  if (s.colorBy === "type") {
    entries = NODE_TYPES.map((type) => ({
      id: `type:${type}`, label: t.types[type], color: p.type[type], icon: type, off: !s.types[type],
      onClick: () => s.set({ types: { ...s.types, [type]: !s.types[type] } }),
    }));
  } else if (s.colorBy === "project") {
    entries = [
      ...model.projects.map((id) => ({
        id: `project:${id}`, label: nameOf(model.nodes.get(`project:${id}`)?.n, s.nameLang, id), color: projectColor(p, [id]),
      })),
      { id: "project:_multi", label: t.multiProject, color: p.other },
      { id: "project:_none", label: t.noProject, color: p.other },
    ];
  } else {
    entries = [
      ...model.communities.slice(0, COMMUNITY_COLORS).map((c) => ({
        id: `community:${c.id}`,
        label: `${c.id + 1}. ${c.top.slice(0, 2).map((k) => nameOf(model.nodes.get(k)?.n, s.nameLang, k)).join(", ")}`,
        color: communityColor(p, c.id),
      })),
      { id: "community:_other", label: t.otherCommunity, color: p.other },
    ];
  }
  const derivedOn = Object.entries(s.relations).some(([r, on]) => on && ["co_credit", "co_perform", "shared_member"].includes(r));

  return (
    <div className={`legend${open ? "" : " closed"}`}>
      <button type="button" className="legend-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t.legend}
        <Icon name="chevron" size={14} className={open ? "rot-90" : ""} />
      </button>
      {open && (
        <>
          <ul className="legend-list" onMouseLeave={() => s.set({ legendHover: null })}>
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`legend-item${e.off ? " off" : ""}${e.onClick ? "" : " static"}`}
                  onMouseEnter={() => s.set({ legendHover: e.id })}
                  onFocus={() => s.set({ legendHover: e.id })}
                  onBlur={() => s.set({ legendHover: null })}
                  onClick={e.onClick}
                  aria-pressed={e.onClick ? !e.off : undefined}
                >
                  <span className="legend-dot" style={{ background: e.color }}>
                    {e.icon && <TypeIcon type={e.icon} size={11} style={{ color: e.icon === "project" ? p.surface : "#fff" }} strokeWidth={2.6} />}
                  </span>
                  <span className="legend-label">{e.label}</span>
                  <span className="count">{(counts.get(e.id) ?? 0).toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="legend-foot">
            <span><span className="swatch-fact" aria-hidden="true" /> {t.legendFact}</span>
            {derivedOn && <span><span className="swatch-derived" aria-hidden="true" /> {t.legendDerived}</span>}
            <span className="muted">{t.legendSize}</span>
          </div>
        </>
      )}
    </div>
  );
}
