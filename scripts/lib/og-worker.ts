/**
 * A worker of scripts/build-og.ts: draws its share of the node cards into the cache. Drawing is
 * most of the build's time, and every card is drawn again when the map's layout changes.
 */

import { writeFile } from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";

import { loadCardSet } from "./og-cards";
import { loadFonts, renderer } from "./og-render";

export interface WorkerJob {
  dataDir: string;
  fontDir: string;
  /** node key → the cache file to draw its card into */
  cards: [string, string][];
}

export interface WorkerResult {
  /** characters no font had, with the cards they were on */
  missing: [string, string[]][];
}

const job = workerData as WorkerJob;
const set = await loadCardSet(job.dataDir);
const draw = renderer((await loadFonts(job.fontDir)).fonts);
for (const [key, file] of job.cards) await writeFile(file, await draw.render(set.element(set.card(key)), key));
parentPort!.postMessage({ missing: [...draw.missing].map(([ch, where]) => [ch, [...where]]) } satisfies WorkerResult);
