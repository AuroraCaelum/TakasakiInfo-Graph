/**
 * Reads the v1 data files from a directory (e.g. TakasakiInfo's `dist/v1` after `takasaki dist`)
 * or from a URL base (the public CDN).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  V1_ENTITY_FILES, V1_VIEW_FILES,
  type DataVersion, type V1Dataset, type V1File, type Wrapped,
} from "../../shared/v1";

export const DEFAULT_SOURCE = "https://d1zzovwupaegwb.cloudfront.net/data/v1/";

/** The major version of the v1 wrapper this builder understands (DESIGN.md §10.5: breaking = v2). */
export const SUPPORTED_FORMAT_MAJOR = 1;

const isUrl = (s: string) => /^https?:\/\//.test(s);

async function readText(base: string, name: string): Promise<string> {
  if (isUrl(base)) {
    const url = new URL(name, base.endsWith("/") ? base : `${base}/`).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
    return res.text();
  }
  return readFile(path.join(base, name), "utf8");
}

/** `version.json` sits next to `v1/` on the CDN; locally it may be absent. */
async function readVersion(base: string): Promise<DataVersion> {
  try {
    const parent = isUrl(base) ? new URL("../", base.endsWith("/") ? base : `${base}/`).toString() : path.dirname(path.resolve(base));
    return JSON.parse(await readText(parent, "version.json")) as DataVersion;
  } catch {
    return {};
  }
}

export function checkFormat(name: string, doc: Wrapped<unknown>): void {
  if (!doc || typeof doc.schemaVersion !== "string" || !Array.isArray(doc.data)) {
    throw new Error(`${name}.json: not a v1 data file (expected {schemaVersion, dbLastUpdate, count, data})`);
  }
  const major = Number(doc.schemaVersion.split(".")[0]);
  if (major !== SUPPORTED_FORMAT_MAJOR) {
    throw new Error(`${name}.json: format ${doc.schemaVersion} is not supported (this builder reads ${SUPPORTED_FORMAT_MAJOR}.x)`);
  }
}

export async function loadV1(base: string): Promise<V1Dataset> {
  const names: V1File[] = [...V1_ENTITY_FILES, ...V1_VIEW_FILES];
  const docs = await Promise.all(names.map(async (n) => {
    const doc = JSON.parse(await readText(base, `${n}.json`)) as Wrapped<unknown>;
    checkFormat(n, doc);
    return [n, doc] as const;
  }));
  const byName = Object.fromEntries(docs) as Record<V1File, Wrapped<never>>;
  const updates = new Set(docs.map(([, d]) => d.dbLastUpdate));
  if (updates.size > 1) throw new Error(`v1 files come from different data versions: ${[...updates].join(", ")}`);
  const first = docs[0][1];
  return {
    projects: byName.projects.data,
    persons: byName.persons.data,
    characters: byName.characters.data,
    artists: byName.artists.data,
    works: byName.works.data,
    releases: byName.releases.data,
    cities: byName.cities.data,
    venues: byName.venues.data,
    concerts: byName.concerts.data,
    tracks: byName.tracks.data,
    recordings: byName.recordings.data,
    format: { schemaVersion: first.schemaVersion, dbLastUpdate: first.dbLastUpdate },
    version: await readVersion(base),
  };
}
