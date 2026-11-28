/**
 * Share card images, 1200×630 PNG: satori lays the card out as SVG, resvg rasterises it.
 *
 * Fonts: Pretendard JP covers Japanese, Korean and Latin in one family. The few names it lacks
 * glyphs for (simplified Chinese venue names, emoji in event titles, half-width kana) fall back
 * to Noto Sans SC, Noto Sans Symbols 2 and Noto Emoji. They are downloaded once into `.cache/fonts/`, pinned by
 * hash; a character no font has is reported, not drawn as a blank.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import satori, { type Font } from "satori";
import UPNG from "upng-js";

import { isDerived, type GEdge, type GNode, type GraphFile, type NodeType } from "../../shared/graph";
import { TYPE_PATHS, UI_PATHS } from "../../src/icons";
import { nodeSize } from "../../src/lib/node-size";
import { nodeProjectColor, palette, PROJECT_ORDER, projectColor } from "../../src/theme";
import type { CardStat, FactIcon, NodeCard } from "./og-card";

export const WIDTH = 1200;
export const HEIGHT = 630;

const PRETENDARD = "https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard-jp/dist/public/static/";
const FONT_FILES = [
  { file: "PretendardJP-Regular.otf", name: "Pretendard JP", weight: 400, url: `${PRETENDARD}PretendardJP-Regular.otf`, sha256: "8e45c1999c941e8237e52c650c64667638cff1e50b9492c7b02ee1d380b7d06d" },
  { file: "PretendardJP-Medium.otf", name: "Pretendard JP", weight: 500, url: `${PRETENDARD}PretendardJP-Medium.otf`, sha256: "889ab94f484ac3dfd4bd56ec75072358a10da1460099745fe15fffe6ddcaedc4" },
  { file: "PretendardJP-Bold.otf", name: "Pretendard JP", weight: 700, url: `${PRETENDARD}PretendardJP-Bold.otf`, sha256: "b7c518afea7212acfc10c99d1ddc0d28912adf906d65ae8ccd7c55b3ef3f6d1a" },
  { file: "NotoSansSC-Bold.otf", name: "Noto Sans SC", weight: 700, url: "https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf", sha256: "c6cb5a93abaa9edc8ee7463b7ebb7f42d618d40e6ed2f7a5371c97b0b64767c0" },
  // before the emoji font: its ❤ is drawn hatched (for "red"), this one is a plain heart
  { file: "NotoSansSymbols2-Regular.ttf", name: "Noto Sans Symbols 2", weight: 400, url: "https://raw.githubusercontent.com/google/fonts/7b6724ac7ececc713e9ba93af309f7520c9a80a3/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf", sha256: "7d5fb73b7ca67a6798101741f5d280a3d016a56a197afcd4199dbb57b4b82a21" },
  { file: "NotoEmoji.ttf", name: "Noto Emoji", weight: 400, url: "https://raw.githubusercontent.com/google/fonts/b979dba422e445492b0eb9951ac52ee0b4d648c3/ofl/notoemoji/NotoEmoji%5Bwght%5D.ttf", sha256: "de6c18832938afc99caf132b39d6a30a19bac7f2e812e28db2535b4608d27551" },
] as const;

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

/** The fonts, from the cache or downloaded (and checked against their pinned hash). */
export async function loadFonts(cacheDir: string): Promise<{ fonts: Font[]; hash: string }> {
  await mkdir(cacheDir, { recursive: true });
  const fonts: Font[] = [];
  for (const f of FONT_FILES) {
    const file = path.join(cacheDir, f.file);
    let data = await readFile(file).catch(() => null);
    if (!data || sha256(data) !== f.sha256) {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`font ${f.file}: HTTP ${res.status} from ${f.url}`);
      data = Buffer.from(await res.arrayBuffer());
      if (sha256(data) !== f.sha256) throw new Error(`font ${f.file}: unexpected content (sha256 ${sha256(data)})`);
      await writeFile(file, data);
    }
    fonts.push({ name: f.name, data, weight: f.weight, style: "normal" });
  }
  return { fonts, hash: sha256(Buffer.from(FONT_FILES.map((f) => f.sha256).join())) };
}

