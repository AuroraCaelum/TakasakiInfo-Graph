import { Fragment, useEffect, useState, type ReactNode } from "react";

import type {
  ArtistDetail, CharacterDetail, ConcertDetail, CreditRef, Detail, DetailFile, GNode, LinkRef, PerformerRef,
  PersonDetail, ProjectDetail, ReleaseDetail, VenueDetail, WorkDetail,
} from "../../../shared/graph";
import { ARRANGER_ROLES, NODE_TYPES, type ArrangerRole } from "../../../shared/graph";
import type { Names } from "../../../shared/v1";
import { useModel, usePalette, useT } from "../../context";
import { Icon, TypeIcon } from "../../icons";
import { chronological } from "../../lib/neighbors";
import { nameOf } from "../../lib/names";
import { loadDetails } from "../../model";
import { useApp } from "../../store";
import { Badge, EvidenceList, ExtLink, KV, More, NodeLink, PeriodText, Section, shortUrl } from "../common";

export function DataTab({ node, detail }: { node: GNode; detail: Detail }) {
  switch (detail.t) {
    case "work": return <WorkData detail={detail} />;
    case "release": return <ReleaseData detail={detail} />;
    case "person": return <PersonData node={node} detail={detail} />;
    case "character": return <CharacterData node={node} detail={detail} />;
    case "artist": return <ArtistData node={node} detail={detail} />;
    case "project": return <ProjectData detail={detail} />;
    case "concert": return <ConcertData detail={detail} />;
    case "venue": return <VenueData detail={detail} />;
  }
}

// --- shared bits -------------------------------------------------------------------------------

function useNames() {
  const lang = useApp((s) => s.nameLang);
  return (n: Names | undefined, fallback = "") => nameOf(n, lang, fallback);
}

function Credits({ list }: { list: CreditRef[] }) {
  const name = useNames();
  if (!list.length) return null;
  return (
    <span className="chips">
      {list.map((c, i) => (
        <span key={i} className="chip-group">
          <NodeLink k={c.ref} />
          {c.affiliation && <span className="muted">({typeof c.affiliation === "string" ? c.affiliation : name(c.affiliation)})</span>}
          {c.role && <span className="muted">[{name(c.role)}]</span>}
        </span>
      ))}
    </span>
  );
}

function Performers({ list }: { list: PerformerRef[] }) {
  if (!list.length) return null;
  return (
    <span className="chips">
      {list.map((p, i) => (
        <span key={i} className="chip-group">
          <NodeLink k={p.ref} />
          {p.role && <span className="muted">→</span>}
          {p.role && <NodeLink k={p.role} plain />}
        </span>
      ))}
    </span>
  );
}

function LinkIcon({ link }: { link: LinkRef }) {
  const t = useT();
  if (!link.url) return <span className="link-src none" title={t.linkNone}>—</span>;
  const title = link.src === "own" ? t.linkOwn : t.linkMain;
  return (
    <a className={`link-src ${link.src}`} href={link.url} target="_blank" rel="noopener noreferrer" title={title} aria-label={`YouTube Music: ${title}`}>
      <Icon name="music" size={13} />
      {link.src === "main" && <span className="link-main-mark">*</span>}
    </a>
  );
}

/** Chronological list of linked nodes: date, link, extra. */
function DatedList({ items, empty }: { items: { k: string; d?: string; extra?: ReactNode }[]; empty?: string }) {
  const t = useT();
  if (!items.length) return <p className="muted">{empty ?? t.noData}</p>;
  return (
    <ul className="dated-list">
      <More items={items} n={15} render={(x) => (
        <li key={x.k}>
          <span className="date tabular">{x.d ?? "—"}</span>
          <NodeLink k={x.k} />
          {x.extra}
        </li>
      )} />
    </ul>
  );
}

function useDetailFile(type: (typeof NODE_TYPES)[number]): DetailFile | null {
  const [file, setFile] = useState<DetailFile | null>(null);
  useEffect(() => {
    let live = true;
    loadDetails(type).then((f) => { if (live) setFile(f); }, () => undefined);
    return () => { live = false; };
  }, [type]);
  return file;
}

