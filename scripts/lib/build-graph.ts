/**
 * v1 dataset → graph nodes, fact edges, derived edges and per-node details.
 *
 * Edge rules (each is documented on the site's legend as well):
 * - lyricist / composer: credited on the work, or on a recording through `credits_override`. w = 1.
 * - arranger / strings_arranger / brass_arranger / performer: credited on a recording of the
 *   work. w = number of recordings, Off Vocal and instrumental excluded (they repeat the vocal
 *   recording's credit), at least 1.
 * - member: character in a lineup of the artist; periods merged across lineups. w = 1.
 * - cv: casting of the character; periods from the casting. w = 1.
 * - track: a recording of the work is on the release. w = distinct recordings on the release.
 * - release_artist: the release's artist credit. w = 1.
 * - setlist: the work was performed at the concert. w = performances (days) it was performed on.
 * - appearance: an artist, character or person sang in the concert's set lists (featured guests
 *   and joint names included). w = performances (days) they sang on.
 * - venue: the concert had a stop at the venue. w = performances at the venue.
 * - city: the venue is in the city. w = 1.
 * - project: the node's own project field. w = 1. The external project (works and characters
 *   outside the series) is not a hub: those nodes take the projects of what they are linked to.
 * Derived:
 * - co_credit: two persons both credited (lyricist, composer, any arranger role) on a work. w = works.
 * - co_perform: two characters both singing a work. Artists count as their lineup at the
 *   recording's first release date; a person singing in a role counts as the role. w = works.
 * - shared_member: two artists whose lineups share characters. w = shared characters.
 */

import {
  ARRANGER_ROLES, EXTERNAL_PROJECT, isDerived,
  type ArrangerRole, type ArtistDetail, type CharacterDetail, type CityDetail, type ConcertDetail, type CreditRef, type Detail,
  type GEdge, type GNode, type LinkRef, type NodeType, type Period, type PerformerRef, type PersonDetail, type ProjectDetail,
  type Relation, type ReleaseDetail, type ReleaseTrack, type SetlistEntry, type VenueDetail, type WorkAppearance, type WorkDetail,
  type WorkPerformance,
} from "../../shared/graph";
import type * as V from "../../shared/v1";
import { inPeriod, mergePeriods, minDate } from "./dates";

export type NodeDraft = Omit<GNode, "x" | "y" | "m">;

export interface BuiltGraph {
  nodes: Map<string, NodeDraft>;
  edges: GEdge[];
  details: Map<string, Detail>;
  warnings: string[];
}

export const nodeKey = (t: NodeType, id: string) => `${t}:${id}`;

const INSTRUMENTAL = new Set(["off_vocal", "instrumental"]);

interface EdgeAcc {
  s: string;
  t: string;
  r: Relation;
  w: number;
  d?: string;
  pd: Period[];
  via: Set<string>;
}

const sortedUnique = (xs: Iterable<string>) => [...new Set(xs)].sort();
/** The projects a node is drawn under: the external project is not one (see EXTERNAL_PROJECT). */
const ownProjects = (ps: string[]) => sortedUnique(ps.filter((p) => p !== EXTERNAL_PROJECT));
const isExternal = (ps: string[]) => ps.length > 0 && ps.every((p) => p === EXTERNAL_PROJECT);
const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

