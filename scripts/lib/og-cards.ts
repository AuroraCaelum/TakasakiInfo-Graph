/**
 * The node cards of a built graph, as elements to draw: read the same way by the build
 * (scripts/build-og.ts, which hashes them) and by its workers (og-worker.ts, which draw them).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ConcertDetail, GraphFile } from "../../shared/graph";
import { cardIndex, nodeCard, type CardIndex, type NodeCard } from "./og-card";
import { cardMap, nodeCardElement, type CardMap, type El } from "./og-render";

export interface CardSet {
  graph: GraphFile;
  ix: CardIndex;
  map: CardMap;
  card: (key: string) => NodeCard;
  element: (c: NodeCard) => El;
}

export async function loadCardSet(dataDir: string): Promise<CardSet> {
  const graph = JSON.parse(await readFile(path.join(dataDir, "graph.json"), "utf8")) as GraphFile;
  const concerts = JSON.parse(await readFile(path.join(dataDir, "detail/concert.json"), "utf8")) as Record<string, ConcertDetail>;
  const ix = cardIndex(graph, concerts);
  const map = cardMap(graph);
  const nameOf = (k: string, id: string) => {
    const n = ix.nodes.get(k);
    return n?.n.ja || n?.n.rom || id;
  };
  const names = { project: (id: string) => nameOf(`project:${id}`, id), group: (id: string) => nameOf(`artist:${id}`, id) };
  return {
    graph, ix, map,
    card: (key) => nodeCard(ix.nodes.get(key)!, ix),
    element: (c) => nodeCardElement(c, names, map),
  };
}
