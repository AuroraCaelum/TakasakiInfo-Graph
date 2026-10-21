import { useState, type KeyboardEvent } from "react";

import { useT } from "../../context";
import { Icon } from "../../icons";
import { nameOf, otherNames } from "../../lib/names";
import { useApp } from "../../store";
import { subtypeLabel } from "../labels";
import { useSearch } from "../SearchBox";
import { TypeDot } from "./parts";

/** Search over the whole screen: for a node to select, or for where a path should end. */
export function SearchSheet({ forPath, onClose }: { forPath: boolean; onClose: () => void }) {
  const t = useT();
  const s = useApp();
  const [q, setQ] = useState("");
  const results = useSearch(q, 40);
  const prompt = forPath ? t.pathPick : t.search;

  const pick = (k: string) => {
    if (forPath) s.set({ pathOn: true, pathTo: k === s.selected ? null : k });
    else s.select(k);
    onClose();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // an IME is still composing: Enter commits the syllable, not the search (see SearchBox)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && results[0]) { e.preventDefault(); pick(results[0].k); }
  };

  return (
    <div className="m-search" role="dialog" aria-modal="true" aria-label={prompt}>
      <div className="m-search-bar">
        <button type="button" className="m-icon-btn" aria-label={t.back} onClick={onClose}>
          <Icon name="back" size={22} />
        </button>
        <input
          type="search" enterKeyHint="search" autoFocus value={q} placeholder={prompt} aria-label={prompt}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
        />
      </div>
      {!q && <p className="m-note">{t.searchHint}</p>}
      {q && <div className="m-results-title">{t.results}</div>}
      {q && !results.length && <p className="m-note">{t.searchNoResult}</p>}
      {q && results.length > 0 && (
        <ul className="m-results">
          {results.map((n) => {
            const sub = subtypeLabel(t, n);
            const other = otherNames(n.n, s.nameLang)[0]?.text;
            return (
              <li key={n.k}>
                <button type="button" onClick={() => pick(n.k)}>
                  <TypeDot type={n.t} sub={n.s} size={34} />
                  <span className="m-result-text">
                    <span className="m-result-name">{nameOf(n.n, s.nameLang, n.k)}</span>
                    <span className="m-result-sub">
                      {t.types[n.t]}{sub ? ` · ${sub}` : ""}{n.d ? ` · ${n.d.slice(0, 4)}` : ""}{other ? ` · ${other}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
