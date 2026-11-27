/**
 * "This day in Love Live!": what happened on a month and day in past (and coming) years.
 *
 * Events come from `days.json` (built by `scripts/lib/days.ts`); birthdays from the nodes' `bd`.
 * An event on 02-29 shows on 02-28 in common years, like a birthday.
 */

import type { DayEvent, DayKind, DaysFile, GNode } from "../../shared/graph";
import type { DaySection, DayTemplate } from "../i18n";
import { birthdaysOn } from "./birthday";

const BASE = import.meta.env.BASE_URL;
let days: Promise<DayEvent[]> | null = null;

/** `days.json`, fetched once. */
export function loadDays(): Promise<DayEvent[]> {
  if (!days) {
    days = fetch(`${BASE}data/days.json`).then((r) => {
      if (!r.ok) throw new Error(`days.json: HTTP ${r.status}`);
      return r.json() as Promise<DaysFile>;
    }).then((f) => f.events);
    days.catch(() => { days = null; });
  }
  return days;
}

export interface DayItem {
  section: DaySection;
  template: DayTemplate;
  /** `YYYY-MM-DD`; birthdays: the day looked at */
  date: string;
  /** subject node keys, those the filters show */
  s: string[];
  /** context node keys */
  c: string[];
  /** after today (the viewer's date) */
  future: boolean;
  /** whole years since, on an anniversary in the past */
  years: number;
}

const SECTION: Record<DayKind, DaySection> = {
  concert: "concert", release: "release", work: "work", premiere: "work", debut: "debut", cast: "lineup", join: "lineup", leave: "lineup",
};

const DEBUT: Record<string, DayTemplate> = { person: "debutPerson", character: "debutCharacter", artist: "debutArtist", project: "debutProject" };

/**
 * What happened on `date`'s month and day (`YYYY-MM-DD`), oldest first within each section, with
 * the subjects the filters hide left out (and an event left with none dropped). `today` decides
 * which events are still to come. `sameName` tells whether two nodes show the same name: a song
 * that came out on a release of its own title reads without the release.
 */
export function eventsOn(
  date: string, today: string, events: DayEvent[], nodes: Map<string, GNode>, visible: { has(k: string): boolean },
  sameName: (a: string, b: string) => boolean,
): DayItem[] {
  const mds = birthdaysOn(date);
  const year = Number(today.slice(0, 4));
  const out: DayItem[] = [];

  const birthdays = [...nodes.values()]
    .filter((n) => n.bd && mds.has(n.bd) && visible.has(n.k))
    .sort((a, b) => (a.t === b.t ? 0 : a.t === "character" ? -1 : 1) || a.k.localeCompare(b.k));
  for (const n of birthdays) out.push({ section: "birthday", template: "birthday", date, s: [n.k], c: [], future: false, years: 0 });

  for (const e of events) {
    if (!mds.has(e.d.slice(5))) continue;
    const s = e.s.filter((k) => visible.has(k));
    if (!s.length) continue;
    const c = e.c ?? [];
    let template: DayTemplate;
    switch (e.k) {
      case "concert": template = c.length ? "concert" : "concertOnline"; break;
      case "work": template = !c.length || s.some((k) => sameName(k, c[0])) ? "workSelf" : "work"; break;
      case "debut": template = DEBUT[s[0].slice(0, s[0].indexOf(":"))] ?? "debutCharacter"; break;
      default: template = e.k;
    }
    const future = e.d > today;
    out.push({ section: SECTION[e.k], template, date: e.d, s, c, future, years: future ? 0 : year - Number(e.d.slice(0, 4)) });
  }
  return out;
}

/** Every node an item names. */
export const keysOf = (items: DayItem[]): string[] => [...new Set(items.flatMap((i) => [...i.s, ...i.c]))];

// --- Korean particles ---------------------------------------------------------------------------

const DIGIT_FINAL = new Set("013678"); // 영 일 삼 육 칠 팔 end in a consonant

/**
 * Whether a word read in Korean ends in a final consonant (받침): `true`, `false`, or `null`
 * when that can't be told (kanji). Trailing symbols (`Dive!`, `☆`) are skipped; a Latin word
 * ends in one after l, m, n (`Dream` 드림), else not (`Sunshine` 선샤인).
 */
export function finalConsonant(word: string): boolean | null {
  const chars = [...word.trim()];
  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i];
    const code = ch.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    if (/\d/.test(ch)) return DIGIT_FINAL.has(ch);
    if (/[a-z]/i.test(ch)) {
      const tail = chars.slice(Math.max(0, i - 1), i + 1).join("").toLowerCase();
      return tail === "ng" || /[lmn]/.test(ch.toLowerCase());
    }
    if (/[぀-ヿ]/.test(ch)) return ch === "ん" || ch === "ン";
    if (/[\p{L}]/u.test(ch)) return null;
  }
  return null;
}

/** `이/가`-style particle after `word`: the first form after a final consonant, else the second; both when unknown. */
export function particle(word: string, pair: string): string {
  const [withFinal, without] = pair.split("/");
  const f = finalConsonant(word);
  // 으로/로: a final ㄹ takes 로
  if (withFinal === "으로" && f) {
    const code = [...word.trim()].pop()!.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8) return without;
  }
  return f === null ? `${withFinal}(${without})` : f ? withFinal : without;
}

// --- templates ------------------------------------------------------------------------------

export type Token = { kind: "text"; text: string } | { kind: "slot"; slot: "w" | "s" | "c" } | { kind: "particle"; pair: string };

/** Splits a day template into text, `{w}`/`{s}`/`{c}` slots and `{이/가}` particles. */
export function parseTemplate(tpl: string): Token[] {
  const out: Token[] = [];
  const re = /\{([^}]+)\}/g;
  let last = 0;
  for (let m = re.exec(tpl); m; m = re.exec(tpl)) {
    if (m.index > last) out.push({ kind: "text", text: tpl.slice(last, m.index) });
    const v = m[1];
    out.push(v === "w" || v === "s" || v === "c" ? { kind: "slot", slot: v } : { kind: "particle", pair: v });
    last = re.lastIndex;
  }
  if (last < tpl.length) out.push({ kind: "text", text: tpl.slice(last) });
  return out;
}

/** `YYYY-MM-DD` moved by whole days (local calendar, no time zone surprises). */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + days));
  return x.toISOString().slice(0, 10);
}
