import type { GNode } from "../../shared/graph";
import type { Dict } from "../i18n";

/** Subtype and status in words: release type, work kind, artist kind… */
export function subtypeLabel(t: Dict, n: GNode): string {
  const parts: string[] = [];
  if (n.t === "release" && n.s) parts.push(t.releaseType[n.s] ?? n.s);
  if (n.t === "work" && n.s && n.s !== "song") parts.push(t.workKind[n.s] ?? n.s);
  if (n.t === "artist" && n.s) parts.push(t.artistKind[n.s] ?? n.s);
  if (n.st === "announced") parts.push(t.status.announced);
  return parts.join(" · ");
}