// ---- elements --------------------------------------------------------------------------------

export type Child = El | string | number | null | undefined | false;
export interface El {
  type: string;
  props: Record<string, unknown>;
}

function h(type: string, props: Record<string, unknown> | null, ...children: Child[]): El {
  const kids = children.filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
}

const div = (style: Record<string, unknown>, ...children: Child[]) => h("div", { style: { display: "flex", ...style } }, ...children);

/** An icon from icons.tsx as an image; `currentColor` (the party hat's fill) is the icon's color. */
const svgUrl = (inner: string, stroke: string, width = 2) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${inner.replaceAll("currentColor", stroke)}</svg>`)}`;

const icon = (inner: string, color: string, size: number, width = 2) => h("img", { src: svgUrl(inner, color, width), width: size, height: size, style: { flexShrink: 0 } });

const P = palette("light");

/** The site's mark (the favicon): three linked nodes. */
const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g stroke="#52514e" stroke-width="2"><path d="M9 9l14 4M9 9l3 15M23 13l-11 11"/></g><circle cx="9" cy="9" r="5" fill="#2a78d6"/><circle cx="23" cy="13" r="4" fill="#eb6834"/><circle cx="12" cy="24" r="4" fill="#1baf7a"/></svg>`,
)}`;

const brand = (size = 28) =>
  div({ alignItems: "center", gap: Math.round(size * 0.4) },
    h("img", { src: LOGO, width: size * 1.3, height: size * 1.3 }),
    div({ fontSize: size, fontWeight: 700, color: P.ink, letterSpacing: -0.3 }, "TakasakiInfo"));

const FACT_ICONS: Record<FactIcon, string> = { ...TYPE_PATHS, calendar: UI_PATHS.calendar, clock: UI_PATHS.clock, hat: UI_PATHS.hat };

/** Width of a text in ems, roughly: CJK and Hangul are square, Latin about half. */
function ems(text: string): number {
  let w = 0;
  for (const ch of text) w += /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uff60]/.test(ch) ? 1 : 0.56;
  return w;
}

/** The largest title size at which the title fits its lines (two at the large sizes, three below). */
function titleSize(text: string, width: number): { size: number; lines: number } {
  const w = ems(text);
  for (const [size, lines] of [[76, 1], [68, 2], [58, 2], [50, 3], [44, 3]] as const) if (w * size <= width * lines * 0.94) return { size, lines };
  return { size: 40, lines: 3 };
}

const oneLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

const pill = (text: string) =>
  div({ fontSize: 20, fontWeight: 500, color: P.ink2, border: `2px solid ${P.grid}`, borderRadius: 999, padding: "4px 14px", ...oneLine }, text);

const statBlock = (s: CardStat) =>
  div({ flexDirection: "column", gap: 2, minWidth: 0 },
    div({ fontSize: 44, fontWeight: 700, color: P.ink, lineHeight: 1.1 }, s.value.toLocaleString("en-US")),
    div({ fontSize: 18, fontWeight: 500, color: P.muted, ...oneLine }, s.label));

/** A project or a group with its own color, as the card shows it. */
interface Band {
  name: string;
  color: string;
}

/** The card's bands: its projects, the first one shown as its group when it has one (all of them so far have one project). */
function bands(c: NodeCard, names: CardNames): Band[] {
  return c.projects.map((p) =>
    c.group && p === c.projects[0]
      ? { name: names.group(c.group), color: nodeProjectColor(P, { p: [p], g: c.group }) }
      : { name: names.project(p), color: projectColor(P, [p]) });
}

/** The bottom edge: one band per project in its color, like a repository's language bar. */
const projectBar = (bs: Band[]) =>
  div({ height: 10, width: "100%" },
    ...(bs.length ? bs.map((b) => b.color) : [P.common]).map((color) => div({ flex: 1, height: 10, background: color })));

