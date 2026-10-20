/** External pages built from the data's ids. */

const FANDOM = "https://love-live.fandom.com/wiki/";

/**
 * A Love Live! Fandom page (`external_ids.fandom` holds the page title), encoded the way
 * TakasakiInfo's `fandom.py` does: spaces as underscores, `:/,&` left as they are. `section`
 * adds the anchor of a heading on the page.
 */
export function fandomUrl(title: string, section?: string): string {
  const path = encodeURIComponent(title.replace(/ /g, "_"))
    .replace(/%3A/g, ":").replace(/%2F/g, "/").replace(/%2C/g, ",").replace(/%26/g, "&");
  return `${FANDOM}${path}${section ? `#${encodeURIComponent(section.replace(/ /g, "_"))}` : ""}`;
}

/** A show's Fandom set-list tab, `<section>|<tab>` (D47), as a link into the concert's page. */
export function fandomTab(page: string, tab: string): { url: string; label: string } {
  const [section, name] = tab.includes("|") ? [tab.slice(0, tab.indexOf("|")), tab.slice(tab.indexOf("|") + 1)] : ["", tab];
  return { url: fandomUrl(page, section || undefined), label: [section, name].filter(Boolean).join(" › ") };
}
