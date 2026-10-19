/**
 * Output contract: what `scripts/build-data.ts` writes to `public/data/` and the site reads.
 *
 * - `graph.json`: every node and every edge, with precomputed layout and metrics.
 * - `detail/<type>.json`: per-node data that the graph does not carry (titles in every language,
 *   recordings, tracklists, setlists, evidence…), loaded when a node of that type is opened.
 *
 * Node keys are `<type>:<id>`, the same form the v1 views use for references (`person:aki-hata`).
 */

import type { Copyright, EvidenceMap, Names, RecordingKind } from "./v1";

export const GRAPH_FORMAT = 1;

export const NODE_TYPES = ["project", "artist", "character", "person", "work", "release", "concert", "venue"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/**
 * Fact edges come only from relation rows in the data (DESIGN.md §10.7). Direction is
 * `s → t` as listed here; the graph is drawn undirected.
 */
export const FACT_RELATIONS = [
  "lyricist", //       person | character → work
  "composer", //       person | character → work
  "arranger", //       person | character → work   (any recording of the work)
  "strings_arranger", // person | character → work (any recording of the work)
  "brass_arranger", // person | character → work   (any recording of the work)
  "performer", //      artist | character | person → work (any recording of the work)
  "member", //         character → artist          (lineup periods)
  "cv", //             character → person          (casting periods)
  "track", //          work → release              (a recording of the work is on the release)
  "release_artist", // artist | character | person → release (artist_credit)
  "setlist", //        work → concert              (performed at the concert)
  "venue", //          concert → venue
  "project", //        any → project               (own project field)
] as const;

/** Derived edges are computed by documented rules and always drawn apart from facts (§10.7). */
export const DERIVED_RELATIONS = [
  "co_credit", //      person ↔ person: works both wrote, composed or arranged (any arrangement role)
  "co_perform", //     character ↔ character: works both sang (artists expanded to their lineup)
  "shared_member", //  artist ↔ artist: characters in both lineups
] as const;

export type FactRelation = (typeof FACT_RELATIONS)[number];

/** Recording-level arrangement credits, each its own relation. */
export const ARRANGER_ROLES = ["arranger", "strings_arranger", "brass_arranger"] as const;
export type ArrangerRole = (typeof ARRANGER_ROLES)[number];
export type DerivedRelation = (typeof DERIVED_RELATIONS)[number];
export type Relation = FactRelation | DerivedRelation;

export const isDerived = (r: Relation): r is DerivedRelation => (DERIVED_RELATIONS as readonly string[]).includes(r);

/** An inclusive period; `null` is open-ended. */
export type Period = [from: string | null, until: string | null];

export interface Metrics {
  /** distinct neighbours over fact edges, project membership excluded */
  deg: number;
  /** sum of fact-edge weights, project membership excluded */
  wdeg: number;
  /** weighted PageRank on the same graph */
  pr: number;
  /** normalised betweenness centrality on the same graph (unweighted) */
  bc: number;
  /** Louvain community id (index into GraphFile.communities) */
  cm: number;
}

export interface GNode {
  /** key: `<type>:<id>` */
  k: string;
  t: NodeType;
  /** names; for works and releases the title */
  n: Names;
  /** extra search strings (person aliases) */
  al?: string[];
  /** projects: the node's own, or for persons and venues the projects of what they are linked to */
  p: string[];
  /** subtype: work kind, release type, artist kind */
  s?: string;
  /** first date the node exists in the data (ISO), for the time slider */
  d?: string;
  /** release or concert status */
  st?: string;
  x: number;
  y: number;
  m: Metrics;
}

export interface GEdge {
  s: string;
  t: string;
  r: Relation;
  /** weight: how many works, recordings, performances… support the edge (documented per relation) */
  w: number;
  /** first date the edge exists (ISO) */
  d?: string;
  /** periods the edge is valid in (member, cv); absent = always */
  pd?: Period[];
  /** derived edges: the nodes that support them (works, characters), for tracing back */
  via?: string[];
}

export interface Community {
  id: number;
  size: number;
  /** the community's most central nodes (by PageRank), to name it */
  top: string[];
}

export interface GraphMeta {
  /** v1 file format (wrapper `schemaVersion`) */
  format: string;
  dbLastUpdate: string;
  /** data schema version from version.json (`meta.yaml`) */
  schemaVersion?: string;
  sha?: string;
  source: string;
  builtAt: string;
  counts: Record<string, number>;
  dateRange: [string, string] | null;
}

export interface GraphFile {
  format: typeof GRAPH_FORMAT;
  meta: GraphMeta;
  nodes: GNode[];
  edges: GEdge[];
  communities: Community[];
}

// --- details -------------------------------------------------------------------------------

/** A credit as stored on a work or recording. `ref` is a node key. */
export interface CreditRef {
  ref: string;
  affiliation?: string | Names;
  role?: Names;
}

/** A performer. `ref` is a node key; `role` is the character key a person sings as (D29). */
export interface PerformerRef {
  ref: string;
  role?: string;
}

export interface LinkRef {
  url: string | null;
  src: "own" | "main" | "none";
}

export interface RecordingDetail {
  id: string;
  kind: RecordingKind;
  title?: Names;
  version?: string;
  performers: PerformerRef[];
  arranger: CreditRef[];
  /** only when credited */
  strings_arranger?: CreditRef[];
  brass_arranger?: CreditRef[];
  override?: { lyricist: CreditRef[]; composer: CreditRef[] };
  instrumentalOf?: string;
  externalIds?: Record<string, string>;
  mainLink?: string;
  evidence?: EvidenceMap;
}

export interface WorkAppearance {
  release: string;
  date?: string;
  tracks: { rec: string; editions: string[]; disc: number; pos: number; no: number | null; link: LinkRef }[];
}

export interface WorkPerformance {
  concert: string;
  stop: string;
  venue: string;
  date: string;
  rec?: string;
}

export interface WorkDetail {
  t: "work";
  kind: string;
  project: string;
  title: Names;
  credits: { lyricist: CreditRef[]; composer: CreditRef[] };
  recordings: RecordingDetail[];
  appearances: WorkAppearance[];
  performances: WorkPerformance[];
  externalIds?: Record<string, string>;
  evidence?: EvidenceMap;
}

export interface ReleaseTrack {
  pos: number;
  no: number | null;
  work: string;
  rec: string;
  kind: RecordingKind;
  title: Names;
  version?: string;
  link: LinkRef;
  note?: string;
}

export interface ReleaseDetail {
  t: "release";
  type: string;
  status: string;
  title: Names;
  projects: string[];
  artistCredit: PerformerRef[];
  label?: string;
  date?: string;
  editions: { id: string; label?: Names; catalog?: string; media: string[]; date?: string }[];
  /** tracklists; editions with identical tracklists and links share one group */
  tracklists: { editions: string[]; discs: { disc: number; tracks: ReleaseTrack[] }[] }[];
  streaming: { editions: string[]; url: string }[];
  links: Record<string, string>;
  evidence?: EvidenceMap;
}

export interface PersonDetail {
  t: "person";
  names: Names;
  familyName?: Names;
  givenName?: Names;
  nativeScript: string;
  aliases: { text: string; kind: string; note?: string }[];
  distinctFrom: string[];
  /** affiliations this person is credited with, by work */
  affiliations: { work: string; affiliation: string | Names }[];
  /** recordings arranged, by work and role (only where not every recording of the work is theirs) */
  arranged: { work: string; role: ArrangerRole; recs: string[] }[];
  /** roles sung as (D29) */
  sungAs: { work: string; role: string; recs: string[] }[];
  evidence?: EvidenceMap;
}

export interface CharacterDetail {
  t: "character";
  names: Names;
  familyName?: Names;
  givenName?: Names;
  project: string;
  casting: { person: string; from?: string; until?: string }[];
  memberships: { artist: string; periods: Period[] }[];
  /** persons who sang as this character (D29) */
  playedBy: { person: string; works: string[] }[];
  distinctFrom: string[];
  evidence?: EvidenceMap;
}

export interface ArtistDetail {
  t: "artist";
  kind: string;
  names: Names;
  projects: string[];
  lineups: { from?: string; until?: string; members: string[] }[];
  distinctFrom: string[];
  evidence?: EvidenceMap;
}

export interface ProjectDetail {
  t: "project";
  names: Names;
  legacy?: { category: string; file: string };
  copyright: Copyright[];
  official: Record<string, string>;
  counts: Partial<Record<NodeType, number>>;
  evidence?: EvidenceMap;
}

export interface SetlistEntry {
  type: string;
  work?: string;
  rec?: string;
  label?: string;
  titleRaw?: string;
  performers: PerformerRef[];
}

export interface ConcertDetail {
  t: "concert";
  title: Names;
  status: string;
  projects: string[];
  stops: {
    id: string;
    city: Names;
    label?: string;
    venue: string;
    performances: { date: string; label?: string; setlist: SetlistEntry[] }[];
  }[];
  externalIds?: Record<string, string>;
  eventCode?: string;
  evidence?: EvidenceMap;
}

export interface VenueDetail {
  t: "venue";
  names: Names;
  city?: Names;
  externalIds?: Record<string, string>;
  stops: { concert: string; stop: string; dates: string[] }[];
}

export type Detail =
  | WorkDetail | ReleaseDetail | PersonDetail | CharacterDetail | ArtistDetail | ProjectDetail
  | ConcertDetail | VenueDetail;

export type DetailFile = Record<string, Detail>;
