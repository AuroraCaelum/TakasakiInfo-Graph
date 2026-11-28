/**
 * Link previews: a share page and a card image per node, and the cards of the site's own pages
 * (shared/share.ts says why the pages exist).
 *
 *   npm run og                    # after `npm run data`
 *   npm run og -- --data public/data --out public --cache .cache
 *
 * Writes into the output directory (which Vite copies into the site):
 *   n/<type>/<id>/index.html, og.png   every node
 *   og/main.png, og/api.png            the map (index.html) and the API reference (api/index.html)
 *
 * Cards are kept in `<cache>/og/` by a hash of everything drawn on them, so a rebuild only draws
 * the cards whose content changed (all of them when the map's layout changed: it is behind every
 * node card), on a worker per core; cards no longer used are removed from the cache. The output
 * files are hard links to the cached ones.
 */

import { createHash } from "node:crypto";
import { access, copyFile, link, mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Worker } from "node:worker_threads";

import { SHAREABLE_KEY, SITE_URL, sharePath, shareRoot } from "../shared/share";
import { DICTS } from "../src/i18n";
import { palette } from "../src/theme";
import { cardDescription, cardTitle, LABEL, type NodeCard } from "./lib/og-card";
import { loadCardSet } from "./lib/og-cards";
import {
  GRAPH_WIDTH, HEIGHT, WIDTH, graphSvg, loadFonts, rasterise, renderer, siteCardElement, type El,
} from "./lib/og-render";
import type { WorkerJob, WorkerResult } from "./lib/og-worker";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The share page: the node's tags for previews, and a redirect to the map for people. */
function sharePage(c: NodeCard, image: string, color: string): string {
  const url = `${SITE_URL}${sharePath(c.key)}`;
  const title = cardTitle(c);
  const desc = cardDescription(c);
  const target = `${shareRoot(c.key)}?n=${c.key}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} – TakasakiInfo</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="${color}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TakasakiInfo">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${WIDTH}">
<meta property="og:image:height" content="${HEIGHT}">
<meta property="og:image:alt" content="${esc(`${c.kind}: ${title}`)}">
<meta property="og:locale" content="ja_JP">
<meta property="og:locale:alternate" content="ko_KR">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<script>location.replace(${JSON.stringify(target)} + (location.search ? "&" + location.search.slice(1) : "") + location.hash)</script>
</head>
<body>
<p><a href="${esc(target)}">${esc(title)}</a></p>
</body>
</html>
`;
}

const API_ENDPOINTS = [
  "GET /api/v1/search?q=…",
  "GET /api/v1/works/{id}",
  "GET /api/v1/persons/{id}/credits",
  "GET /api/v1/concerts/{id}/setlist",
  "GET /api/v1/artists/{id}/lineup",
  "GET /api/v1/birthdays",
];

/** A card worker: TypeScript, so it registers tsx's loader first (workers don't inherit it). */
const WORKER_BOOT = new URL(`data:text/javascript,${encodeURIComponent(
  `import { register } from ${JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve("tsx/esm/api")).href)};`
  + `register(); await import(${JSON.stringify(new URL("./lib/og-worker.ts", import.meta.url).href)});`,
)}`);

/** Draws the cards in `todo` (node key → cache file) on as many workers as there are cores. */
async function drawInWorkers(todo: [string, string][], dataDir: string, fontDir: string): Promise<Map<string, Set<string>>> {
  const missing = new Map<string, Set<string>>();
  const n = Math.max(1, Math.min(availableParallelism(), Math.ceil(todo.length / 50)));
  await Promise.all(Array.from({ length: n }, (_, i) => new Promise<void>((resolve, reject) => {
    const job: WorkerJob = { dataDir, fontDir, cards: todo.filter((_, j) => j % n === i) };
    const worker = new Worker(WORKER_BOOT, { workerData: job });
    worker.on("message", (r: WorkerResult) => {
      for (const [ch, where] of r.missing) missing.set(ch, new Set([...(missing.get(ch) ?? []), ...where]));
    });
    worker.on("error", reject);
    worker.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`card worker ${i} exited with ${code}`))));
  })));
  return missing;
}

