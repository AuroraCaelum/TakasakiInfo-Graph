/**
 * Live layouts: run in the browser over the nodes and fact edges the filters leave, in a web
 * worker, starting from where the nodes are on screen. Every frame is fitted back into the
 * area those nodes started in, so the picture grows or shrinks in place instead of drifting
 * off the camera, and the focus view and camera keep working in the same coordinates.
 *
 * ForceAtlas2 starts from the build's forces (shared/layout.ts): with those, over the nodes the
 * build laid out it barely moves from the precomputed map, and over a filtered subset it
 * re-arranges just that subset. The viewer can change them as in Gephi's panel.
 *
 * Noverlap only nudges overlapping nodes apart, as Gephi's does after a ForceAtlas2 run. sigma
 * draws a node at a pixel size that shrinks more slowly than the map as one zooms out, so nodes
 * are apart only from some zoom on: Noverlap spaces them for the zoom it runs at, and is not
 * fitted back into a frame (that would squeeze them together again).
 */

import Graph from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import NoverlapLayout from "graphology-layout-noverlap/worker";

import { fa2Settings, layoutWeight, type Fa2Options } from "../../shared/layout";
import type { Model } from "../model";
import type { LayoutName, NoverlapOptions } from "../view";
import { globalSpan, type Positions } from "./focus-layout";
import type { Visible } from "./visibility";

export type Point = { x: number; y: number };

export interface RunOptions {
  fa2: Fa2Options;
  noverlap: NoverlapOptions;
  /** the view the run starts in: map units per screen pixel, and each node's drawn radius in pixels */
  view: { unitsPerPx: number; radiusPx: (k: string) => number };
}

/**
 * A run stops once a node's mean move per iteration has stayed below this share of the
 * picture's span for CALM_ITERATIONS in a row (ForceAtlas2 never comes to a full rest: a
 * settled map still trembles by about a third of this). Counted in iterations, not frames, so
 * a slow screen does not keep a settled layout running.
 */
const CALM = 1.5e-4;
const CALM_ITERATIONS = 60;
/**
 * …but runs at least this long (a new subset needs a moment to start moving) and at most this:
 * the default forces settle in seconds, LinLog needs a few thousand iterations.
 */
const MIN_MS = 1500;
const MAX_MS = 45000;
/**
 * Noverlap stops by itself once nothing overlaps, but where nodes crowd it never gets there: it
 * clears most overlaps in its first hundred or so iterations, then a few nodes jostle forever.
 */
const NOVERLAP_ITERATIONS = 300;

/** The visible nodes and fact edges as a simple weighted graph, at the positions `at` gives. */
export function layoutGraph(model: Model, visible: Visible, at: (k: string) => Point): Graph {
  const g = new Graph({ type: "undirected", multi: false, allowSelfLoops: false });
  for (const k of visible.nodes) {
    const p = at(k);
    g.addNode(k, { x: p.x, y: p.y });
  }
  // derived relations are summaries of the facts (co-credits, shared members): pulling along
  // them too would count the same facts twice, as the build's layout leaves them out as well
  for (const e of visible.edges) {
    const a = model.graph.getEdgeAttributes(e);
    if (a.derived) continue;
    const [s, t] = model.graph.extremities(e);
    const w = a.facts.reduce((sum, f) => sum + layoutWeight(f.r, f.w), 0);
    if (g.hasEdge(s, t)) g.updateEdgeAttribute(s, t, "weight", (x: number) => x + w);
    else g.addEdge(s, t, { weight: w });
  }
  return g;
}

interface Frame {
  cx: number;
  cy: number;
  span: number;
}

function frameOf(g: Graph): Frame {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  g.forEachNode((_k, a) => {
    x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x);
    y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y);
  });
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span: Math.max(x1 - x0, y1 - y0) };
}

/** `g`'s positions, uniformly scaled and centered so their larger side matches `frame`. */
export function fitInto(g: Graph, frame: Frame): Positions {
  const raw = frameOf(g);
  const scale = raw.span > 0 ? frame.span / raw.span : 1;
  const out: Positions = new Map();
  g.forEachNode((k, a) => out.set(k, { x: frame.cx + (a.x - raw.cx) * scale, y: frame.cy + (a.y - raw.cy) * scale }));
  return out;
}

