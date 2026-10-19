import EdgeCurveProgram from "@sigma/edge-curve";
import { createNodeImageProgram } from "@sigma/node-image";
import { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import { createNodeCompoundProgram, EdgeRectangleProgram, NodeCircleProgram, type NodeProgramType } from "sigma/rendering";
import type { NodeDisplayData, EdgeDisplayData } from "sigma/types";
import { animateNodes } from "sigma/utils";

import type { GNode } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { Icon } from "../icons";
import type { PathResult } from "../lib/analysis";
import { classOf, colorOf } from "../lib/classes";
import { focusLayout } from "../lib/focus-layout";
import { nameOf } from "../lib/names";
import type { Visible } from "../lib/visibility";
import type { EdgeAttrs, NodeAttrs } from "../model";
import { useApp } from "../store";
import type { Palette } from "../theme";
import type { ColorBy } from "../view";
import type { NameLang } from "../i18n";
import { EdgeTip, NodeTip } from "./Tooltip";

const LABEL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Yu Gothic UI", "Yu Gothic", Meiryo, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK JP", sans-serif';

interface RenderState {
  visible: Visible;
  palette: Palette;
  nameLang: NameLang;
  colorBy: ColorBy;
  selected: string | null;
  hovered: string | null;
  nodes: Set<string> | null;
  edges: Set<string> | null;
}

type Tip = { kind: "node"; key: string; x: number; y: number } | { kind: "edge"; key: string; x: number; y: number };

interface Props {
  visible: Visible;
  path: PathResult | null;
}

export function GraphView({ visible, path }: Props) {
  const model = useModel();
  const palette = usePalette();
  const t = useT();
  const container = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma<NodeAttrs, EdgeAttrs> | null>(null);
  const clicked = useRef<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const nameLang = useApp((s) => s.nameLang);
  const colorBy = useApp((s) => s.colorBy);
  const selected = useApp((s) => s.selected);
  const focus = useApp((s) => s.focus);
  const legendHover = useApp((s) => s.legendHover);

  const state = useRef<RenderState>({
    visible, palette, nameLang, colorBy, selected, hovered: null, nodes: null, edges: null,
  });

  // --- sigma instance ------------------------------------------------------------------------
  useEffect(() => {
    const el = container.current!;
    const st = state;
    // circle + pictogram; the programs are declared over plain Attributes, hence the cast
    const NodeProgram = createNodeCompoundProgram([
      NodeCircleProgram,
      createNodeImageProgram({
        drawingMode: "color", colorAttribute: "pictoColor", keepWithinCircle: true, padding: 0.24,
        size: { mode: "force", value: 96 },
      }),
    ]) as unknown as NodeProgramType<NodeAttrs, EdgeAttrs>;

    const drawLabel = (ctx: CanvasRenderingContext2D, data: { x: number; y: number; size: number; label: string | null }, size: number, weight: string) => {
      if (!data.label) return;
      const p = st.current.palette;
      ctx.font = `${weight} ${size}px ${LABEL_FONT}`;
      const x = data.x + data.size + 3;
      const y = data.y + size / 3;
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.mode === "light" ? "rgba(252,252,251,0.92)" : "rgba(26,26,25,0.92)";
      ctx.strokeText(data.label, x, y);
      ctx.fillStyle = p.ink;
      ctx.fillText(data.label, x, y);
    };

    const sigma = new Sigma<NodeAttrs, EdgeAttrs>(model.graph, el, {
      defaultNodeType: "pictogram",
      nodeProgramClasses: { pictogram: NodeProgram },
      nodeHoverProgramClasses: { pictogram: NodeProgram },
      defaultEdgeType: "line",
      edgeProgramClasses: { line: EdgeRectangleProgram, curve: EdgeCurveProgram },
      labelFont: LABEL_FONT,
      labelSize: 12,
      labelWeight: "500",
      labelDensity: 0.5,
      labelGridCellSize: 90,
      labelRenderedSizeThreshold: 8,
      enableEdgeEvents: true,
      zIndex: true,
      minCameraRatio: 0.015,
      maxCameraRatio: 4,
      stagePadding: 40,
      defaultDrawNodeLabel: (ctx, data, settings) => drawLabel(ctx, data, settings.labelSize, settings.labelWeight),
      defaultDrawNodeHover: (ctx, data, settings) => {
        if (!data.label) return;
        const p = st.current.palette;
        const size = settings.labelSize + 1;
        ctx.font = `600 ${size}px ${LABEL_FONT}`;
        const w = ctx.measureText(data.label).width;
        const h = size + 10;
        const x = data.x + data.size + 2;
        ctx.fillStyle = p.surface;
        ctx.strokeStyle = p.mode === "light" ? "rgba(11,11,11,0.18)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 2, data.y - h / 2, w + 12, h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.ink;
        ctx.fillText(data.label, x + 4, data.y + size / 3);
        ctx.beginPath();
        ctx.arc(data.x, data.y, data.size + 3, 0, Math.PI * 2);
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      },
      nodeReducer: (key, data) => {
        const s = st.current;
        const res: Partial<NodeDisplayData> & Partial<NodeAttrs> = { ...data };
        if (!s.visible.nodes.has(key)) {
          res.hidden = true;
          return res;
        }
        const n = model.nodes.get(key)!;
        res.label = nameOf(n.n, s.nameLang, key);
        const inFocus = !s.nodes || s.nodes.has(key);
        if (inFocus) {
          res.color = colorOf(n, s.colorBy, s.palette);
          res.pictoColor = s.colorBy === "type" ? s.palette.picto[n.t] : "#ffffff";
          res.zIndex = s.nodes ? 2 : n.t === "project" ? 1 : 0;
          if (n.t === "project" || (s.nodes && s.nodes.size <= 12)) res.forceLabel = true;
        } else {
          res.color = s.palette.dim;
          res.pictoColor = s.palette.dim;
          res.label = "";
          res.zIndex = 0;
        }
        if (key === s.selected) {
          res.highlighted = true;
          res.forceLabel = true;
          res.size = data.size * 1.35 + 2;
          res.zIndex = 3;
        }
        return res;
      },
      edgeReducer: (key, data) => {
        const s = st.current;
        const res: Partial<EdgeDisplayData> = { ...data };
        if (!s.visible.edges.has(key)) {
          res.hidden = true;
          return res;
        }
        const p = s.palette;
        if (s.edges) {
          if (s.edges.has(key)) {
            res.color = data.derived ? p.derivedStrong : p.edgeStrong;
            res.size = data.size * 1.5 + 0.5;
            res.zIndex = 2;
          } else {
            res.color = p.edgeFaint;
            res.zIndex = 0;
          }
        } else {
          res.color = data.derived ? p.derived : p.edge;
        }
        return res;
      },
    });
    sigma.setCustomBBox(sigma.getBBox()); // the focus view moves nodes; the frame must not follow
    sigmaRef.current = sigma;
    if (import.meta.env.DEV) (window as unknown as { sigma: unknown }).sigma = sigma; // for debugging in the console

    sigma.on("clickNode", ({ node }) => {
      clicked.current = node;
      useApp.getState().select(node);
    });
    sigma.on("doubleClickNode", ({ node, preventSigmaDefault }) => {
      preventSigmaDefault();
      clicked.current = node;
      const app = useApp.getState();
      app.select(node);
      app.set({ focus: app.focus || 1, pathOn: false });
    });
    sigma.on("clickStage", () => {
      const app = useApp.getState();
      if (app.selected) app.select(null);
    });
    sigma.on("enterNode", ({ node, event }) => {
      el.style.cursor = "pointer";
      setHovered(node);
      setTip({ kind: "node", key: node, x: event.x, y: event.y });
    });
    sigma.on("leaveNode", () => {
      el.style.cursor = "";
      setHovered(null);
      setTip(null);
    });
    sigma.on("enterEdge", ({ edge, event }) => setTip({ kind: "edge", key: edge, x: event.x, y: event.y }));
    sigma.on("leaveEdge", () => setTip((x) => (x?.kind === "edge" ? null : x)));
    sigma.getCamera().on("updated", () => setTip(null));

    const ro = new ResizeObserver(() => sigma.refresh());
    ro.observe(el);
    return () => {
      ro.disconnect();
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [model]);

  // --- render state --------------------------------------------------------------------------
  useEffect(() => {
    const s = state.current;
    s.visible = visible;
    s.palette = palette;
    s.nameLang = nameLang;
    s.colorBy = colorBy;
    s.selected = selected && visible.nodes.has(selected) ? selected : null;
    s.hovered = hovered;
    s.nodes = null;
    s.edges = null;
    const around = (k: string) => {
      const nodes = new Set([k]);
      const edges = new Set<string>();
      model.graph.forEachEdge(k, (e, _a, a, b) => {
        if (!visible.edges.has(e)) return;
        edges.add(e);
        nodes.add(a === k ? b : a);
      });
      return { nodes, edges };
    };
    if (path && path.nodes.length > 1) {
      s.nodes = new Set(path.nodes);
      s.edges = new Set(path.edges);
    } else if (s.selected) {
      ({ nodes: s.nodes, edges: s.edges } = around(s.selected));
    } else if (hovered && visible.nodes.has(hovered)) {
      ({ nodes: s.nodes, edges: s.edges } = around(hovered));
    } else if (legendHover) {
      s.nodes = new Set([...visible.nodes].filter((k) => classOf(model.nodes.get(k)!, colorBy) === legendHover));
      s.edges = new Set();
    }
    // while something is highlighted, label its small neighbours too (dimmed nodes have no
    // label, so the label grid only has to place the highlighted ones without overlap)
    sigmaRef.current?.setSetting("labelRenderedSizeThreshold", s.nodes ? 0 : 8);
    sigmaRef.current?.refresh();
  }, [model, visible, palette, nameLang, colorBy, selected, hovered, legendHover, path]);

  // --- camera: fly to a node selected outside the graph ----------------------------------------
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma || !selected || focus || useApp.getState().pathTo) return;
    if (clicked.current === selected) return;
    clicked.current = null;
    const go = () => {
      const d = sigma.getNodeDisplayData(selected);
      if (!d) return;
      const cam = sigma.getCamera();
      cam.animate({ x: d.x, y: d.y, ratio: Math.min(cam.getState().ratio, 0.35) }, { duration: 600 });
    };
    requestAnimationFrame(go);
  }, [selected, focus]);

  // --- camera: frame a found path ------------------------------------------------------------
  const pathKey = path && path.nodes.length > 1 ? path.nodes.join("|") : null;
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma || !pathKey) return;
    const id = requestAnimationFrame(() => fitTo(sigma, pathKey.split("|")));
    return () => cancelAnimationFrame(id);
  }, [pathKey]);

  // --- focus view: local layout around the selection ------------------------------------------
  const focusKey = focus && selected ? `${selected}|${focus}` : null;
  const wasFocused = useRef(false);
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;
    const graph = model.graph;
    if (focusKey && selected && visible.nodes.has(selected)) {
      wasFocused.current = true;
      const pos = focusLayout(model, selected, visible);
      const targets: Record<string, { x: number; y: number }> = {};
      graph.forEachNode((k) => {
        const n = model.nodes.get(k)!;
        targets[k] = pos.get(k) ?? { x: n.x, y: n.y };
      });
      return animateNodes(graph, targets, { duration: 450, easing: "quadraticInOut" }, () => fitTo(sigma, [...pos.keys()]));
    }
    if (wasFocused.current) {
      wasFocused.current = false;
      const targets: Record<string, { x: number; y: number }> = {};
      for (const n of model.list) targets[n.k] = { x: n.x, y: n.y };
      return animateNodes(graph, targets, { duration: 450, easing: "quadraticInOut" }, () => {
        if (selected) {
          const d = sigma.getNodeDisplayData(selected);
          if (d) sigma.getCamera().animate({ x: d.x, y: d.y, ratio: 0.35 }, { duration: 400 });
        } else {
          sigma.getCamera().animatedReset({ duration: 400 });
        }
      });
    }
    // `visible` matters only while focused: a filter change re-lays the neighbourhood out
  }, [focusKey, focusKey ? visible : null, model]);

  const cam = () => sigmaRef.current?.getCamera();
  return (
    <div className="graph">
      <div ref={container} className="graph-canvas" />
      {tip?.kind === "node" && model.nodes.get(tip.key) && (
        <NodeTip node={model.nodes.get(tip.key) as GNode} x={tip.x} y={tip.y} />
      )}
      {tip?.kind === "edge" && model.graph.hasEdge(tip.key) && (
        <EdgeTip attrs={model.graph.getEdgeAttributes(tip.key)} x={tip.x} y={tip.y} />
      )}
      <div className="zoom-controls" role="group">
        <button type="button" className="icon-btn" title={t.zoomIn} aria-label={t.zoomIn} onClick={() => cam()?.animatedZoom({ duration: 250 })}>
          <Icon name="plus" />
        </button>
        <button type="button" className="icon-btn" title={t.zoomOut} aria-label={t.zoomOut} onClick={() => cam()?.animatedUnzoom({ duration: 250 })}>
          <Icon name="minus" />
        </button>
        <button type="button" className="icon-btn" title={t.zoomReset} aria-label={t.zoomReset} onClick={() => cam()?.animatedReset({ duration: 400 })}>
          <Icon name="fit" />
        </button>
      </div>
    </div>
  );
}

/** Animates the camera to frame `keys` (display coordinates are the normalised frame). */
function fitTo(sigma: Sigma<NodeAttrs, EdgeAttrs>, keys: string[]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const k of keys) {
    const d = sigma.getNodeDisplayData(k);
    if (!d) continue;
    x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x);
    y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y);
  }
  if (!Number.isFinite(x0)) return;
  const { width, height } = sigma.getDimensions();
  const aspect = width / Math.max(height, 1);
  const span = Math.max((x1 - x0) / Math.max(aspect, 1), (y1 - y0) * Math.min(aspect, 1));
  sigma.getCamera().animate({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, ratio: Math.max(span * 1.25, 0.04) }, { duration: 450 });
}
