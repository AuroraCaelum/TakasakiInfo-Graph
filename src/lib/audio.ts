/**
 * Length, key and tempo of songs (TakasakiInfo D61): how they are written, and the filter on them.
 *
 * A work is shown and filtered by its representative recording (the node's `au`); a recording
 * card shows its own values.
 */

import { KEY_MOODS, TEMPO_MOODS, type AudioFacts, type GNode } from "../../shared/graph";

/** `256` → `4:16`; an hour or more as `1:02:03`. */
export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** `F#m` → `F♯m`, `Bb` → `B♭`: the data's ASCII accidentals as music signs. */
export function keyText(key: string): string {
  return key.replace(/^([A-G])#/, "$1♯").replace(/^([A-G])b/, "$1♭");
}

/** `4:16 · G · 136 BPM`, leaving out what is not known; empty when nothing is. */
export function audioSummary(a: AudioFacts | undefined): string {
  if (!a) return "";
  return [a.dur ? formatDuration(a.dur) : "", a.key ? keyText(a.key) : "", a.bpm ? `${a.bpm} BPM` : ""].filter(Boolean).join(" · ");
}

export interface AudioFilter {
  /** mood labels: within an axis (tempo, key) any of them, across the axes all */
  moods: string[];
  /** inclusive BPM range; null is open */
  bpm: [number | null, number | null];
}

export const audioFilterOn = (f: AudioFilter) => f.moods.length > 0 || f.bpm[0] !== null || f.bpm[1] !== null;

/**
 * Whether a work passes the mood and BPM filter. Works without the values asked for (soundtrack
 * cues, songs the analysis did not find) do not; nodes other than works are not filtered.
 */
export function audioPasses(n: GNode, f: AudioFilter): boolean {
  if (n.t !== "work" || !audioFilterOn(f)) return true;
  const mood = n.au?.mood ?? [];
  for (const axis of [TEMPO_MOODS, KEY_MOODS] as const) {
    const want = f.moods.filter((m) => (axis as readonly string[]).includes(m));
    if (want.length && !want.some((m) => mood.includes(m))) return false;
  }
  const [lo, hi] = f.bpm;
  if (lo !== null || hi !== null) {
    const bpm = n.au?.bpm;
    if (!bpm || (lo !== null && bpm < lo) || (hi !== null && bpm > hi)) return false;
  }
  return true;
}

export const BPM_LIMIT = 400;

/** A BPM bound typed by the viewer: a whole number in 1..BPM_LIMIT, else none. */
export function parseBpm(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= 1 && n <= BPM_LIMIT ? n : null;
}