/**
 * Starts a live layout. `onFrame` gets the visible nodes' positions about once per screen
 * refresh; `onEnd` is called when the layout settles (not when it is stopped). Returns stop.
 */
export function runLayout(
  name: Exclude<LayoutName, "preset">, model: Model, visible: Visible, at: (k: string) => Point, options: RunOptions,
  onFrame: (pos: Positions) => void, onEnd: () => void,
): () => void {
  switch (name) {
    case "fa2": return runForceAtlas2(model, visible, at, options.fa2, onFrame, onEnd);
    case "noverlap": return runNoverlap(visible, at, options, onFrame, onEnd);
  }
}

function runForceAtlas2(
  model: Model, visible: Visible, at: (k: string) => Point, fa2: Fa2Options,
  onFrame: (pos: Positions) => void, onEnd: () => void,
) {
  const g = layoutGraph(model, visible, at);
  if (g.order < 2) {
    const id = requestAnimationFrame(onEnd);
    return () => cancelAnimationFrame(id);
  }
  // a lone node or a line still gets an area to grow into
  const start = frameOf(g);
  const frame = { ...start, span: Math.max(start.span, globalSpan(model) * 0.15) };
  // the worker sends one iteration at a time; the reducer sees each node once per iteration
  let reduced = 0;
  const layout = new FA2Layout(g, {
    settings: fa2Settings(g.order, fa2),
    getEdgeWeight: "weight",
    outputReducer: (_k, a) => { reduced += 1; return a; },
  });
  layout.start();

  const t0 = performance.now();
  let prev: Positions | null = null;
  let calm = 0;
  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    layout.kill();
  };
  const tick = () => {
    const pos = fitInto(g, frame);
    const iterations = reduced / g.order;
    reduced = 0;
    // a frame without a new iteration from the worker says nothing about settling
    if (prev && iterations > 0) {
      let moved = 0;
      for (const [k, p] of pos) {
        const q = prev.get(k)!;
        moved += Math.hypot(p.x - q.x, p.y - q.y);
      }
      calm = moved / pos.size / iterations < CALM * frame.span ? calm + iterations : 0;
    }
    if (iterations > 0 || !prev) prev = pos;
    onFrame(pos);
    const elapsed = performance.now() - t0;
    if ((calm >= CALM_ITERATIONS && elapsed > MIN_MS) || elapsed > MAX_MS) {
      stop();
      onEnd();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return stop;
}

/**
 * The visible nodes at the positions `at` gives, each as large as it is drawn now (in map units,
 * times `ratio`, plus `margin` pixels): what Noverlap keeps apart.
 */
export function noverlapGraph(visible: Visible, at: (k: string) => Point, { noverlap, view }: RunOptions): Graph {
  const g = new Graph({ type: "undirected" });
  for (const k of visible.nodes) {
    const p = at(k);
    g.addNode(k, { x: p.x, y: p.y, size: view.radiusPx(k) * view.unitsPerPx * noverlap.ratio });
  }
  return g;
}

function runNoverlap(visible: Visible, at: (k: string) => Point, options: RunOptions, onFrame: (pos: Positions) => void, onEnd: () => void) {
  const g = noverlapGraph(visible, at, options);
  const positions = (): Positions => {
    const out: Positions = new Map();
    g.forEachNode((k, a) => out.set(k, { x: a.x, y: a.y }));
    return out;
  };
  let done = false;
  let reduced = 0;
  // sizes already carry the ratio; the margin is in pixels, so in map units at this zoom
  const layout = new NoverlapLayout(g, {
    settings: { margin: options.noverlap.margin * options.view.unitsPerPx, ratio: 1 },
    onConverged: () => { done = true; },
    // one call per node per iteration: counts the iterations
    outputReducer: (_k, a) => { reduced += 1; return a; },
  });
  layout.start();

  const t0 = performance.now();
  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    layout.kill();
  };
  const tick = () => {
    onFrame(positions());
    if (done || reduced / g.order >= NOVERLAP_ITERATIONS || performance.now() - t0 > MAX_MS) {
      stop();
      onEnd();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return stop;
}
