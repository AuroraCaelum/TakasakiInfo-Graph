/**
 * Builds the site's data from the TakasakiInfo v1 files.
 *
 *   npm run data                                  # from the public CDN
 *   npm run data -- --src ../TakasakiInfo/dist/v1 # from a local `takasaki dist`
 *   npm run data -- --out public/data --iterations 3000
 *
 * Writes `graph.json`, `detail/<type>.json` and `meta.json` into the output directory.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { GRAPH_FORMAT, NODE_TYPES, type DetailFile, type GNode, type GraphFile } from "../shared/graph";
import { analyze } from "./lib/analyze";
import { buildGraph } from "./lib/build-graph";
import { DEFAULT_SOURCE, loadV1 } from "./lib/source";

async function main() {
  const { values } = parseArgs({
    options: {
      src: { type: "string", default: process.env.TAKASAKI_V1 ?? DEFAULT_SOURCE },
      out: { type: "string", default: "public/data" },
      iterations: { type: "string", default: "3000" },
      strict: { type: "boolean", default: false },
    },
  });
  const src = values.src!;
  const out = path.resolve(values.out!);
  const t0 = Date.now();

  console.log(`reading v1 data from ${src}`);
  const ds = await loadV1(src);
  const built = buildGraph(ds);
  for (const w of built.warnings) console.warn(`warning: ${w}`);
  if (values.strict && built.warnings.length) throw new Error(`${built.warnings.length} warnings (--strict)`);

  const { metrics, positions, communities } = analyze(built.nodes, built.edges, { iterations: Number(values.iterations) });
  const nodes: GNode[] = [...built.nodes.values()]
    .sort((a, b) => a.k.localeCompare(b.k))
    .map((n) => ({ ...n, ...positions.get(n.k)!, m: metrics.get(n.k)! }));

  const dates = nodes.map((n) => n.d).filter((d): d is string => !!d).sort();
  const counts: Record<string, number> = {};
  for (const n of nodes) counts[n.t] = (counts[n.t] ?? 0) + 1;
  for (const e of built.edges) counts[`edge:${e.r}`] = (counts[`edge:${e.r}`] ?? 0) + 1;

  const graph: GraphFile = {
    format: GRAPH_FORMAT,
    meta: {
      format: ds.format.schemaVersion,
      dbLastUpdate: ds.format.dbLastUpdate,
      ...(ds.version.schemaVersion ? { schemaVersion: ds.version.schemaVersion } : {}),
      ...(ds.version.sha ? { sha: ds.version.sha } : {}),
      source: src,
      builtAt: new Date().toISOString(),
      counts,
      dateRange: dates.length ? [dates[0], dates[dates.length - 1]] : null,
    },
    nodes,
    edges: built.edges,
    communities,
  };

  await rm(out, { recursive: true, force: true });
  await mkdir(path.join(out, "detail"), { recursive: true });
  const write = (name: string, data: unknown) => writeFile(path.join(out, name), JSON.stringify(data), "utf8");
  await write("graph.json", graph);
  await write("meta.json", graph.meta);
  for (const t of NODE_TYPES) {
    const file: DetailFile = {};
    for (const [k, d] of [...built.details].sort(([a], [b]) => a.localeCompare(b))) if (d.t === t) file[k] = d;
    await write(`detail/${t}.json`, file);
  }

  const summary = NODE_TYPES.map((t) => `${t} ${counts[t] ?? 0}`).join(", ");
  console.log(`${nodes.length} nodes (${summary}), ${built.edges.length} edges, ${communities.length} communities`);
  console.log(`data ${graph.meta.dbLastUpdate}${graph.meta.sha ? ` (${graph.meta.sha.slice(0, 7)})` : ""} → ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