async function main() {
  const { values } = parseArgs({
    options: {
      data: { type: "string", default: "public/data" },
      out: { type: "string", default: "public" },
      cache: { type: "string", default: ".cache" },
    },
  });
  const t0 = Date.now();
  const dataDir = path.resolve(values.data!);
  const outDir = path.resolve(values.out!);
  const cacheDir = path.join(path.resolve(values.cache!), "og");
  const fontDir = path.join(path.resolve(values.cache!), "fonts");

  const set = await loadCardSet(dataDir);
  const { graph } = set;
  const { fonts, hash: fontHash } = await loadFonts(fontDir);
  const require = createRequire(import.meta.url);
  const engine = `${require("satori/package.json").version}|${require("@resvg/resvg-js/package.json").version}|${fontHash}`;
  const hashOf = (el: El) => createHash("sha256").update(engine).update(JSON.stringify(el)).digest("hex").slice(0, 20);
  const cached = (hash: string) => path.join(cacheDir, `${hash}.png`);
  const exists = (file: string) => access(file).then(() => true, () => false);

  await mkdir(cacheDir, { recursive: true });
  await rm(path.join(outDir, "n"), { recursive: true, force: true });
  await rm(path.join(outDir, "og"), { recursive: true, force: true });

  /** Puts a card from the cache at `file`: a hard link costs no space; a copy when the cache is on another disk. */
  const place = async (hash: string, file: string) => {
    await mkdir(path.dirname(file), { recursive: true });
    await link(cached(hash), file).catch(() => copyFile(cached(hash), file));
  };

  // every node's card by its hash; the ones not in the cache are drawn by the workers
  const P = palette("light");
  const used = new Set<string>();
  const todo: [string, string][] = [];
  const pages: { key: string; card: NodeCard; hash: string }[] = [];
  for (const node of graph.nodes) {
    if (!SHAREABLE_KEY.test(node.k)) {
      console.warn(`warning: ${node.k}: not usable as a path, no share page`);
      continue;
    }
    const card = set.card(node.k);
    const hash = hashOf(set.element(card));
    if (!used.has(hash)) {
      used.add(hash);
      if (!(await exists(cached(hash)))) todo.push([node.k, cached(hash)]);
    }
    pages.push({ key: node.k, card, hash });
  }
  const missing = todo.length ? await drawInWorkers(todo, dataDir, fontDir) : new Map<string, Set<string>>();
  let drawn = todo.length;

  for (const { key, card, hash } of pages) {
    const dir = path.join(outDir, sharePath(key));
    await place(hash, path.join(dir, "og.png"));
    // the hash in the image URL makes previews that cache by URL pick up a changed card
    const image = `${SITE_URL}${sharePath(key)}og.png?v=${hash.slice(0, 10)}`;
    await writeFile(path.join(dir, "index.html"), sharePage(card, image, P.type[card.type]), "utf8");
  }

  // the site's own cards, here
  const draw = renderer(fonts);
  const siteCard = async (el: El, name: string) => {
    const hash = hashOf(el);
    used.add(hash);
    if (!(await exists(cached(hash)))) {
      await writeFile(cached(hash), await draw.render(el, name));
      drawn += 1;
    }
    await place(hash, path.join(outDir, `og/${name}.png`));
  };
  const counts = graph.meta.counts;
  const stats = [
    { label: LABEL.songs, value: counts.work ?? 0 },
    { label: LABEL.people, value: counts.person ?? 0 },
    { label: LABEL.releases, value: counts.release ?? 0 },
    { label: LABEL.concerts, value: counts.concert ?? 0 },
  ];
  const mapPng = rasterise(graphSvg(graph, GRAPH_WIDTH, HEIGHT, 36), GRAPH_WIDTH);
  await siteCard(siteCardElement({
    lines: (["ja", "ko", "en"] as const).map((l) => DICTS[l].appTagline),
    stats,
    graph: `data:image/png;base64,${mapPng.toString("base64")}`,
  }), "main");
  await siteCard(siteCardElement({
    suffix: "API",
    lines: ["ラブライブ！データベースAPI", "러브 라이브! 데이터베이스 API", "The Love Live! database API"],
    stats: [],
    note: "Read-only · REST · JSON · OpenAPI",
    code: API_ENDPOINTS,
  }), "api");

  // drop cards nothing uses any more
  let pruned = 0;
  for (const f of await readdir(cacheDir)) {
    if (f.endsWith(".png") && !used.has(f.slice(0, -4))) {
      await unlink(path.join(cacheDir, f));
      pruned += 1;
    }
  }

  for (const [ch, where] of [...missing, ...draw.missing]) {
    console.warn(`warning: no font has U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(ch)} (${[...where].slice(0, 3).join(", ")})`);
  }
  console.log(`${pages.length} share pages, ${used.size} cards (${drawn} drawn, ${used.size - drawn} from cache, ${pruned} pruned) → ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