export function buildGraph(ds: V.V1Dataset): BuiltGraph {
  const warnings = new Set<string>(); // a reference is resolved for edges and for details: report it once
  const nodes = new Map<string, NodeDraft>();
  const details = new Map<string, Detail>();
  const edges = new Map<string, EdgeAcc>();

  const artists = new Map(ds.artists.map((a) => [a.id, a]));

  const addNode = (n: NodeDraft) => {
    if (nodes.has(n.k)) warnings.add(`duplicate node ${n.k}`);
    nodes.set(n.k, n);
  };

  const ext = (ps: string[]) => (isExternal(ps) ? { ext: true as const } : {});
  for (const p of ds.projects) {
    if (p.id !== EXTERNAL_PROJECT) addNode({ k: nodeKey("project", p.id), t: "project", n: p.names, p: [p.id] });
  }
  for (const p of ds.persons) {
    const al = (p.aliases ?? []).map((a) => a.text);
    addNode({ k: nodeKey("person", p.id), t: "person", n: p.names, p: [], ...(al.length ? { al } : {}) });
  }
  for (const c of ds.characters) {
    addNode({ k: nodeKey("character", c.id), t: "character", n: c.names, p: ownProjects([c.project]), ...ext([c.project]) });
  }
  for (const a of ds.artists) {
    const ps = a.projects ?? [];
    addNode({ k: nodeKey("artist", a.id), t: "artist", n: a.names, p: ownProjects(ps), s: a.kind, ...ext(ps) });
  }
  for (const w of ds.works) {
    addNode({ k: nodeKey("work", w.id), t: "work", n: w.title, p: ownProjects([w.project]), s: w.kind ?? "song", ...ext([w.project]) });
  }
  for (const r of ds.releases) {
    addNode({
      k: nodeKey("release", r.id), t: "release", n: r.title, p: ownProjects(r.projects),
      s: r.type ?? "unclassified", st: r.status ?? "released", ...ext(r.projects),
    });
  }
  for (const c of ds.concerts) {
    addNode({ k: nodeKey("concert", c.id), t: "concert", n: c.title, p: ownProjects(c.projects), st: c.status ?? "settled", ...ext(c.projects) });
  }
  for (const v of ds.venues) addNode({ k: nodeKey("venue", v.id), t: "venue", n: v.names, p: [] });
  for (const c of ds.cities) addNode({ k: nodeKey("city", c.id), t: "city", n: c.names, p: [] });

  /** `person:x` / `character:x` / `artist:x` from a credit or performer, if the target exists. */
  const refOf = (x: { person?: string; character?: string; artist?: string }, where: string): string | null => {
    const [t, id] = x.artist ? ["artist", x.artist] : x.character ? ["character", x.character] : ["person", x.person];
    const k = nodeKey(t as NodeType, id ?? "");
    if (!id || !nodes.has(k)) {
      warnings.add(`${where}: unknown reference ${k}`);
      return null;
    }
    return k;
  };
  const checked = (k: string, where: string): string | null => {
    if (nodes.has(k)) return k;
    warnings.add(`${where}: unknown reference ${k}`);
    return null;
  };

  const addEdge = (r: Relation, s: string, t: string, opts: { w?: number; d?: string; pd?: Period[]; via?: string[] } = {}) => {
    const id = `${r}|${s}|${t}`;
    let e = edges.get(id);
    if (!e) {
      e = { s, t, r, w: 0, pd: [], via: new Set() };
      edges.set(id, e);
    }
    e.w += opts.w ?? 1;
    e.d = minDate(e.d, opts.d);
    if (opts.pd) e.pd.push(...opts.pd);
    for (const v of opts.via ?? []) e.via.add(v);
  };
  /** Membership edges to the node's own projects; the external project is not a hub. */
  const linkProjects = (k: string, projects: string[], where: string, d?: string) => {
    for (const p of projects) {
      if (p === EXTERNAL_PROJECT) continue;
      if (nodes.has(nodeKey("project", p))) addEdge("project", k, nodeKey("project", p), { d });
      else warnings.add(`${where}: unknown project ${p}`);
    }
  };

  // --- dates from the tracks view ----------------------------------------------------------
  const recDate = new Map<string, string>();
  const releaseDate = new Map<string, string>();
  for (const row of ds.tracks) {
    if (!row.release_date) continue;
    recDate.set(row.recording, minDate(recDate.get(row.recording), row.release_date)!);
    releaseDate.set(row.release, minDate(releaseDate.get(row.release), row.release_date)!);
  }
  for (const r of ds.releases) {
    const d = minDate(r.release_date, releaseDate.get(r.id));
    if (d) releaseDate.set(r.id, d);
  }
  const performedOn = new Map<string, string>(); // work id → first performance date
  for (const c of ds.concerts) {
    for (const s of c.stops) {
      for (const p of s.performances) {
        for (const item of p.setlist ?? []) {
          if (item.work) performedOn.set(item.work, minDate(performedOn.get(item.work), p.date)!);
        }
      }
    }
  }
  const workDate = new Map<string, string>();
  for (const w of ds.works) {
    let d = performedOn.get(w.id);
    for (const rec of w.recordings) d = minDate(d, recDate.get(`${w.id}#${rec.id}`));
    if (d) workDate.set(w.id, d);
  }
  const recordingDate = (workId: string, recId: string) => recDate.get(`${workId}#${recId}`) ?? workDate.get(workId);

  // --- works: credits and performers -----------------------------------------------------
  const mainLinks = new Map(ds.recordings.map((r) => [r.id, r.main_link]));
  const coCredit = new Map<string, { a: string; b: string; works: Set<string>; d?: string }>();
  const coPerform = new Map<string, { a: string; b: string; works: Set<string>; d?: string }>();
  const personExtra = new Map<string, Pick<PersonDetail, "affiliations" | "arranged" | "sungAs">>();
  const extraOf = (k: string) => {
    let x = personExtra.get(k);
    if (!x) personExtra.set(k, (x = { affiliations: [], arranged: [], sungAs: [] }));
    return x;
  };
  const playedBy = new Map<string, Map<string, Set<string>>>(); // character → person → works

  const toCreditRef = (c: V.Credit, where: string): CreditRef | null => {
    const ref = refOf(c, where);
    if (!ref) return null;
    return {
      ref, ...(c.affiliation ? { affiliation: c.affiliation } : {}), ...(c.affiliation && c.fullwidth ? { fullwidth: true as const } : {}),
      ...(c.role ? { role: c.role } : {}),
    };
  };
  const creditRefs = (list: V.Credit[] | undefined, where: string) =>
    (list ?? []).map((c) => toCreditRef(c, where)).filter((x): x is CreditRef => !!x);
  const toPerformerRef = (p: V.Performer, where: string): PerformerRef | null => {
    const ref = refOf(p, where);
    if (!ref) return null;
    const role = p.role ? checked(nodeKey("character", p.role), where) : null;
    return {
      ref, ...(role ? { role } : {}), ...(p.featured ? { featured: true as const } : {}), ...(p.joint ? { joint: true as const } : {}),
    };
  };

  /** Characters singing a recording: artists expanded to the lineup at `date` (co_perform). */
  const singersOf = (performers: V.Performer[], date: string | undefined): string[] => {
    const out: string[] = [];
    for (const p of performers) {
      if (p.character) out.push(nodeKey("character", p.character));
      else if (p.person && p.role) out.push(nodeKey("character", p.role));
      else if (p.artist) {
        for (const l of artists.get(p.artist)?.lineups ?? []) {
          if (inPeriod(date, [l.from ?? null, l.until ?? null])) out.push(...l.members.map((m) => nodeKey("character", m)));
        }
      }
    }
    return out.filter((k) => nodes.has(k));
  };

  for (const w of ds.works) {
    const wk = nodeKey("work", w.id);
    const wd = workDate.get(w.id);
    const where = `work ${w.id}`;

    const writers: Record<"lyricist" | "composer", Set<string>> = { lyricist: new Set(), composer: new Set() };
    const credited = new Set<string>(); // persons, for co_credit
    const affiliations: { ref: string; affiliation: string | V.Names; fullwidth: boolean }[] = [];
    const collect = (credits: V.WorkCredits | undefined, w2: string) => {
      for (const role of ["lyricist", "composer"] as const) {
        for (const c of credits?.[role] ?? []) {
          const ref = refOf(c, w2);
          if (!ref) continue;
          writers[role].add(ref);
          if (ref.startsWith("person:")) credited.add(ref);
          if (c.affiliation && ref.startsWith("person:")) affiliations.push({ ref, affiliation: c.affiliation, fullwidth: !!c.fullwidth });
        }
      }
    };
    collect(w.credits, where);

    const arranged = Object.fromEntries(ARRANGER_ROLES.map((r) => [r, new Map<string, string[]>()])) as
      Record<ArrangerRole, Map<string, string[]>>; // role → ref → recordings
    const performed = new Map<string, string[]>();
    const recordings = [];
    const workSingers = new Set<string>();
    for (const rec of w.recordings) {
      const rwhere = `${where}#${rec.id}`;
      const counts = !INSTRUMENTAL.has(rec.kind ?? "vocal");
      if (rec.credits_override) collect(rec.credits_override, rwhere);
      for (const role of ARRANGER_ROLES) {
        for (const c of rec[role] ?? []) {
          const ref = refOf(c, rwhere);
          if (!ref) continue;
          arranged[role].set(ref, [...(arranged[role].get(ref) ?? []), rec.id]);
          if (ref.startsWith("person:")) credited.add(ref);
          if (c.affiliation && ref.startsWith("person:")) affiliations.push({ ref, affiliation: c.affiliation, fullwidth: !!c.fullwidth });
        }
      }
      for (const p of rec.performers ?? []) {
        const ref = refOf(p, rwhere);
        if (!ref) continue;
        performed.set(ref, [...(performed.get(ref) ?? []), rec.id]);
        if (p.person && p.role) {
          const role = checked(nodeKey("character", p.role), rwhere);
          if (role) {
            const x = extraOf(ref).sungAs;
            const prev = x.find((s) => s.work === wk && s.role === role);
            if (prev) prev.recs.push(rec.id);
            else x.push({ work: wk, role, recs: [rec.id] });
            const byPerson = playedBy.get(role) ?? new Map<string, Set<string>>();
            byPerson.set(ref, (byPerson.get(ref) ?? new Set()).add(wk));
            playedBy.set(role, byPerson);
          }
        }
      }
      if (counts) for (const s of singersOf(rec.performers ?? [], recordingDate(w.id, rec.id))) workSingers.add(s);
      recordings.push({
        id: rec.id,
        kind: rec.kind ?? "vocal",
        ...(rec.title ? { title: rec.title } : {}),
        ...(rec.version ? { version: rec.version } : {}),
        performers: (rec.performers ?? []).map((p) => toPerformerRef(p, rwhere)).filter((x): x is PerformerRef => !!x),
        arranger: creditRefs(rec.arranger, rwhere),
        ...(rec.strings_arranger?.length ? { strings_arranger: creditRefs(rec.strings_arranger, rwhere) } : {}),
        ...(rec.brass_arranger?.length ? { brass_arranger: creditRefs(rec.brass_arranger, rwhere) } : {}),
        ...(rec.credits_override ? {
          override: {
            lyricist: (rec.credits_override.lyricist ?? []).map((c) => toCreditRef(c, rwhere)).filter((x): x is CreditRef => !!x),
            composer: (rec.credits_override.composer ?? []).map((c) => toCreditRef(c, rwhere)).filter((x): x is CreditRef => !!x),
          },
        } : {}),
        ...(rec.instrumental_of ? { instrumentalOf: rec.instrumental_of } : {}),
        ...(rec.external_ids && Object.keys(rec.external_ids).length ? { externalIds: rec.external_ids } : {}),
        ...(mainLinks.get(`${w.id}#${rec.id}`) ? { mainLink: mainLinks.get(`${w.id}#${rec.id}`)! } : {}),
        ...(rec.evidence && Object.keys(rec.evidence).length ? { evidence: rec.evidence } : {}),
      });
    }

    for (const role of ["lyricist", "composer"] as const) {
      for (const ref of writers[role]) addEdge(role, ref, wk, { d: wd });
    }
    const kindOf = new Map(w.recordings.map((r) => [r.id, r.kind ?? "vocal"]));
    const weightOf = (recs: string[]) => Math.max(1, new Set(recs.filter((r) => !INSTRUMENTAL.has(kindOf.get(r)!))).size);
    const firstDate = (recs: string[]) => recs.reduce<string | undefined>((d, r) => minDate(d, recordingDate(w.id, r)), undefined) ?? wd;
    for (const role of ARRANGER_ROLES) {
      for (const [ref, recs] of arranged[role]) {
        addEdge(role, ref, wk, { w: weightOf(recs), d: firstDate(recs) });
        if (ref.startsWith("person:") && recs.length < w.recordings.length) extraOf(ref).arranged.push({ work: wk, role, recs });
      }
    }
    for (const [ref, recs] of performed) addEdge("performer", ref, wk, { w: weightOf(recs), d: firstDate(recs) });
    for (const { ref, affiliation, fullwidth } of affiliations) {
      const list = extraOf(ref).affiliations;
      if (!list.some((a) => a.work === wk && JSON.stringify(a.affiliation) === JSON.stringify(affiliation))) {
        list.push({ work: wk, affiliation, ...(fullwidth ? { fullwidth: true as const } : {}) });
      }
    }

    // derived: co_credit and co_perform
    const pairUp = (members: Set<string>, into: typeof coCredit) => {
      const xs = [...members].sort();
      for (let i = 0; i < xs.length; i++) {
        for (let j = i + 1; j < xs.length; j++) {
          const pk = pairKey(xs[i], xs[j]);
          const acc = into.get(pk) ?? { a: xs[i], b: xs[j], works: new Set<string>() };
          acc.works.add(wk);
          acc.d = minDate(acc.d, wd);
          into.set(pk, acc);
        }
      }
    };
    pairUp(credited, coCredit);
    pairUp(workSingers, coPerform);

    linkProjects(wk, [w.project], where, wd);

    details.set(wk, {
      t: "work",
      kind: w.kind ?? "song",
      project: w.project,
      title: w.title,
      credits: {
        lyricist: (w.credits?.lyricist ?? []).map((c) => toCreditRef(c, where)).filter((x): x is CreditRef => !!x),
        composer: (w.credits?.composer ?? []).map((c) => toCreditRef(c, where)).filter((x): x is CreditRef => !!x),
      },
      recordings,
      appearances: [],
      performances: [],
      ...(w.external_ids && Object.keys(w.external_ids).length ? { externalIds: w.external_ids } : {}),
      ...(w.evidence ? { evidence: w.evidence } : {}),
    } satisfies WorkDetail);
  }

  // --- characters: casting, project --------------------------------------------------------
  for (const c of ds.characters) {
    const ck = nodeKey("character", c.id);
    for (const cast of c.casting ?? []) {
      const pk = checked(nodeKey("person", cast.person), `character ${c.id}`);
      if (pk) addEdge("cv", ck, pk, { pd: [[cast.from ?? null, cast.until ?? null]], d: cast.from });
    }
    linkProjects(ck, [c.project], `character ${c.id}`);
  }

  // --- artists: lineups, projects ----------------------------------------------------------
  const membersOf = new Map<string, Set<string>>();
  for (const a of ds.artists) {
    const ak = nodeKey("artist", a.id);
    const periods = new Map<string, Period[]>();
    for (const l of a.lineups ?? []) {
      for (const m of l.members) {
        const mk = checked(nodeKey("character", m), `artist ${a.id}`);
        if (!mk) continue;
        periods.set(mk, [...(periods.get(mk) ?? []), [l.from ?? null, l.until ?? null]]);
      }
    }
    for (const [mk, pd] of periods) {
      const merged = mergePeriods(pd);
      addEdge("member", mk, ak, { pd: merged, d: merged[0]?.[0] ?? undefined });
    }
    membersOf.set(ak, new Set(periods.keys()));
    linkProjects(ak, a.projects ?? [], `artist ${a.id}`);
  }

  // --- releases: tracks, artist credit ---------------------------------------------------------
  const rowsByRelease = new Map<string, V.TrackRow[]>();
  for (const row of ds.tracks) rowsByRelease.set(row.release, [...(rowsByRelease.get(row.release) ?? []), row]);
  const appearances = new Map<string, Map<string, WorkAppearance>>(); // work key → release key → appearance

  for (const r of ds.releases) {
    const rk = nodeKey("release", r.id);
    const rd = releaseDate.get(r.id);
    const where = `release ${r.id}`;
    const rows = rowsByRelease.get(r.id) ?? [];
    if (!rows.length) warnings.add(`${where}: no rows in tracks.json`);

    const recsByWork = new Map<string, Set<string>>();
    for (const row of rows) {
      const wk = checked(nodeKey("work", row.work), where);
      if (!wk) continue;
      recsByWork.set(wk, (recsByWork.get(wk) ?? new Set()).add(row.recording));
      const byRelease = appearances.get(wk) ?? new Map<string, WorkAppearance>();
      const ap = byRelease.get(rk) ?? { release: rk, ...(rd ? { date: rd } : {}), tracks: [] };
      const link: LinkRef = { url: row.link.youtube_music, src: row.link.source };
      const recId = row.recording.slice(row.recording.indexOf("#") + 1);
      const same = ap.tracks.find((t) => t.rec === recId && t.disc === row.disc && t.pos === row.position
        && t.link.url === link.url && t.link.src === link.src);
      if (same) { if (row.edition) same.editions.push(row.edition); }
      else ap.tracks.push({ rec: recId, editions: row.edition ? [row.edition] : [], disc: row.disc, pos: row.position, no: row.no, link });
      byRelease.set(rk, ap);
      appearances.set(wk, byRelease);
    }
    for (const [wk, recs] of recsByWork) addEdge("track", wk, rk, { w: recs.size, d: rd });

    const artistCredit: PerformerRef[] = [];
    for (const p of r.artist_credit ?? []) {
      const pr = toPerformerRef(p, where);
      if (!pr) continue;
      artistCredit.push(pr);
      addEdge("release_artist", pr.ref, rk, { d: rd });
    }
    linkProjects(rk, r.projects, where, rd);

    // tracklists: one per edition, then editions with the same tracklist and links grouped
    const byEdition = new Map<string, V.TrackRow[]>();
    for (const row of rows) byEdition.set(row.edition ?? "", [...(byEdition.get(row.edition ?? "") ?? []), row]);
    const groups = new Map<string, { editions: string[]; rows: V.TrackRow[] }>();
    for (const [ed, erows] of byEdition) {
      const sig = JSON.stringify(erows.map((x) => [x.disc, x.position, x.recording, x.no, x.link.youtube_music, x.link.source, x.note]));
      const g = groups.get(sig) ?? { editions: [], rows: erows };
      if (ed) g.editions.push(ed);
      groups.set(sig, g);
    }
    const tracklists = [...groups.values()].map((g) => {
      const discs = new Map<number, ReleaseTrack[]>();
      for (const row of [...g.rows].sort((a, b) => a.disc - b.disc || a.position - b.position)) {
        discs.set(row.disc, [...(discs.get(row.disc) ?? []), {
          pos: row.position, no: row.no, work: nodeKey("work", row.work),
          rec: row.recording.slice(row.recording.indexOf("#") + 1), kind: row.kind, title: row.title,
          ...(row.version ? { version: row.version } : {}),
          link: { url: row.link.youtube_music, src: row.link.source },
          ...(row.note ? { note: row.note } : {}),
        }]);
      }
      return { editions: g.editions, discs: [...discs].map(([disc, tracks]) => ({ disc, tracks })) };
    });

    details.set(rk, {
      t: "release",
      type: r.type ?? "unclassified",
      status: r.status ?? "released",
      title: r.title,
      projects: r.projects,
      artistCredit,
      ...(r.label ? { label: r.label } : {}),
      ...(r.release_date ? { date: r.release_date } : {}),
      editions: (r.editions ?? []).map((e) => ({
        id: e.id, ...(e.label ? { label: e.label } : {}), ...(e.catalog ? { catalog: e.catalog } : {}),
        media: e.media ?? [], ...(e.release_date ? { date: e.release_date } : {}),
      })),
      tracklists,
      streaming: (r.streaming ?? []).filter((s) => s.browse_id).map((s) => ({
        editions: s.editions ?? [], url: `https://music.youtube.com/browse/${s.browse_id}`,
      })),
      links: r.links ?? {},
      ...(r.evidence ? { evidence: r.evidence } : {}),
    } satisfies ReleaseDetail);
  }
  for (const [wk, byRelease] of appearances) {
    const d = details.get(wk) as WorkDetail | undefined;
    if (d) d.appearances = [...byRelease.values()].sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9") || a.release.localeCompare(b.release));
  }

  // --- concerts: setlists, appearances, venues ------------------------------------------------
  const recVersion = new Map<string, string | undefined>(ds.works.flatMap((w) => w.recordings.map((r) => [`${w.id}#${r.id}`, r.version] as const)));
  const venueStops = new Map<string, VenueDetail["stops"]>();
  const cityStops = new Map<string, CityDetail["stops"]>();
  for (const c of ds.concerts) {
    const ck = nodeKey("concert", c.id);
    const where = `concert ${c.id}`;
    const perfDays = new Map<string, { n: number; d?: string }>(); // work key → performances
    const appeared = new Map<string, { n: number; d?: string }>(); // performer key → performances
    const count = (into: typeof perfDays, k: string, date: string) => {
      const acc = into.get(k) ?? { n: 0 };
      acc.n += 1;
      acc.d = minDate(acc.d, date);
      into.set(k, acc);
    };
    const stops: ConcertDetail["stops"] = [];
    for (const s of c.stops) {
      const swhere = `${where}/${s.id}`;
      // an online-only show has neither city nor venue (D47)
      const vk = s.venue ? checked(nodeKey("venue", s.venue), swhere) : null;
      const cityKey = s.city ? checked(nodeKey("city", s.city), swhere) : null;
      const dates = s.performances.map((p) => p.date).sort();
      if (vk) {
        addEdge("venue", ck, vk, { w: s.performances.length, d: dates[0] });
        venueStops.set(vk, [...(venueStops.get(vk) ?? []), { concert: ck, stop: s.id, dates }]);
      }
      if (cityKey) cityStops.set(cityKey, [...(cityStops.get(cityKey) ?? []), { concert: ck, stop: s.id, ...(vk ? { venue: vk } : {}), dates }]);
      const performances = s.performances.map((p) => {
        const pwhere = `${swhere}/${p.date}`;
        const seen = new Set<string>();
        const sang = new Set<string>();
        const setlist = (p.setlist ?? []).map((item): SetlistEntry => {
          const wk = item.work ? checked(nodeKey("work", item.work), pwhere) : null;
          const rec = item.recording ? item.recording.slice(item.recording.indexOf("#") + 1) : undefined;
          const version = (item.recording ? recVersion.get(item.recording) : undefined) ?? item.version;
          if (wk && !seen.has(wk)) {
            seen.add(wk);
            count(perfDays, wk, p.date);
            const dd = details.get(wk) as WorkDetail | undefined;
            dd?.performances.push({
              concert: ck, stop: s.id, ...(vk ? { venue: vk } : {}), date: p.date,
              ...(rec ? { rec } : {}), ...(version ? { version } : {}),
            } satisfies WorkPerformance);
          }
          const performers = (item.performers ?? []).map((x) => toPerformerRef(x, pwhere)).filter((x): x is PerformerRef => !!x);
          for (const x of performers) sang.add(x.ref);
          return {
            type: item.type ?? "song",
            ...(wk ? { work: wk } : {}),
            ...(rec ? { rec } : {}),
            ...(version ? { version } : {}),
            ...(item.label ? { label: item.label } : {}),
            ...(item.title_raw ? { titleRaw: item.title_raw } : {}),
            performers,
          };
        });
        for (const k of sang) count(appeared, k, p.date);
        const fandom = p.external_ids?.fandom;
        return { date: p.date, ...(p.label ? { label: p.label } : {}), ...(fandom ? { fandom } : {}), setlist };
      });
      stops.push({ id: s.id, ...(cityKey ? { city: cityKey } : {}), ...(s.label ? { label: s.label } : {}), ...(vk ? { venue: vk } : {}), performances });
    }
    for (const [wk, { n, d }] of perfDays) addEdge("setlist", wk, ck, { w: n, d });
    for (const [k, { n, d }] of appeared) addEdge("appearance", k, ck, { w: n, d });
    linkProjects(ck, c.projects, where);
    details.set(ck, {
      t: "concert", title: c.title, status: c.status ?? "settled", projects: c.projects, stops,
      ...(c.external_ids && Object.keys(c.external_ids).length ? { externalIds: c.external_ids } : {}),
      ...(c.legacy?.event_code ? { eventCode: c.legacy.event_code } : {}),
      ...(c.evidence ? { evidence: c.evidence } : {}),
    } satisfies ConcertDetail);
  }

  // --- venues: cities --------------------------------------------------------------------------
  for (const v of ds.venues) {
    if (!v.city) continue;
    const vk = nodeKey("venue", v.id);
    const cityKey = checked(nodeKey("city", v.city), `venue ${v.id}`);
    const first = (venueStops.get(vk) ?? []).flatMap((x) => x.dates).sort()[0];
    if (cityKey) addEdge("city", vk, cityKey, { d: first });
  }
  for (const d of details.values()) {
    if (d.t === "work") d.performances.sort((a, b) => a.date.localeCompare(b.date) || a.concert.localeCompare(b.concert));
  }

  // --- derived edges -------------------------------------------------------------------------
  for (const { a, b, works, d } of coCredit.values()) addEdge("co_credit", a, b, { w: works.size, d, via: [...works] });
  for (const { a, b, works, d } of coPerform.values()) addEdge("co_perform", a, b, { w: works.size, d, via: [...works] });
  const artistKeys = [...membersOf.keys()].sort();
  for (let i = 0; i < artistKeys.length; i++) {
    for (let j = i + 1; j < artistKeys.length; j++) {
      const shared = [...membersOf.get(artistKeys[i])!].filter((m) => membersOf.get(artistKeys[j])!.has(m));
      if (shared.length) addEdge("shared_member", artistKeys[i], artistKeys[j], { w: shared.length, via: shared });
    }
  }

  // --- node dates and derived projects -------------------------------------------------------
  const edgeList = [...edges.values()];
  for (const r of ds.releases) { const d = releaseDate.get(r.id); if (d) nodes.get(nodeKey("release", r.id))!.d = d; }
  for (const [id, d] of workDate) nodes.get(nodeKey("work", id))!.d = d;
  for (const c of ds.concerts) {
    const d = c.stops.flatMap((s) => s.performances.map((p) => p.date)).sort()[0];
    if (d) nodes.get(nodeKey("concert", c.id))!.d = d;
  }
  const fixed = new Set<NodeType>(["release", "work", "concert", "project"]);
  for (const e of edgeList) {
    if (e.r === "project" || isDerived(e.r)) continue;
    const start = e.pd.length ? e.pd.reduce<string | undefined>((d, p) => (p[0] === null ? d : minDate(d, p[0])), e.d) : e.d;
    for (const k of [e.s, e.t]) {
      const n = nodes.get(k)!;
      if (!fixed.has(n.t)) n.d = minDate(n.d, start);
    }
  }
  // Nodes still undated (a character whose songs are credited to her unit, the CV of such a
  // character…) appear with their earliest dated neighbour; repeated until nothing changes.
  for (;;) {
    const inherited = new Map<string, string>();
    for (const e of edgeList) {
      if (e.r === "project" || isDerived(e.r)) continue;
      for (const [a, b] of [[e.s, e.t], [e.t, e.s]]) {
        const na = nodes.get(a)!;
        const db = nodes.get(b)!.d;
        if (!na.d && !fixed.has(na.t) && db) inherited.set(a, minDate(inherited.get(a), db)!);
      }
    }
    if (!inherited.size) break;
    for (const [k, d] of inherited) nodes.get(k)!.d = d;
  }
  // Persons, venues, cities and nodes outside the series take the projects of what they are
  // linked to, in an order where each step reads projects that are already known: external
  // works from their concerts and releases, then external characters and artists from their
  // works, then persons, then venues, then cities.
  const deriveProjects = (want: (n: NodeDraft) => boolean, relations: Relation[]) => {
    const derived = new Map<string, Set<string>>();
    for (const e of edgeList) {
      if (!relations.includes(e.r)) continue;
      for (const [k, from] of [[e.s, e.t], [e.t, e.s]]) {
        if (!want(nodes.get(k)!)) continue;
        const set = derived.get(k) ?? new Set<string>();
        for (const p of nodes.get(from)!.p) set.add(p);
        derived.set(k, set);
      }
    }
    for (const [k, set] of derived) nodes.get(k)!.p = [...set].sort();
  };
  const credits: Relation[] = ["lyricist", "composer", ...ARRANGER_ROLES];
  deriveProjects((n) => !!n.ext && n.t === "work", ["setlist", "track"]);
  deriveProjects((n) => !!n.ext && n.t !== "work", [...credits, "performer", "release_artist", "appearance", "member"]);
  deriveProjects((n) => n.t === "person", [...credits, "performer", "release_artist", "appearance", "cv"]);
  deriveProjects((n) => n.t === "venue", ["venue"]);
  deriveProjects((n) => n.t === "city", ["city"]);
  // A membership is dated by when the node is in that project: its own date, or for an artist
  // (which can belong to several projects) its first song, release, concert or member of that project.
  // A project exists from its first dated membership.
  const artistEdges = new Map<string, EdgeAcc[]>();
  for (const e of edgeList) {
    if (e.r !== "performer" && e.r !== "release_artist" && e.r !== "member" && e.r !== "appearance") continue;
    for (const k of [e.s, e.t]) if (k.startsWith("artist:")) artistEdges.set(k, [...(artistEdges.get(k) ?? []), e]);
  }
  const membershipDate = (k: string, project: string): string | undefined => {
    const n = nodes.get(k)!;
    if (n.t !== "artist") return n.d;
    let d: string | undefined;
    for (const e of artistEdges.get(k) ?? []) {
      const other = nodes.get(e.s === k ? e.t : e.s)!;
      if (other.p.includes(project)) d = minDate(d, e.r === "member" ? (e.pd[0]?.[0] ?? other.d) : e.d);
    }
    return d;
  };
  for (const e of edgeList) {
    if (e.r !== "project") continue;
    e.d = membershipDate(e.s, e.t.slice("project:".length));
    if (e.d) {
      const p = nodes.get(e.t)!;
      p.d = minDate(p.d, e.d);
    }
  }

  // --- remaining details ---------------------------------------------------------------------
  const counts = new Map<string, Partial<Record<NodeType, number>>>();
  for (const n of nodes.values()) {
    if (n.t === "project") continue;
    for (const p of n.p) {
      const c = counts.get(p) ?? {};
      c[n.t] = (c[n.t] ?? 0) + 1;
      counts.set(p, c);
    }
  }
  for (const p of ds.projects) {
    details.set(nodeKey("project", p.id), {
      t: "project", names: p.names, ...(p.legacy ? { legacy: p.legacy } : {}), copyright: p.copyright ?? [],
      official: p.official ?? {}, counts: counts.get(p.id) ?? {}, ...(p.evidence ? { evidence: p.evidence } : {}),
    } satisfies ProjectDetail);
  }
  for (const p of ds.persons) {
    const k = nodeKey("person", p.id);
    const x = personExtra.get(k) ?? { affiliations: [], arranged: [], sungAs: [] };
    details.set(k, {
      t: "person", names: p.names,
      ...(p.family_name ? { familyName: p.family_name } : {}), ...(p.given_name ? { givenName: p.given_name } : {}),
      nativeScript: p.native_script ?? "ja",
      aliases: (p.aliases ?? []).map((a) => ({ text: a.text, kind: a.kind ?? "variant", ...(a.note ? { note: a.note } : {}) })),
      distinctFrom: (p.distinct_from ?? []).map((id) => nodeKey("person", id)),
      ...x,
      ...(p.evidence ? { evidence: p.evidence } : {}),
    } satisfies PersonDetail);
  }
  const memberships = new Map<string, CharacterDetail["memberships"]>();
  for (const e of edgeList) {
    if (e.r === "member") memberships.set(e.s, [...(memberships.get(e.s) ?? []), { artist: e.t, periods: mergePeriods(e.pd) }]);
  }
  for (const c of ds.characters) {
    const k = nodeKey("character", c.id);
    details.set(k, {
      t: "character", names: c.names, project: c.project,
      ...(c.family_name ? { familyName: c.family_name } : {}), ...(c.given_name ? { givenName: c.given_name } : {}),
      casting: (c.casting ?? []).map((x) => ({
        person: nodeKey("person", x.person), ...(x.from ? { from: x.from } : {}), ...(x.until ? { until: x.until } : {}),
      })),
      memberships: memberships.get(k) ?? [],
      playedBy: [...(playedBy.get(k) ?? new Map<string, Set<string>>())].map(([person, works]) => ({ person, works: [...works].sort() })),
      distinctFrom: (c.distinct_from ?? []).map((id) => nodeKey("character", id)),
      ...(c.evidence ? { evidence: c.evidence } : {}),
    } satisfies CharacterDetail);
  }
  for (const a of ds.artists) {
    details.set(nodeKey("artist", a.id), {
      t: "artist", kind: a.kind, names: a.names, projects: a.projects ?? [],
      lineups: (a.lineups ?? []).map((l) => ({
        ...(l.from ? { from: l.from } : {}), ...(l.until ? { until: l.until } : {}),
        members: l.members.map((m) => nodeKey("character", m)),
      })),
      distinctFrom: (a.distinct_from ?? []).map((id) => nodeKey("artist", id)),
      ...(a.evidence ? { evidence: a.evidence } : {}),
    } satisfies ArtistDetail);
  }
  for (const v of ds.venues) {
    const k = nodeKey("venue", v.id);
    details.set(k, {
      t: "venue", names: v.names, ...(v.city && nodes.has(nodeKey("city", v.city)) ? { city: nodeKey("city", v.city) } : {}),
      ...(v.external_ids && Object.keys(v.external_ids).length ? { externalIds: v.external_ids } : {}),
      stops: venueStops.get(k) ?? [],
      ...(v.evidence && Object.keys(v.evidence).length ? { evidence: v.evidence } : {}),
    } satisfies VenueDetail);
  }
  for (const c of ds.cities) {
    const k = nodeKey("city", c.id);
    details.set(k, {
      t: "city", names: c.names,
      stops: (cityStops.get(k) ?? []).sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.concert.localeCompare(b.concert)),
      ...(c.evidence && Object.keys(c.evidence).length ? { evidence: c.evidence } : {}),
    } satisfies CityDetail);
  }

  const out: GEdge[] = edgeList
    .map((e) => ({
      s: e.s, t: e.t, r: e.r, w: e.w,
      ...(e.d ? { d: e.d } : {}),
      ...(e.pd.length && !(e.pd.length === 1 && e.pd[0][0] === null && e.pd[0][1] === null) ? { pd: mergePeriods(e.pd) } : {}),
      ...(e.via.size ? { via: [...e.via].sort() } : {}),
    }))
    .sort((a, b) => a.r.localeCompare(b.r) || a.s.localeCompare(b.s) || a.t.localeCompare(b.t));
  return { nodes, edges: out, details, warnings: [...warnings] };
}
