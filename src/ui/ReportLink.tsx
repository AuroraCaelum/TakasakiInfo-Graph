/** "Report an error" at the foot of a node's panel: a new GitHub issue, filled in with the node. */

import type { GNode } from "../../shared/graph";
import { useModel, useT } from "../context";
import { Icon } from "../icons";
import { nameOf } from "../lib/names";
import { issueUrl, nodePageUrl } from "../lib/report";
import { useApp } from "../store";
import { useProjectName } from "./common";
import { subtypeLabel } from "./labels";

export function ReportLink({ node, className }: { node: GNode; className?: string }) {
  const t = useT();
  const model = useModel();
  const nameLang = useApp((s) => s.nameLang);
  const ui = useApp((s) => s.uiLang);
  const tab = useApp((s) => s.tab);
  const projectName = useProjectName();
  // built on click, so the link carries the tab and names as they are then
  const open = () => {
    const url = issueUrl({
      node, name: nameOf(node.n, nameLang, node.k), type: t.types[node.t], sub: subtypeLabel(t, node),
      projects: node.t === "project" ? [] : node.p.map(projectName), tab: t.tabs[tab],
      page: nodePageUrl(window.location, node.k), meta: model.meta, ui, t,
    });
    window.open(url, "_blank", "noopener");
  };
  return (
    <button type="button" className={className ?? "text-btn report-btn"} title={t.reportHint} onClick={open}>
      <Icon name="alert" size={14} />
      {t.report}
      <Icon name="external" size={12} />
    </button>
  );
}
