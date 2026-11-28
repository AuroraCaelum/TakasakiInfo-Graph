import type { GNode } from "../../shared/graph";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Node radius in screen pixels: a floor per type, growing with link strength. */
export function nodeSize(n: GNode): number {
  const s = Math.sqrt(n.m.wdeg);
  switch (n.t) {
    case "project": return 15;
    case "concert": return clamp(7 + s * 0.3, 7, 13);
    case "venue": return 4.5;
    case "city": return clamp(5 + s * 0.4, 5, 10);
    case "artist": return clamp(4.5 + s * 0.45, 4.5, 13);
    case "character": return clamp(3.5 + s * 0.4, 3.5, 11);
    case "person": return clamp(2.2 + s * 0.5, 2.2, 13);
    case "work": return clamp(2.2 + s * 0.35, 2.2, 9);
    case "release": return clamp(2.6 + s * 0.3, 2.6, 8);
  }
}
