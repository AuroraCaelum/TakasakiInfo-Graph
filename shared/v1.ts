/**
 * Input contract: the TakasakiInfo v1 data files (`/data/v1/*.json`).
 *
 * The entity files are the Pydantic models of `automation/src/takasaki/model.py` dumped with
 * `exclude_none=True, by_alias=True`, so optional scalars may be absent while lists and maps are
 * always present. The builder still reads lists defensively (`?? []`): the schema is "almost
 * final" and a missing list must not crash the build.
 */

export interface Names {
  ja?: string;
  kana?: string;
  rom?: string;
  ko?: string;
}

export type EvidenceStatus = "official" | "established" | "derived" | "legacy" | "draft";

export interface Evidence {
  status: EvidenceStatus;
  source?: string;
  checked?: string;
  note?: string;
}

export type EvidenceMap = Record<string, Evidence>;

export interface Copyright {
  text: string;
  lang: string;
  source?: string;
  checked?: string;
}

export interface Project {
  id: string;
  names: Names;
  legacy?: { category: string; file: string };
  copyright?: Copyright[];
  official?: Record<string, string>;
  evidence?: EvidenceMap;
}

export interface Alias {
  text: string;
  kind?: "variant" | "misprint" | "former" | "pen_name";
  /** the name in each language, for a pen name or former name a credit prints (`credited_name`, D58) */
  names?: Names;
  note?: string;
}

export interface Person {
  id: string;
  names: Names;
  family_name?: Names;
  given_name?: Names;
  native_script?: "ja" | "latin";
  /** `YYYY-MM-DD`, or `MM-DD` when the year is not public */
  birthday?: string;
  aliases?: Alias[];
  distinct_from?: string[];
  evidence?: EvidenceMap;
}

export interface Casting {
  person: string;
  from?: string;
  until?: string;
}

export interface Character {
  id: string;
  project: string;
  names: Names;
  family_name?: Names;
  given_name?: Names;
  /** `MM-DD` (characters have no birth year) */
  birthday?: string;
  casting?: Casting[];
  distinct_from?: string[];
  evidence?: EvidenceMap;
}

export interface Lineup {
  from?: string;
  until?: string;
  members: string[];
}

export type ArtistKind = "group" | "unit" | "solo" | "cross_unit" | "collab" | "special" | "unclassified";

export interface Artist {
  id: string;
  kind: ArtistKind;
  projects?: string[];
  names: Names;
  lineups?: Lineup[];
  distinct_from?: string[];
  evidence?: EvidenceMap;
}

/** Exactly one of person / character (D27). */
export interface Credit {
  person?: string;
  character?: string;
  affiliation?: string | Names;
  /** the official page prints `名前（所属）` with full-width brackets: ja keeps them (D42) */
  fullwidth?: boolean;
  role?: Names;
  /** the pen name or former name the credit prints: the `text` of one of the person's aliases (D58) */
  credited_name?: string;
}

/**
 * Exactly one of artist / character / person; `role` (a character id) only with person (D29).
 * A credit naming several performers as one (D48): a guest after `feat.` is `featured`, and the
 * performers of a joint name (`A・B・C`, always next to each other) are each `joint`.
 */
export interface Performer {
  artist?: string;
  character?: string;
  person?: string;
  role?: string;
  featured?: boolean;
  joint?: boolean;
}

export interface WorkCredits {
  lyricist?: Credit[];
  composer?: Credit[];
}

export type RecordingKind = "vocal" | "off_vocal" | "instrumental" | "drama" | "other";

/** Key and tempo from an outside analysis (D61): there is no official value. */
export interface Audio {
  /** the tonic, with `m` for a minor key, sharps and flats in ASCII (`F#m`, `Bb`) */
  key?: string;
  bpm?: number;
  /** `4/4`, only where a source states it */
  time_signature?: string;
}

/** The show a live recording (a live CD's track) was recorded at (D54). */
export interface LiveOf {
  concert: string;
  date?: string;
  label?: string;
}

export interface Recording {
  id: string;
  kind?: RecordingKind;
  title?: Names;
  version?: string;
  performers?: Performer[];
  arranger?: Credit[];
  strings_arranger?: Credit[];
  brass_arranger?: Credit[];
  credits_override?: WorkCredits;
  instrumental_of?: string;
  live?: LiveOf;
  /** length in seconds (D61) */
  duration?: number;
  /** an off vocal or instrumental without its own takes `instrumental_of`'s, in the views */
  audio?: Audio;
  external_ids?: Record<string, string>;
  evidence?: EvidenceMap;
}

/** bgm: an anime soundtrack cue played at a concert (D50) */
export type WorkKind = "song" | "bgm" | "drama" | "other";

export interface Work {
  id: string;
  kind?: WorkKind;
  project: string;
  title: Names;
  credits?: WorkCredits;
  recordings: Recording[];
  external_ids?: Record<string, string>;
  evidence?: EvidenceMap;
}

export interface Edition {
  id: string;
  label?: Names;
  catalog?: string;
  media?: string[];
  release_date?: string;
}

export interface Track {
  no?: number;
  recording: string;
  title_as_printed?: Names;
  note?: string;
  category?: string;
}

