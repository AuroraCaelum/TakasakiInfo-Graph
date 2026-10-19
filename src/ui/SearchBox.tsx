import { forwardRef, useId, useMemo, useState, type KeyboardEvent } from "react";

import { useModel, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { nameOf, otherNames } from "../lib/names";
import { buildSearchIndex, search, type SearchIndex } from "../lib/search";
import type { Model } from "../model";
import { useApp } from "../store";
import { subtypeLabel } from "./labels";

const indexCache = new WeakMap<Model, SearchIndex>();

interface Props {
  onPick: (key: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const SearchBox = forwardRef<HTMLInputElement, Props>(function SearchBox({ onPick, placeholder, autoFocus, className }, ref) {
  const model = useModel();
  const t = useT();
  const p = usePalette();
  const lang = useApp((s) => s.nameLang);
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const index = useMemo(() => {
    let i = indexCache.get(model);
    if (!i) indexCache.set(model, (i = buildSearchIndex(model.list)));
    return i;
  }, [model]);
  const results = useMemo(() => search(index, q, 20), [index, q]);

  const pick = (k: string) => {
    onPick(k);
    setQ("");
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // an IME (Korean, Japanese) is still composing: this key commits the last syllable, and the
    // results for the full text arrive with the change that follows. Picking now would clear the
    // box, and the committed syllable would land in it alone (쿠스노 → 노).
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active].k); }
    else if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); }
  };

  return (
    <div className={`search ${className ?? ""}`}>
      <Icon name="search" size={16} className="search-icon" />
      <input
        ref={ref}
        type="search"
        value={q}
        placeholder={placeholder ?? t.search}
        aria-label={placeholder ?? t.search}
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls={id}
        aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
        autoFocus={autoFocus}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
      />
      {open && q && (
        <ul className="search-results" id={id} role="listbox">
          {results.length === 0 && <li className="search-empty">{t.searchNoResult}</li>}
          {results.map((n, i) => {
            const other = otherNames(n.n, lang)[0]?.text;
            const sub = subtypeLabel(t, n);
            return (
              <li
                key={n.k}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(e) => { e.preventDefault(); pick(n.k); }}
                onMouseEnter={() => setActive(i)}
              >
                <TypeIcon type={n.t} size={16} style={{ color: p.type[n.t] }} />
                <span className="search-main">
                  <span className="search-name">{nameOf(n.n, lang, n.k)}</span>
                  {other && <span className="search-other">{other}</span>}
                </span>
                <span className="search-type">{t.types[n.t]}{sub ? ` · ${sub}` : ""}{n.d ? ` · ${n.d.slice(0, 4)}` : ""}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
