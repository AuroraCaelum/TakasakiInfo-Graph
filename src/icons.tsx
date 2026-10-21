/**
 * One pictogram per node type: drawn inside graph nodes (as a texture) and next to names in
 * the UI, so a node's type never rests on color alone. BGM works (a soundtrack cue played
 * live, D50) are works with a pictogram of their own.
 */

import type { SVGProps } from "react";

import type { NodeType } from "../shared/graph";

export type Pictogram = NodeType | "bgm";

/** The pictogram of a node: its type's, or for a BGM work the BGM one. */
export const pictogramOf = (t: NodeType, sub?: string): Pictogram => (t === "work" && sub === "bgm" ? "bgm" : t);

const TYPE_PATHS: Record<Pictogram, string> = {
  project: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  artist: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
  character: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>',
  work: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  release: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  concert: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
  venue: '<path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  city: '<path d="M3 21h18"/><path d="M5 21V4h8v17"/><path d="M13 21V10h6v11"/><path d="M8.5 8h1M8.5 12h1M8.5 16h1M15.5 14h1M15.5 17.5h1"/>',
  bgm: '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',
};

const svg = (inner: string, stroke: string, width: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

/** Data URL of the white pictogram, recolored by the node program (`drawingMode: "color"`). */
export function pictogramUrl(t: Pictogram): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(TYPE_PATHS[t], "#ffffff", 2.6))}`;
}

/** A node type's pictogram; `sub` (the node's subtype) picks the BGM one for BGM works. */
export function TypeIcon({ type, sub, size = 16, ...rest }: { type: NodeType; sub?: string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TYPE_PATHS[pictogramOf(type, sub)] }}
      {...rest}
    />
  );
}

const UI_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  focus: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  external: '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  swap: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.4l7.2 1.2M7 8.3l2.2 7.4M16.4 10l-4.6 6.2"/>',
  bars: '<path d="M3 21h18"/><path d="M6 17v-5M11 17V6M16 17v-8M21 17v-3"/>',
} as const;

export type UiIconName = keyof typeof UI_PATHS;

export function Icon({ name, size = 18, ...rest }: { name: UiIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: UI_PATHS[name] }}
      {...rest}
    />
  );
}
