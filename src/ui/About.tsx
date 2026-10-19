import { useEffect, useRef } from "react";

import { NODE_TYPES } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { Icon, TypeIcon } from "../icons";
import { ExtLink, KV } from "./common";

const REPO = "https://github.com/AuroraCaelum/TakasakiInfo";

export function About({ onClose }: { onClose: () => void }) {
  const t = useT();
  const p = usePalette();
  const model = useModel();
  const close = useRef<HTMLButtonElement>(null);
  const meta = model.meta;

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2 id="about-title">{t.appTitle}</h2>
          <button ref={close} type="button" className="icon-btn" aria-label={t.close} onClick={onClose}><Icon name="close" /></button>
        </header>
        <p>{t.aboutBody}</p>
        <KV rows={[
          [t.dataVersion, <span className="tabular">{meta.dbLastUpdate}{meta.schemaVersion ? ` · schema ${meta.schemaVersion}` : ""} · v1 {meta.format}</span>],
          ["commit", meta.sha ? <ExtLink href={`${REPO}/commit/${meta.sha}`}>{meta.sha.slice(0, 7)}</ExtLink> : null],
          [t.builtAt, <span className="tabular">{meta.builtAt.slice(0, 16).replace("T", " ")} UTC</span>],
          [t.sourceRepo, <ExtLink href={REPO}>AuroraCaelum/TakasakiInfo</ExtLink>],
        ]} />
        <ul className="count-list">
          {NODE_TYPES.map((type) => (
            <li key={type}>
              <TypeIcon type={type} size={15} style={{ color: p.type[type] }} />
              <span>{t.types[type]}</span>
              <span className="tabular">{(meta.counts[type] ?? 0).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