export interface CardNames {
  /** project id → its name */
  project: (id: string) => string;
  /** artist id of a group with its own color → its name */
  group: (id: string) => string;
}

/** Room for the project names at the bottom. */
const LEGEND_WIDTH = 640;

/** The projects by name: as many as fit whole, then how many more. */
function projectLegend(bs: Band[]) {
  const width = (b: Band) => 12 + 8 + ems(b.name) * 19 + 22;
  const shown: Band[] = [];
  let used = 40; // the `+N`
  for (const b of bs) {
    if (shown.length && used + width(b) > LEGEND_WIDTH) break;
    shown.push(b);
    used += width(b);
  }
  return div({ alignItems: "center", gap: 22, minWidth: 0, height: 24 },
    ...shown.map((b) =>
      div({ alignItems: "center", gap: 8, minWidth: 0, flexShrink: 1 },
        div({ width: 12, height: 12, borderRadius: 999, background: b.color, flexShrink: 0 }),
        div({ fontSize: 19, fontWeight: 500, color: P.ink2, ...oneLine }, b.name))),
    bs.length > shown.length ? div({ fontSize: 19, fontWeight: 500, color: P.muted, flexShrink: 0 }, `+${bs.length - shown.length}`) : null);
}

const PAD = 64;
/** Width of the text: the left part, where the map has faded out. */
const TEXT_WIDTH = 680;

/** `rgba()` of a `#rrggbb` color. */
const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/**
 * A node's card: what it is and its names on the left; on the right the whole map, faint, moved
 * so the node sits in the middle of it, with its links drawn in.
 */
export function nodeCardElement(c: NodeCard, names: CardNames, map: CardMap): El {
  const color = P.type[c.type];
  const bs = bands(c, names);
  const { size, lines } = titleSize(c.title, TEXT_WIDTH);
  return div({ width: WIDTH, height: HEIGHT, background: P.surface, fontFamily: "Pretendard JP", color: P.ink, position: "relative" },
    ...nodeOnMap(map, c.key),
    fade(),
    // the site, top right over the map
    div({ position: "absolute", right: 40, top: 40, padding: "8px 16px", borderRadius: 999, background: alpha(P.surface, 0.85) }, brand(22)),
    div({ position: "absolute", left: 0, top: 0, flexDirection: "column", boxSizing: "border-box", width: PAD + TEXT_WIDTH, height: HEIGHT - 10, padding: `56px 0 34px ${PAD}px` },
      // what it is
      div({ alignItems: "center", gap: 12 },
        div({ alignItems: "center", gap: 10, padding: "6px 18px 6px 6px", borderRadius: 999, background: alpha(color, 0.12), flexShrink: 0 },
          div({ width: 36, height: 36, borderRadius: 999, background: color, alignItems: "center", justifyContent: "center", flexShrink: 0 },
            icon(TYPE_PATHS[c.picto], P.picto[c.type], 21, 2.6)),
          div({ fontSize: 22, fontWeight: 700, color: P.ink2 }, c.kind)),
        ...c.tags.slice(0, 2).map(pill)),
      // names
      div({ marginTop: 34, fontSize: size, fontWeight: 700, lineHeight: 1.16, letterSpacing: -0.5, lineClamp: lines, ...(lines === 1 ? oneLine : {}) }, c.title),
      ...c.alt.map((a, i) => div({ marginTop: i === 0 ? 12 : 4, fontSize: 27, fontWeight: 500, color: P.ink2, ...oneLine }, a)),
      // facts
      div({ flexDirection: "column", gap: 10, marginTop: 26, minHeight: 0, overflow: "hidden" },
        ...c.facts.map((f) =>
          div({ alignItems: "center", gap: 12 },
            icon(FACT_ICONS[f.icon], P.muted, 24),
            div({ fontSize: 23, fontWeight: 500, color: P.ink2, ...oneLine }, f.text)))),
      div({ flex: 1 }),
      bs.length ? projectLegend(bs) : null),
    div({ position: "absolute", left: 0, bottom: 0, width: WIDTH }, projectBar(bs)));
}