// --- work ----------------------------------------------------------------------------------------

function WorkData({ detail }: { detail: WorkDetail }) {
  const t = useT();
  const name = useNames();
  const releases = useDetailFile("release");
  const recTitle = (id: string) => {
    const r = detail.recordings.find((x) => x.id === id);
    return r?.version ?? (r?.kind && r.kind !== "vocal" ? t.recKind[r.kind] : id === "original" ? "" : id);
  };
  const editionLabel = (release: string, ids: string[]) => {
    const d = releases?.[release];
    if (!ids.length || d?.t !== "release") return "";
    if (ids.length === d.editions.length) return t.allEditions;
    return ids.map((id) => name(d.editions.find((e) => e.id === id)?.label, id)).join(", ");
  };

  return (
    <>
      <Section title={t.credits}>
        <KV rows={[
          [t.rel.lyricist, <Credits list={detail.credits.lyricist} />],
          [t.rel.composer, <Credits list={detail.credits.composer} />],
          [t.kind, t.workKind[detail.kind] ?? detail.kind],
        ]} />
      </Section>

      <Section title={`${t.recordings} (${detail.recordings.length})`}>
        <div className="cards">
          {detail.recordings.map((r) => (
            <article key={r.id} className="card">
              <header className="card-head">
                <strong>{name(r.title ?? detail.title)}</strong>
                <Badge>{t.recKind[r.kind] ?? r.kind}</Badge>
              </header>
              <KV rows={[
                [t.performers, r.performers.length ? <Performers list={r.performers} /> : null],
                ...ARRANGER_ROLES.map((role): [string, ReactNode] => {
                  const list = r[role];
                  return [t.rel[role], list?.length ? <Credits list={list} /> : null];
                }),
                [t.override, r.override ? (
                  <span>{t.rel.lyricist}: <Credits list={r.override.lyricist} /> · {t.rel.composer}: <Credits list={r.override.composer} /></span>
                ) : null],
                [t.instrumentalOf, r.instrumentalOf ? name(detail.recordings.find((x) => x.id === r.instrumentalOf)?.title ?? detail.title) : null],
                [t.isrc, r.externalIds?.isrc ? <code>{r.externalIds.isrc}</code> : null],
                [t.mainLink, r.mainLink ? <ExtLink href={r.mainLink}>YouTube Music</ExtLink> : null],
              ]} />
              {r.evidence && <details className="more"><summary>{t.evidenceTitle}</summary><EvidenceList evidence={r.evidence} /></details>}
            </article>
          ))}
        </div>
      </Section>

      <Section title={`${t.appearances} (${detail.appearances.length})`}>
        {detail.appearances.length === 0 ? <p className="muted">{t.noData}</p> : (
          <ul className="dated-list">
            {detail.appearances.map((a) => (
              <li key={a.release} className="appearance">
                <span className="date tabular">{a.date ?? "—"}</span>
                <NodeLink k={a.release} />
                <span className="track-refs">
                  {a.tracks.map((tr, i) => (
                    <span key={i} className="track-ref">
                      <span className="tabular muted">{tr.disc}-{tr.no ?? tr.pos}</span>
                      {recTitle(tr.rec) && <Badge tone="muted">{recTitle(tr.rec)}</Badge>}
                      {editionLabel(a.release, tr.editions) && <span className="muted small">{editionLabel(a.release, tr.editions)}</span>}
                      <LinkIcon link={tr.link} />
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {detail.performances.length > 0 && (
        <Section title={`${t.performances} (${detail.performances.length})`}>
          <ul className="dated-list">
            <More items={detail.performances} n={12} render={(p, i) => (
              <li key={i}>
                <span className="date tabular">{p.date}</span>
                <NodeLink k={p.concert} />
                {p.venue && <NodeLink k={p.venue} plain />}
              </li>
            )} />
          </ul>
        </Section>
      )}
    </>
  );
}

// --- release ---------------------------------------------------------------------------------

function ReleaseData({ detail }: { detail: ReleaseDetail }) {
  const t = useT();
  const name = useNames();
  const edName = (id: string) => name(detail.editions.find((e) => e.id === id)?.label, id);
  return (
    <>
      <Section title={t.tabs.data}>
        <KV rows={[
          [t.kind, t.releaseType[detail.type] ?? detail.type],
          [t.statusLabel, t.status[detail.status] ?? detail.status],
          [t.releaseDate, detail.date ? <span className="tabular">{detail.date}</span> : null],
          [t.label, detail.label],
          [t.artistCredit, detail.artistCredit.length ? <Performers list={detail.artistCredit} /> : null],
          [t.projects, <span className="chips">{detail.projects.map((p) => <NodeLink key={p} k={`project:${p}`} />)}</span>],
        ]} />
      </Section>

      {detail.editions.length > 0 && (
        <Section title={`${t.editions} (${detail.editions.length})`}>
          <table className="table">
            <thead><tr><th>{t.editions}</th><th>{t.catalog}</th><th>{t.media}</th></tr></thead>
            <tbody>
              {detail.editions.map((e) => (
                <tr key={e.id}><td>{name(e.label, e.id)}</td><td className="tabular">{e.catalog ?? "—"}</td><td>{e.media.join(", ") || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title={t.tracklist}>
        {detail.tracklists.map((tl, gi) => (
          <div key={gi} className="tracklist">
            {detail.tracklists.length > 1 && (
              <h4 className="tracklist-head">{tl.editions.length ? tl.editions.map(edName).join(", ") : t.allEditions}</h4>
            )}
            {tl.discs.map((disc) => (
              <Fragment key={disc.disc}>
                {tl.discs.length > 1 && <h5 className="disc-head">{t.disc(disc.disc)}</h5>}
                <ol className="tracks">
                  {disc.tracks.map((tr) => (
                    <li key={tr.pos}>
                      <span className="track-no tabular">{tr.no ?? tr.pos}</span>
                      <NodeLink k={tr.work} />
                      {tr.version && <Badge tone="muted">{tr.version}</Badge>}
                      {!tr.version && tr.kind !== "vocal" && <Badge tone="muted">{t.recKind[tr.kind] ?? tr.kind}</Badge>}
                      <LinkIcon link={tr.link} />
                      {tr.note && <span className="muted small">{tr.note}</span>}
                    </li>
                  ))}
                </ol>
              </Fragment>
            ))}
          </div>
        ))}
        <p className="hint"><span className="link-main-mark">*</span> {t.linkMain}</p>
      </Section>

      {detail.streaming.length > 0 && (
        <Section title={t.streamingAlbums}>
          <ul className="link-list">
            {detail.streaming.map((s, i) => (
              <li key={i}>
                <ExtLink href={s.url}>{s.editions.length ? s.editions.map(edName).join(", ") : t.allEditions}</ExtLink>
                <span className="muted"> {shortUrl(s.url)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

// --- person ----------------------------------------------------------------------------------

const isArranger = (r: string): r is ArrangerRole => (ARRANGER_ROLES as readonly string[]).includes(r);

function PersonData({ node, detail }: { node: GNode; detail: PersonDetail }) {
  const t = useT();
  const model = useModel();
  const name = useNames();
  const aff = (work: string) => detail.affiliations.filter((a) => a.work === work)
    .map((a) => (typeof a.affiliation === "string" ? a.affiliation : name(a.affiliation))).join(", ");
  const roles = (["lyricist", "composer", ...ARRANGER_ROLES, "performer", "release_artist"] as const)
    .map((r) => [r, chronological(model, node.k, r)] as const).filter(([, list]) => list.length);
  return (
    <>
      <Section title={t.tabs.data}>
        <KV rows={[
          [t.nativeScript, detail.nativeScript],
          [t.aliases, detail.aliases.length ? detail.aliases.map((a) => `${a.text} (${a.kind})`).join(", ") : null],
          [t.distinctFrom, detail.distinctFrom.length ? <span className="chips">{detail.distinctFrom.map((k) => <NodeLink key={k} k={k} />)}</span> : null],
        ]} />
      </Section>
      {roles.map(([r, list]) => (
        <Section key={r} title={`${t.rel[r]} (${list.length})`}>
          <DatedList items={list.map((f) => ({
            k: f.k, d: f.d,
            extra: <>
              {isArranger(r) && detail.arranged.find((a) => a.work === f.k && a.role === r) && (
                <span className="muted small">{detail.arranged.find((a) => a.work === f.k && a.role === r)!.recs.join(", ")}</span>
              )}
              {(r === "lyricist" || r === "composer" || isArranger(r)) && aff(f.k) && <span className="muted small">({aff(f.k)})</span>}
              {f.w > 1 && <span className="muted small tabular">×{f.w}</span>}
            </>,
          }))} />
        </Section>
      ))}
      {chronological(model, node.k, "cv").length > 0 && (
        <Section title={t.casting}>
          <DatedList items={chronological(model, node.k, "cv").map((f) => ({
            k: f.k, d: f.pd?.[0]?.[0] ?? undefined, extra: f.pd ? <PeriodText period={f.pd[0]} /> : null,
          }))} />
        </Section>
      )}
      {detail.sungAs.length > 0 && (
        <Section title={t.sungAs}>
          <ul className="dated-list">
            {detail.sungAs.map((s, i) => (
              <li key={i}><NodeLink k={s.work} /><span className="muted">→</span><NodeLink k={s.role} plain /></li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

// --- character -------------------------------------------------------------------------------

function CharacterData({ node, detail }: { node: GNode; detail: CharacterDetail }) {
  const t = useT();
  const model = useModel();
  const sung = chronological(model, node.k, "performer");
  const written = [...chronological(model, node.k, "lyricist"), ...chronological(model, node.k, "composer")];
  return (
    <>
      <Section title={t.casting}>
        {detail.casting.length ? (
          <ul className="dated-list">
            {detail.casting.map((c, i) => (
              <li key={i}><NodeLink k={c.person} /><PeriodText period={[c.from ?? null, c.until ?? null]} /></li>
            ))}
          </ul>
        ) : <p className="muted">{t.noData}</p>}
      </Section>
      <Section title={t.memberships}>
        {detail.memberships.length ? (
          <ul className="dated-list">
            {detail.memberships.map((m) => (
              <li key={m.artist}><NodeLink k={m.artist} />{m.periods.map((p, i) => <PeriodText key={i} period={p} />)}</li>
            ))}
          </ul>
        ) : <p className="muted">{t.noData}</p>}
      </Section>
      <Section title={`${t.rel.performer} (${sung.length})`}>
        <DatedList items={sung.map((f) => ({ k: f.k, d: f.d }))} />
      </Section>
      {written.length > 0 && (
        <Section title={t.credits}>
          <DatedList items={written.map((f) => ({ k: f.k, d: f.d, extra: <Badge tone="muted">{t.rel[f.r]}</Badge> }))} />
        </Section>
      )}
      {detail.playedBy.length > 0 && (
        <Section title={t.playedBy}>
          <ul className="dated-list">
            {detail.playedBy.map((p) => <li key={p.person}><NodeLink k={p.person} /><span className="muted small">×{p.works.length}</span></li>)}
          </ul>
        </Section>
      )}
    </>
  );
}

// --- artist ----------------------------------------------------------------------------------

function ArtistData({ node, detail }: { node: GNode; detail: ArtistDetail }) {
  const t = useT();
  const model = useModel();
  const sung = chronological(model, node.k, "performer");
  const released = chronological(model, node.k, "release_artist");
  return (
    <>
      <Section title={t.tabs.data}>
        <KV rows={[
          [t.kind, t.artistKind[detail.kind] ?? detail.kind],
          [t.projects, <span className="chips">{detail.projects.map((p) => <NodeLink key={p} k={`project:${p}`} />)}</span>],
        ]} />
      </Section>
      <Section title={t.lineups}>
        {detail.lineups.length ? detail.lineups.map((l, i) => (
          <div key={i} className="lineup">
            <PeriodText period={[l.from ?? null, l.until ?? null]} />
            <span className="chips">{l.members.map((m) => <NodeLink key={m} k={m} />)}</span>
          </div>
        )) : <p className="muted">{t.noData}</p>}
      </Section>
      <Section title={`${t.rel.performer} (${sung.length})`}>
        <DatedList items={sung.map((f) => ({ k: f.k, d: f.d }))} />
      </Section>
      {released.length > 0 && (
        <Section title={`${t.rel.release_artist} (${released.length})`}>
          <DatedList items={released.map((f) => ({ k: f.k, d: f.d }))} />
        </Section>
      )}
    </>
  );
}

// --- project ---------------------------------------------------------------------------------

function ProjectData({ detail }: { detail: ProjectDetail }) {
  const t = useT();
  const p = usePalette();
  return (
    <>
      <Section title={t.counts}>
        <ul className="count-list">
          {NODE_TYPES.filter((type) => detail.counts[type]).map((type) => (
            <li key={type}>
              <TypeIcon type={type} size={15} style={{ color: p.type[type] }} />
              <span>{t.types[type]}</span>
              <span className="tabular">{detail.counts[type]!.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <KV rows={[[t.legacyCategory, detail.legacy ? `${detail.legacy.category} (${detail.legacy.file})` : null]]} />
      </Section>
      {detail.copyright.length > 0 && (
        <Section title={t.copyright}>
          <ul className="evidence">
            {detail.copyright.map((c, i) => (
              <li key={i} className="evidence-row">
                <span>{c.text}</span>
                <Badge tone="muted">{c.lang}</Badge>
                {c.source && <ExtLink href={c.source}>{shortUrl(c.source)}</ExtLink>}
                {c.checked && <span className="muted tabular">{t.checked} {c.checked}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

// --- concert ---------------------------------------------------------------------------------

function ConcertData({ detail }: { detail: ConcertDetail }) {
  const t = useT();
  const name = useNames();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Section title={t.tabs.data}>
        <KV rows={[
          [t.statusLabel, t.status[detail.status] ?? detail.status],
          [t.projects, <span className="chips">{detail.projects.map((p) => <NodeLink key={p} k={`project:${p}`} />)}</span>],
          [t.eventCode, detail.eventCode ? <code>{detail.eventCode}</code> : null],
        ]} />
      </Section>
      <Section title={`${t.stops} (${detail.stops.length})`}>
        {detail.stops.map((s) => (
          <article key={s.id} className="card">
            <header className="card-head">
              <strong>{name(s.city, s.id)}{s.label ? ` (${s.label})` : ""}</strong>
              {s.venue && <NodeLink k={s.venue} plain />}
            </header>
            {s.performances.map((p) => {
              const id = `${s.id}/${p.date}`;
              const songs = p.setlist.filter((x) => x.work).length;
              return (
                <div key={p.date} className="performance">
                  <button type="button" className="text-btn" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
                    <span className="tabular">{p.date}</span>{p.label ? ` ${p.label}` : ""} · {t.setlist} {songs}
                    <Icon name="chevron" size={12} className={open === id ? "rot-90" : ""} />
                  </button>
                  {open === id && (
                    <ol className="setlist">
                      {p.setlist.map((item, i) => (
                        <li key={i} className={item.work ? "song" : "marker"}>
                          {item.work ? <NodeLink k={item.work} /> : <span className="muted">{t.setlistType[item.type] ?? item.type}{item.label ? ` · ${item.label}` : ""}</span>}
                          {item.titleRaw && <span className="muted">{item.titleRaw}</span>}
                          {item.performers.length > 0 && <Performers list={item.performers} />}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </article>
        ))}
      </Section>
    </>
  );
}

// --- venue -----------------------------------------------------------------------------------

function VenueData({ detail }: { detail: VenueDetail }) {
  const t = useT();
  const name = useNames();
  return (
    <>
      <Section title={t.tabs.data}>
        <KV rows={[[t.city, detail.city ? name(detail.city) : null]]} />
      </Section>
      <Section title={t.performances}>
        <ul className="dated-list">
          {detail.stops.map((s) => (
            <li key={`${s.concert}/${s.stop}`}>
              <span className="date tabular">{s.dates[0]}</span>
              <NodeLink k={s.concert} />
              <span className="muted small tabular">{s.dates.join(", ")}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
