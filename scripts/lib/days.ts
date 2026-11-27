/**
 * What happened on each date, for "this day in Love Live!" (`days.json`). Birthdays are left
 * to the nodes (`bd`).
 *
 * Events on the same date of the same kind and context are merged: an album's new songs are one
 * event, as are two members joining a unit on the same day.
 */

import {
  GRAPH_FORMAT, isDerived,
  type ArtistDetail, type CharacterDetail, type ConcertDetail, type DayEvent, type DayKind, type DaysFile, type GEdge,
  type WorkDetail,
} from "../../shared/graph";
import type { BuiltGraph } from "./build-graph";
import { minDate } from "./dates";

export function buildDays({ nodes, edges, details }: Pick<BuiltGraph, "nodes" | "edges" | "details">): DaysFile {
  const merged = new Map<string, DayEvent>();
  const add = (d: string | undefined | null, k: DayKind, s: string, c?: string, group = "") => {
    if (!d) return;
    const key = `${d}|${k}|${c ?? ""}|${group}`;
    const e = merged.get(key);
    if (e) { if (!e.s.includes(s)) e.s.push(s); }
    else merged.set(key, { d, k, s: [s], ...(c ? { c: [c] } : {}) });
  };

  for (const [k, det] of details) {
    if (det.t === "concert") {
      for (const stop of (det as ConcertDetail).stops) {
        // a day with a matinee and an evening show is one day
        for (const date of new Set(stop.performances.map((p) => p.date))) add(date, "concert", k, stop.venue, stop.id);
      }
    } else if (det.t === "work") {
      const w = det as WorkDetail;
      if (w.kind !== "song") continue; // BGM cues and drama tracks would drown the songs
      const first = w.appearances.find((a) => a.date); // sorted by date
      const live = w.performances[0]; // sorted by date
      if (first?.date && (!live || first.date <= live.date)) add(first.date, "work", k, first.release);
      else if (live) add(live.date, "premiere", k, live.concert);
    } else if (det.t === "character") {
      for (const c of (det as CharacterDetail).casting) add(c.from, "cast", c.person, k);
    }
  }

  for (const n of nodes.values()) {
    if (n.t === "release") add(n.d, "release", n.k);
    else if (n.t === "project") add(n.d, "debut", n.k, undefined, n.t);
  }

  // first dated fact of persons, characters and artists: their own, never one taken from a neighbour
  const first = new Map<string, string>();
  for (const e of edges) {
    if (e.r === "project" || isDerived(e.r)) continue;
    const start = (e.pd ?? []).reduce<string | undefined>((d, p) => minDate(d, p[0]), e.d);
    if (!start) continue;
    for (const k of [e.s, e.t]) if (/^(person|character|artist):/.test(k)) first.set(k, minDate(first.get(k), start)!);
  }
  for (const [k, d] of first) add(d, "debut", k, undefined, k.slice(0, k.indexOf(":")));

  // memberships: a unit's founding members join with the unit, so only later joins count
  const members = edges.filter((e): e is GEdge & { pd: NonNullable<GEdge["pd"]> } => e.r === "member" && !!e.pd);
  const founded = new Map<string, string>();
  for (const [k, det] of details) {
    if (det.t !== "artist") continue;
    const from = (det as ArtistDetail).lineups.reduce<string | undefined>((d, l) => minDate(d, l.from), undefined);
    if (from) founded.set(k, from);
  }
  for (const e of members) {
    for (const [from, until] of e.pd) {
      if (from && from !== founded.get(e.t)) add(from, "join", e.s, e.t);
      if (until) add(until, "leave", e.s, e.t);
    }
  }

  const order = (k: DayKind) => ["concert", "release", "work", "premiere", "debut", "cast", "join", "leave"].indexOf(k);
  const events = [...merged.values()]
    .map((e) => ({ ...e, s: e.s.sort() }))
    .sort((a, b) => a.d.localeCompare(b.d) || order(a.k) - order(b.k) || a.s[0].localeCompare(b.s[0]));
  return { format: GRAPH_FORMAT, events };
}
