/**
 * "Report an error": a link to a new issue on the TakasakiInfo data repository, filled in with
 * what identifies the node (type, key, names, projects, a link back to it, the data version),
 * and headings for the reporter to fill in. GitHub reads `title`, `body` and `labels` from the
 * query (the label only takes for those allowed to set it, and is ignored otherwise).
 */

import type { GNode, GraphMeta } from "../../shared/graph";
import type { Dict, UiLang } from "../i18n";
import { nameOrder } from "./names";

export const DATA_REPO = "https://github.com/AuroraCaelum/TakasakiInfo";

/** A link to the node on the site: the page's own address with only the node selected. */
export function nodePageUrl(location: Pick<Location, "origin" | "pathname">, key: string): string {
  return `${location.origin}${location.pathname}?n=${encodeURIComponent(key).replace(/%3A/g, ":").replace(/%2F/g, "/")}`;
}

export function issueUrl(args: {
  node: GNode; name: string; type: string; sub?: string | null; projects: string[]; tab: string;
  page: string; meta: GraphMeta; ui: UiLang; t: Dict;
}): string {
  const { node, name, type, sub, projects, tab, page, meta, ui, t } = args;
  const r = t.reportIssue;
  const names = nameOrder(ui).map((l) => (node.n[l] ? `${l}: ${node.n[l]}` : null)).filter(Boolean).join(" / ");
  const version = `${meta.dbLastUpdate}${meta.sha ? ` (${meta.sha.slice(0, 7)})` : ""}`;
  const body = [
    `### ${r.node}`,
    `- ${r.type}: ${type}${sub ? ` (${sub})` : ""}`,
    `- ${r.key}: \`${node.k}\``,
    `- ${r.names}: ${names || name}`,
    ...(projects.length ? [`- ${r.projects}: ${projects.join(", ")}`] : []),
    `- ${r.page}: ${page}`,
    `- ${r.tab}: ${tab}`,
    `- ${r.version}: ${version}`,
    "",
    `### ${r.what}`,
    `<!-- ${r.whatHint} -->`,
    "",
    "",
    `### ${r.source}`,
    `<!-- ${r.sourceHint} -->`,
    "",
  ].join("\n");
  const q = new URLSearchParams({ title: r.title(type, name), body, labels: "bug" });
  return `${DATA_REPO}/issues/new?${q}`;
}