// ---- the map ------------------------------------------------------------------------------------

type MapGraph = Pick<GraphFile, "nodes" | "edges">;

/** Fact links, without every node's line to its project (they would hide the rest). */
const drawn = (e: GEdge) => !isDerived(e.r) && e.r !== "project";

/** Where each node falls when the map's layout is fitted into `width`×`height` (y up, as on the site). */
function projection(graph: MapGraph, width: number, height: number, pad: number): Map<string, readonly [number, number]> {
  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => -n.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((width - pad * 2) / (x1 - x0), (height - pad * 2) / (y1 - y0));
  const ox = (width - (x1 - x0) * scale) / 2;
  const oy = (height - (y1 - y0) * scale) / 2;
  return new Map(graph.nodes.map((n) => [n.k, [ox + (n.x - x0) * scale, oy + (-n.y - y0) * scale] as const]));
}

const f1 = (v: number) => v.toFixed(1);
const DRAW_ORDER: NodeType[] = ["venue", "city", "release", "work", "person", "character", "artist", "concert", "project"];
const dot = (n: GNode, [x, y]: readonly [number, number], extra = "", fill = P.type[n.t], min = 0) =>
  `<circle cx="${f1(x)}" cy="${f1(y)}" r="${Math.max(min, nodeSize(n) * 0.62).toFixed(2)}" fill="${fill}"${extra}/>`;

/** The whole map as an SVG, drawn from the layout the build computed, in faint gray: what the cards lie on. */
function graphSvg(graph: MapGraph, size: number, pad: number): string {
  const pos = projection(graph, size, size, pad);
  const nodes = [...graph.nodes]
    .sort((a, b) => DRAW_ORDER.indexOf(a.t) - DRAW_ORDER.indexOf(b.t))
    .map((n) => dot(n, pos.get(n.k)!, "", "#d3d2cb"))
    .join("");
  // dots only: the links' hairlines would make every card several times larger
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + `<g stroke="${P.surface}" stroke-width="0.6" opacity="0.6">${nodes}</g></svg>`;
}

/** Size of the map behind a node card: larger than the card is tall, so the node's neighbourhood spreads out. */
const MAP_SIZE = 900;
/** Where a node card puts its node: the middle of the right part. */
const ANCHOR = [930, 330] as const;

/** The map behind the node cards: drawn once, moved under each card so that its node is at ANCHOR. */
export interface CardMap {
  /** the faint map, a PNG data URL, `size` square */
  image: string;
  size: number;
  pos: Map<string, readonly [number, number]>;
  nodes: Map<string, GNode>;
  /** each node's drawn links (a project's: its members) */
  links: Map<string, string[]>;
}

export function cardMap(graph: MapGraph, size = MAP_SIZE): CardMap {
  const links = new Map<string, string[]>(graph.nodes.map((n) => [n.k, []]));
  for (const e of graph.edges) {
    // a project's members are its links; the members' line to their project is not drawn
    if (e.r === "project") links.get(e.t)?.push(e.s);
    else if (drawn(e)) {
      links.get(e.s)?.push(e.t);
      links.get(e.t)?.push(e.s);
    }
  }
  const png = rasterise(graphSvg(graph, size, 24), size);
  return {
    image: `data:image/png;base64,${png.toString("base64")}`,
    size,
    pos: projection(graph, size, size, 24),
    nodes: new Map(graph.nodes.map((n) => [n.k, n])),
    links,
  };
}

/**
 * The faint map moved by (dx, dy), with the nodes `keys` drawn over it with their links and the
 * nodes at their ends: one node large (a node's card), or several small.
 */
