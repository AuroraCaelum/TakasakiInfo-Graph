/** The color class of a node under each "color by" mode; the legend lists the same classes. */

import type { GNode } from "../../shared/graph";
import { COMMUNITY_COLORS, communityColor, nodeProjectColor, type Palette } from "../theme";
import type { ColorBy } from "../view";

export function classOf(n: GNode, colorBy: ColorBy): string {
  switch (colorBy) {
    case "type":
      return `type:${n.t}`;
    case "project":
      if (n.g) return `group:${n.g}`;
      if (n.p.length > 1) return "project:_multi";
      if (!n.p.length) return "project:_none";
      return `project:${n.p[0]}`;
    case "community":
      return n.m.cm < COMMUNITY_COLORS ? `community:${n.m.cm}` : "community:_other";
  }
}

export function colorOf(n: GNode, colorBy: ColorBy, p: Palette): string {
  switch (colorBy) {
    case "type":
      return p.type[n.t];
    case "project":
      return nodeProjectColor(p, n);
    case "community":
      return communityColor(p, n.m.cm);
  }
}
