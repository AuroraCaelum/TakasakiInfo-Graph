/**
 * What a share card says about a node (scripts/build-og.ts): its names, the few facts that tell
 * it apart, and counts of what it is linked to (for the preview's text), read from the built graph. A link preview can't
 * know its reader's language, so every label is in Japanese, Korean and English at once, and the
 * names in all three spellings. Names of other nodes (singers, venues, CVs) are the Japanese ones,
 * but for a venue's city.
 */

import type { ConcertDetail, GNode, GraphFile, NodeType, Relation } from "../../shared/graph";
import { DICTS, type Dict, type UiLang } from "../../src/i18n";
import { pictogramOf, type Pictogram } from "../../src/icons";

/** The order labels are written in: the data's own language first, then the site's readers. */
const LANGS: UiLang[] = ["ja", "ko", "en"];

/** One label in all three languages, `楽曲 · 곡 · Song`, each written once. */
export function tri(of: (d: Dict, lang: UiLang) => string | undefined): string {
  return [...new Set(LANGS.map((l) => of(DICTS[l], l)).filter((v): v is string => !!v))].join(" · ");
}

const triOf = (ja: string, ko: string, en: string) => tri((_, l) => ({ ja, ko, en })[l]);

export const LABEL = {
  songs: triOf("楽曲", "곡", "Songs"),
  releases: triOf("リリース", "발매물", "Releases"),
  concerts: triOf("公演", "공연", "Concerts"),
  singers: triOf("歌唱", "가창", "Singers"),
  performers: triOf("出演", "출연", "Performers"),
  artists: triOf("アーティスト", "아티스트", "Artists"),
  shows: triOf("公演日", "공연일", "Show days"),
  members: triOf("メンバー", "멤버", "Members"),
  units: triOf("ユニット", "유닛", "Units"),
  characters: triOf("キャラクター", "캐릭터", "Characters"),
  people: triOf("人物", "인물", "People"),
  venues: triOf("会場", "회장", "Venues"),
  lyrics: triOf("作詞", "작사", "Lyrics"),
  music: triOf("作曲", "작곡", "Music"),
  arrangement: triOf("編曲", "편곡", "Arrangement"),
} as const;

export type FactIcon = Pictogram | "calendar" | "clock" | "hat";

export interface CardFact {
  icon: FactIcon;
  text: string;
}

export interface CardStat {
  value: number;
  label: string;
}

export interface NodeCard {
  key: string;
  type: NodeType;
  picto: Pictogram;
  /** the node type, `楽曲 · 곡 · Song` */
  kind: string;
  /** subtype, outside the series, announced: each in all three languages */
  tags: string[];
  /** the Japanese name (or the first there is) */
  title: string;
  /** the other spellings: Korean, then the romanisation */
  alt: string[];
  facts: CardFact[];
  /** counts for the preview's text; the image leaves them out */
  stats: CardStat[];
  /** project ids, in the node's order */
  projects: string[];
  /** the group with a color of its own the node belongs to (GNode.g), shown for its project */
  group?: string;
}

interface Link {
  rel: Relation;
  other: GNode;
  w: number;
}

export interface CardIndex {
  nodes: Map<string, GNode>;
  /** fact links of every node, both directions */
  links: Map<string, Link[]>;
  concerts: Record<string, ConcertDetail>;
}

const DERIVED = new Set<Relation>(["co_credit", "co_perform", "shared_member"]);

export function cardIndex(graph: Pick<GraphFile, "nodes" | "edges">, concerts: Record<string, ConcertDetail>): CardIndex {
  const nodes = new Map(graph.nodes.map((n) => [n.k, n]));
  const links = new Map<string, Link[]>(graph.nodes.map((n) => [n.k, []]));
  for (const e of graph.edges) {
    if (DERIVED.has(e.r)) continue;
    const s = nodes.get(e.s);
    const t = nodes.get(e.t);
    if (!s || !t) continue;
    links.get(s.k)!.push({ rel: e.r, other: t, w: e.w });
    links.get(t.k)!.push({ rel: e.r, other: s, w: e.w });
  }
  return { nodes, links, concerts };
}