function mapLayer(map: CardMap, dx: number, dy: number, keys: string[], colorOf?: (key: string) => string): Child[] {
  const place = (k: string) => {
    const [x, y] = map.pos.get(k)!;
    return [x + dx, y + dy] as const;
  };
  const one = keys.length === 1;
  let svg = "";
  let marks = "";
  for (const key of keys) {
    const node = map.nodes.get(key);
    if (!node || !map.pos.has(key)) continue;
    const color = colorOf?.(key) ?? P.type[node.t];
    const [x, y] = place(key).map(f1);
    const others = [...new Set(map.links.get(key) ?? [])].filter((k) => map.pos.has(k));
    const lines = others.map((k) => `M${x} ${y}L${place(k).map(f1).join(" ")}`).join("");
    svg += `<path d="${lines}" stroke="${color}" stroke-opacity="${others.length > 80 ? 0.22 : 0.45}" stroke-width="${one ? 1.3 : 1}" fill="none"/>`;
    svg += others
      .map((k) => map.nodes.get(k)!)
      .sort((a, b) => DRAW_ORDER.indexOf(a.t) - DRAW_ORDER.indexOf(b.t))
      .map((n) => dot(n, place(n.k), ` stroke="${P.surface}" stroke-width="1"`, colorOf ? color : P.type[n.t], 3.5))
      .join("");
    marks += one
      ? `<circle cx="${x}" cy="${y}" r="34" fill="${color}" fill-opacity="0.14"/>`
        + `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${color}" stroke-opacity="0.5" stroke-width="2"/>`
        + `<circle cx="${x}" cy="${y}" r="11" fill="${color}" stroke="${P.surface}" stroke-width="3"/>`
      : `<circle cx="${x}" cy="${y}" r="16" fill="${color}" fill-opacity="0.14"/>`
        + `<circle cx="${x}" cy="${y}" r="7" fill="${color}" stroke="${P.surface}" stroke-width="2"/>`;
  }
  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${svg}${marks}</svg>`;
  return [
    h("img", { src: map.image, width: map.size, height: map.size, style: { position: "absolute", left: dx, top: dy } }),
    keys.length ? h("img", { src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, width: WIDTH, height: HEIGHT, style: { position: "absolute", left: 0, top: 0 } }) : null,
  ];
}

/** The node where it is on the map, at ANCHOR. */
function nodeOnMap(map: CardMap, key: string): Child[] {
  const at = map.pos.get(key);
  return at ? mapLayer(map, ANCHOR[0] - at[0], ANCHOR[1] - at[1], [key]) : [];
}

/** The map's middle at `center`, with `keys` drawn in (in their type colors, or `colorOf`). */
export const mapBackdrop = (map: CardMap, keys: string[] = [], colorOf?: (key: string) => string, center: readonly [number, number] = ANCHOR): Child[] =>
  mapLayer(map, center[0] - map.size / 2, center[1] - map.size / 2, keys, colorOf);

/** The whole map on the right, each project lit in its color: its node and its members. */
export const projectsBackdrop = (map: CardMap): Child[] => {
  const ids = PROJECT_ORDER.filter((id) => map.nodes.has(`project:${id}`));
  return mapBackdrop(map, ids.map((id) => `project:${id}`), (k) => projectColor(P, [k.slice("project:".length)]), [WIDTH - map.size / 2 - 16, HEIGHT / 2 - 5]);
};

/** Size of the whole map on the map's own card. */
export const SITE_MAP_SIZE = 640;

/** The text side of a card over the map: the map fades out under it, from `at` (a share of the width) on. */
const fade = (at = 0.46) =>
  div({
    position: "absolute", left: 0, top: 0, width: WIDTH, height: HEIGHT,
    backgroundImage: `linear-gradient(90deg, ${P.surface} 0%, ${P.surface} ${at * 100}%, ${alpha(P.surface, 0.75)} ${(at + 0.12) * 100}%, ${alpha(P.surface, 0)} ${(at + 0.26) * 100}%)`,
  });

// ---- the site's cards -------------------------------------------------------------------------------

export interface SiteCard {
  /** after the site's name: `API` */
  suffix?: string;
  /** one line per language, the first larger */
  lines: string[];
  /** up to four counts */
  stats: CardStat[];
  /** short labels at the bottom, where the counts would be */
  chips?: string[];
  /** behind the card: the faint map (mapBackdrop, projectsBackdrop), faded out under the text */
  backdrop: Child[];
}

/** The projects' colors in their order, for the site's cards' bottom edge. */
const projectStripe = () =>
  div({ position: "absolute", left: 0, right: 0, bottom: 0, height: 10 },
    ...PROJECT_ORDER.filter((id) => id !== "lovelive" && P.projects[id]).map((id) => div({ flex: 1, background: P.projects[id] })));

/** The site's own pages (the map, the API reference): what it is on the left, the map behind on the right. */
export function siteCardElement(s: SiteCard): El {
  return div({ width: WIDTH, height: HEIGHT, background: P.surface, fontFamily: "Pretendard JP", color: P.ink, position: "relative" },
    ...s.backdrop,
    // the text is narrower than a node card's
    fade(0.4),
    div({ position: "absolute", left: 0, top: 0, flexDirection: "column", boxSizing: "border-box", width: 520 + PAD, height: HEIGHT - 10, padding: `60px 0 44px ${PAD}px` },
      div({ alignItems: "center", gap: 18 },
        h("img", { src: LOGO, width: 64, height: 64 }),
        div({ fontSize: 54, fontWeight: 700, letterSpacing: -1 }, "TakasakiInfo"),
        s.suffix ? div({ fontSize: 54, fontWeight: 700, color: P.slots[0] }, s.suffix) : null),
      div({ flexDirection: "column", gap: 8, marginTop: 34 },
        ...s.lines.map((t, i) => div({ fontSize: i === 0 ? 32 : 26, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P.ink : P.ink2, lineHeight: 1.3 }, t))),
      div({ flex: 1 }),
      // counts two to a row (satori does not size wrapped rows)
      div({ flexDirection: "column", gap: 22 },
        ...[0, 2].filter((i) => i < s.stats.length).map((i) =>
          div({ gap: 24 }, ...s.stats.slice(i, i + 2).map((st) => div({ width: 240 }, statBlock(st)))))),
      s.chips ? div({ gap: 12 }, ...s.chips.map(pill)) : null),
    projectStripe());
}

// ---- rendering ------------------------------------------------------------------------------------

export interface Renderer {
  /** `label` names the card in the report of missing glyphs */
  render: (el: El, label: string) => Promise<Buffer>;
  /** characters no font had a glyph for, with where they were */
  missing: Map<string, Set<string>>;
}

export function renderer(fonts: Font[]): Renderer {
  const missing = new Map<string, Set<string>>();
  return {
    missing,
    async render(el, label) {
      const svg = await satori(el as never, {
        width: WIDTH,
        height: HEIGHT,
        fonts,
        loadAdditionalAsset: async (_code, segment) => {
          for (const ch of segment) {
            const set = missing.get(ch) ?? new Set();
            set.add(label);
            missing.set(ch, set);
          }
          return [];
        },
      });
      return png(new Resvg(svg, { fitTo: { mode: "width", value: WIDTH }, font: { loadSystemFonts: false } }).render(), CARD_COLORS);
    },
  };
}

/**
 * Colors of a card's PNG: the faint map's dots make a lossless card a few times larger, and the
 * cards are many; 128 colors keep the text and the map clean.
 */
const CARD_COLORS = 128;

/**
 * resvg's own PNG encoding is light; UPNG's filters and deflate make the same pixels (lossless)
 * less than half the size, which counts at one card per node. resvg's pixels are premultiplied
 * and a PNG's are not: translucent ones are divided back, or they come out dark.
 */
function png(img: { pixels: Buffer; width: number; height: number }, colors = 0): Buffer {
  const px = new Uint8Array(img.pixels);
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0 || a === 255) continue;
    for (let c = i; c < i + 3; c++) px[c] = Math.min(255, Math.round((px[c] * 255) / a));
  }
  return Buffer.from(UPNG.encode([px.buffer], img.width, img.height, colors));
}

/** A PNG from a plain SVG (the map), for embedding in a card. */
export function rasterise(svg: string, width: number): Buffer {
  return png(new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false } }).render());
}
