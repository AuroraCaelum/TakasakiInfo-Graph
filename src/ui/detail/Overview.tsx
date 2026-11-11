import type { Detail, GNode } from "../../../shared/graph";
import type { Names } from "../../../shared/v1";
import { useModel, useT } from "../../context";
import { formatBirthday, useBirthdaysToday } from "../../lib/birthday";
import { fandomUrl } from "../../lib/links";
import { namePartText, nameOrder } from "../../lib/names";
import { useApp } from "../../store";
import { Aliases, Badge, BirthdayBadge, EvidenceList, ExtLink, KV, NodeLink, Section, shortUrl } from "../common";

const LANG_LABEL: Record<keyof Names, string> = { ja: "ja", kana: "kana", rom: "rom", ko: "ko" };

function NamesTable({ names }: { names: Names }) {
  const ui = useApp((s) => s.uiLang);
  return (
    <KV rows={nameOrder(ui).map((l) => [LANG_LABEL[l], names[l] ? <span lang={l === "rom" ? "en" : l === "kana" ? "ja" : l}>{names[l]}</span> : null])} />
  );
}

/** Every external link the entity has, in one list. */
function linksOf(detail: Detail | undefined): { key: string; url: string }[] {
  if (!detail) return [];
  const fandom = "externalIds" in detail && detail.externalIds?.fandom ? [{ key: "fandom", url: fandomUrl(detail.externalIds.fandom) }] : [];
  switch (detail.t) {
    case "release":
      return [
        ...Object.entries(detail.links).map(([key, url]) => ({ key, url })),
        ...detail.streaming.map((s) => ({ key: "youtube_music", url: s.url })),
      ];
    case "project":
      return Object.entries(detail.official).map(([key, url]) => ({ key, url }));
    case "work": {
      const main = detail.recordings.find((r) => r.mainLink && r.kind !== "off_vocal")?.mainLink;
      return [...(main ? [{ key: "youtube_music", url: main }] : []), ...fandom];
    }
    default:
      return fandom;
  }
}

export function OverviewTab({ node, detail }: { node: GNode; detail?: Detail }) {
  const t = useT();
  const model = useModel();
  const set = useApp((s) => s.set);
  const uiLang = useApp((s) => s.uiLang);
  const birthdays = useBirthdaysToday();
  const community = model.communities[node.m.cm];
  const links = linksOf(detail);
  const parts = detail && (detail.t === "person" || detail.t === "character") ? detail : null;

  return (
    <>
      <Section title={t.names}>
        <NamesTable names={node.n} />
        {parts && (parts.familyName || parts.givenName) && (
          <KV rows={[
            [t.familyName, parts.familyName && namePartText(parts.familyName, uiLang)],
            [t.givenName, parts.givenName && namePartText(parts.givenName, uiLang)],
          ]} />
        )}
        {detail?.t === "person" && detail.aliases.some((a) => a.kind !== "misprint") && (
          <KV rows={[[t.aliases, <Aliases list={detail.aliases} />]]} />
        )}
      </Section>

      <Section title={t.tabs.overview} hint={node.ext ? t.externalHint : undefined}>
        <KV rows={[
          [t.birthday, parts?.birthday ? (
            <span className="birthday">
              <span className="tabular">{formatBirthday(parts.birthday, uiLang)}</span>
              {node.bd && birthdays.has(node.bd) && <BirthdayBadge />}
            </span>
          ) : null],
          [t.firstSeen, node.d ? <span className="tabular">{node.d}</span> : <span className="muted">{t.undated}</span>],
          [t.statusLabel, node.st ? <Badge>{t.status[node.st] ?? node.st}</Badge> : null],
          [t.projects, node.t !== "project" && node.p.length ? (
            <span className="chips">{node.p.map((id) => <NodeLink key={id} k={`project:${id}`} />)}</span>
          ) : null],
          [t.degree, <span className="tabular">{node.m.deg.toLocaleString()}</span>],
          [t.wdegree, <span className="tabular">{node.m.wdeg.toLocaleString()}</span>],
          [t.community, community ? (
            <button type="button" className="text-btn" onClick={() => set({ colorBy: "community" })}>
              {t.communityN(community.id, community.size)}
            </button>
          ) : null],
        ]} />
      </Section>

      {links.length > 0 && (
        <Section title={t.links}>
          <ul className="link-list">
            {links.map((l, i) => (
              <li key={i}><ExtLink href={l.url}>{t.linkNames[l.key] ?? l.key}</ExtLink> <span className="muted">{shortUrl(l.url)}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {detail && "evidence" in detail && detail.evidence && Object.keys(detail.evidence).length > 0 && (
        <Section title={t.evidenceTitle}>
          <EvidenceList evidence={detail.evidence} />
        </Section>
      )}
    </>
  );
}