/** Every spelling once, Japanese first: `[ja, ko, rom]`. */
export function spellings(n: GNode): string[] {
  return [...new Set([n.n.ja, n.n.ko, n.n.rom].filter((v): v is string => !!v?.trim()))];
}

const jaName = (n: GNode) => n.n.ja || n.n.rom || n.n.ko || n.k;

/** `A / B / C +4`: the first few names of a list. */
function nameList(nodes: GNode[], max: number): string {
  const shown = nodes.slice(0, max).map(jaName).join(" / ");
  return nodes.length > max ? `${shown} +${nodes.length - max}` : shown;
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** `08-03` → `8月3日 · 8월 3일 · August 3` */
export function birthdayText(bd: string): string {
  const [m, d] = bd.split("-").map(Number);
  return `${m}月${d}日 · ${m}월 ${d}일 · ${MONTHS_EN[m - 1]} ${d}`;
}

/** `275` → `4:35` */
export const durationText = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

function subtypeOf(t: Dict, n: GNode): string | undefined {
  if (!n.s) return undefined;
  const en = DICTS.en;
  if (n.t === "release") return t.releaseType[n.s] ?? en.releaseType[n.s] ?? n.s.replace(/_/g, " ");
  if (n.t === "work" && n.s !== "song") return t.workKind[n.s] ?? n.s;
  if (n.t === "artist") return t.artistKind[n.s] ?? en.artistKind[n.s] ?? n.s.replace(/_/g, " ");
  return undefined;
}

export function nodeCard(n: GNode, ix: CardIndex): NodeCard {
  const links = ix.links.get(n.k) ?? [];
  const linked = (rels: Relation[], types?: NodeType[]) => {
    const seen = new Map<string, { node: GNode; w: number }>();
    for (const l of links) {
      if (!rels.includes(l.rel) || (types && !types.includes(l.other.t))) continue;
      const prev = seen.get(l.other.k);
      seen.set(l.other.k, { node: l.other, w: (prev?.w ?? 0) + l.w });
    }
    // strongest first, then the more central node
    return [...seen.values()].sort((a, b) => b.w - a.w || b.node.m.pr - a.node.m.pr).map((x) => x.node);
  };
  const count = (rels: Relation[], types?: NodeType[]) => linked(rels, types).length;
  const weight = (rel: Relation) => links.filter((l) => l.rel === rel).reduce((sum, l) => sum + l.w, 0);

  const facts: CardFact[] = [];
  const fact = (icon: FactIcon, text: string | undefined) => {
    if (text) facts.push({ icon, text });
  };
  const stats: CardStat[] = [];
  const stat = (label: string, value: number) => stats.push({ label, value });

  switch (n.t) {
    case "work": {
      // the credited artists when there are any, else whoever sang it
      const singers = linked(["performer"]);
      const artists = singers.filter((x) => x.t === "artist");
      fact("artist", nameList(artists.length ? artists : singers, 3));
      fact("calendar", n.d);
      const au = n.au;
      if (au) fact("clock", [au.dur && durationText(au.dur), au.key, au.bpm && `${Math.round(au.bpm)} BPM`].filter(Boolean).join(" · "));
      stat(LABEL.releases, count(["track"]));
      stat(LABEL.concerts, count(["setlist"]));
      stat(LABEL.singers, singers.length);
      break;
    }
    case "release":
      fact("artist", nameList(linked(["release_artist"]), 3));
      fact("calendar", n.d);
      stat(LABEL.songs, count(["track"]));
      stat(LABEL.artists, count(["release_artist"]));
      break;
    case "concert": {
      const dates = (ix.concerts[n.k]?.stops ?? []).flatMap((s) => s.performances.map((p) => p.date)).sort();
      const first = dates[0] ?? n.d;
      const last = dates[dates.length - 1];
      fact("calendar", first && (last && last !== first ? `${first} – ${last}` : first));
      // venues in the order of the tour's stops
      const stops = (ix.concerts[n.k]?.stops ?? []).map((s) => s.venue && ix.nodes.get(s.venue)).filter((v): v is GNode => !!v);
      const venues = [...new Set([...stops, ...linked(["venue"])])];
      // one venue: with its city; a tour: the first venues
      const cityOf = venues.length === 1 ? (ix.links.get(venues[0].k) ?? []).find((l) => l.rel === "city")?.other : undefined;
      fact("venue", venues.length ? `${nameList(venues, 2)}${cityOf ? ` (${jaName(cityOf)})` : ""}` : undefined);
      stat(LABEL.shows, new Set(dates).size);
      stat(LABEL.songs, count(["setlist"]));
      stat(LABEL.performers, count(["appearance"]));
      stat(LABEL.venues, venues.length);
      break;
    }
    case "artist":
      fact("character", nameList(linked(["member"]), 5));
      fact("calendar", n.d);
      stat(LABEL.members, count(["member"]));
      stat(LABEL.songs, count(["performer"]));
      stat(LABEL.releases, count(["release_artist"]));
      stat(LABEL.concerts, count(["appearance"]));
      break;
    case "character": {
      const cv = linked(["cv"]);
      fact("person", cv.length ? `CV ${nameList(cv, 3)}` : undefined);
      fact("artist", nameList(linked(["member"]), 3));
      if (n.bd) fact("hat", birthdayText(n.bd));
      stat(LABEL.songs, count(["performer"]));
      stat(LABEL.concerts, count(["appearance"]));
      stat(LABEL.units, count(["member"]));
      break;
    }
    case "person": {
      const roles = linked(["cv"]);
      fact("character", roles.length ? `CV ${nameList(roles, 3)}` : undefined);
      if (n.bd) fact("hat", birthdayText(n.bd));
      stat(LABEL.lyrics, count(["lyricist"]));
      stat(LABEL.music, count(["composer"]));
      stat(LABEL.arrangement, count(["arranger", "strings_arranger", "brass_arranger"]));
      stat(LABEL.songs, count(["performer"]));
      stat(LABEL.concerts, count(["appearance"]));
      break;
    }
    case "project":
      fact("calendar", n.d);
      stat(LABEL.songs, count(["project"], ["work"]));
      stat(LABEL.releases, count(["project"], ["release"]));
      stat(LABEL.characters, count(["project"], ["character"]));
      stat(LABEL.concerts, count(["project"], ["concert"]));
      break;
    case "venue":
      // the city in every spelling, as there is room for it
      fact("city", linked(["city"])[0] && spellings(linked(["city"])[0]).join(" · "));
      stat(LABEL.concerts, count(["venue"]));
      stat(LABEL.shows, weight("venue"));
      break;
    case "city": {
      const venues = linked(["city"]);
      const concerts = new Set(venues.flatMap((v) => (ix.links.get(v.k) ?? []).filter((l) => l.rel === "venue").map((l) => l.other.k)));
      stat(LABEL.venues, venues.length);
      stat(LABEL.concerts, concerts.size);
      break;
    }
  }

  // counts that say something, at most four
  const shown = stats.filter((s) => s.value > 0).slice(0, 4);

  const tags = [
    ...(subtypeOf(DICTS.en, n) ? [tri((d) => subtypeOf(d, n))] : []),
    ...(n.ext ? [tri((d) => d.external)] : []),
    ...(n.st === "announced" ? [tri((d) => d.status.announced)] : []),
  ];

  const [title = n.k, ...alt] = spellings(n);
  return {
    key: n.k, type: n.t, picto: pictogramOf(n.t, n.s), kind: tri((d) => d.types[n.t]), tags,
    title, alt, facts, stats: shown, projects: n.ext ? [] : n.p, ...(n.g ? { group: n.g } : {}),
  };
}

/** The page title: every spelling, `ユメ語るよりユメ歌おう / 꿈을 말하기보다 꿈을 노래하자 / Yume Kataruyori Yume Utaou`. */
export const cardTitle = (c: NodeCard) => [c.title, ...c.alt].join(" / ");

/** The preview's text: what the node is, its facts, then its counts. */
export function cardDescription(c: NodeCard): string {
  const head = [c.kind, ...c.tags].join(" · ");
  const facts = c.facts.map((f) => f.text).join(" · ");
  const stats = c.stats.map((s) => `${s.label} ${s.value.toLocaleString("en-US")}`).join(" / ");
  return [head, facts, stats].filter(Boolean).join(" | ");
}