export interface Disc {
  disc?: number;
  editions?: "all" | string[];
  tracks: Track[];
}

export interface Streaming {
  platform?: string;
  editions?: string[];
  browse_id?: string;
  tracks?: Record<string, string>;
}

export type ReleaseType =
  | "single" | "album" | "mini_album" | "digital_single" | "bd_bonus" | "compilation"
  | "soundtrack" | "drama_cd" | "live_video" | "unclassified";

export type ReleaseStatus = "announced" | "released" | "verified";

export interface Release {
  id: string;
  type?: ReleaseType;
  status?: ReleaseStatus;
  title: Names;
  projects: string[];
  artist_credit?: Performer[];
  label?: string;
  release_date?: string;
  editions?: Edition[];
  discs: Disc[];
  streaming?: Streaming[];
  links?: Record<string, string>;
  legacy?: unknown;
  evidence?: EvidenceMap;
}

export interface City {
  id: string;
  names: Names;
  evidence?: EvidenceMap;
}

export interface Venue {
  id: string;
  city?: string;
  names: Names;
  external_ids?: Record<string, string>;
  evidence?: EvidenceMap;
}

export type SetlistType = "song" | "mc" | "video" | "encore" | "double_encore" | "talk" | "other";

export interface SetlistItem {
  type?: SetlistType;
  work?: string;
  recording?: string;
  /** the version sung when no recording of it is linked (§4.6) */
  version?: string;
  performers?: Performer[];
  label?: string;
  title_raw?: string;
}

export interface Performance {
  date: string;
  label?: string;
  /** the show's cast when it differs from the concert's: the whole list, which replaces it (D52) */
  cast?: Performer[];
  setlist?: SetlistItem[];
  /** fandom: the set-list tab this show is read from, `<section>|<tab>` (D47) */
  external_ids?: Record<string, string>;
}

/** An online-only show has neither city nor venue (D47). */
export interface Stop {
  id: string;
  city?: string;
  label?: string;
  venue?: string;
  performances: Performance[];
}

export type ConcertStatus = "announced" | "performed" | "settled" | "confirmed";

export interface Concert {
  id: string;
  projects: string[];
  status?: ConcertStatus;
  title: Names;
  /** who appears, as the concert's announcements list them (D52) */
  cast?: Performer[];
  stops: Stop[];
  legacy?: { event_code?: string };
  external_ids?: Record<string, string>;
  evidence?: EvidenceMap;
}

// --- views ---------------------------------------------------------------------------------

/** A reference with its names, as the v1 views write it: `{"ref": "person:aki-hata", "names": …}`. */
export interface RefNames {
  ref: string;
  names?: Names;
  affiliation?: string | Names;
  fullwidth?: boolean;
  role?: Names | RefNames;
  featured?: boolean;
  joint?: boolean;
}

export type LinkSource = "own" | "main" | "none";

/** `tracks.json`: one row per (release, edition, disc, position). */
export interface TrackRow {
  id: string;
  release: string;
  edition: string | null;
  disc: number;
  position: number;
  no: number | null;
  status: ReleaseStatus;
  release_date: string | null;
  recording: string;
  work: string;
  kind: RecordingKind;
  version: string | null;
  title: Names;
  link: { youtube_music: string | null; source: LinkSource };
  note: string | null;
}

/**
 * `recordings.json`: one row per recording, with the main YouTube Music link (D2), and its length,
 * key and tempo (D61). The audio fields are newer than the rest and may be absent.
 */
export interface RecordingRow {
  id: string;
  work: string;
  main_link: string | null;
  duration?: number | null;
  /**
   * `mood`: labels the TakasakiInfo builder makes from the key and tempo by rule
   * (`upbeat` bpm ≥ 140, `slow` bpm < 100, `bright` major, `wistful` minor);
   * `from`: the recording the values belong to, when an off vocal takes its vocal recording's.
   */
  audio?: (Audio & { mood?: string[]; from?: string }) | null;
  /** the recording its work is shown with: the first studio vocal one, for a soundtrack cue the first instrumental */
  representative?: boolean;
}

/** Every v1 data file is wrapped like this (DESIGN.md §10.2). */
export interface Wrapped<T> {
  schemaVersion: string;
  dbLastUpdate: string;
  count: number;
  data: T[];
}

export interface DataVersion {
  dbLastUpdate?: string;
  schemaVersion?: string;
  sha?: string;
}

export interface V1Dataset {
  projects: Project[];
  persons: Person[];
  characters: Character[];
  artists: Artist[];
  works: Work[];
  releases: Release[];
  cities: City[];
  venues: Venue[];
  concerts: Concert[];
  tracks: TrackRow[];
  recordings: RecordingRow[];
  /** schemaVersion and dbLastUpdate of the wrapper (all files share them). */
  format: { schemaVersion: string; dbLastUpdate: string };
  version: DataVersion;
}

export const V1_ENTITY_FILES = [
  "projects", "persons", "characters", "artists", "works", "releases", "cities", "venues", "concerts",
] as const;
export const V1_VIEW_FILES = ["tracks", "recordings"] as const;
export type V1File = (typeof V1_ENTITY_FILES)[number] | (typeof V1_VIEW_FILES)[number];
