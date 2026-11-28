/**
 * Share pages: one static page per node, so a link pasted into a chat or a post shows that node.
 *
 * Link previews (KakaoTalk, Discord, X, Slack…) read Open Graph tags from the HTML they fetch and
 * never run scripts, while the map keeps the node in the query (`?n=work:aqours/aozora-jumping-heart`),
 * which GitHub Pages answers with the same index.html for every node. So `npm run og` writes
 * `n/<type>/<id>/index.html` with the node's tags and card image (`og.png`), and the page sends
 * visitors on to the map with the node selected, passing its own query along.
 */

/** The site's public address: Open Graph URLs must be absolute. */
export const SITE_URL = "https://takasakiinfo.auroracaelum.com/";

/** Node keys that can be a path as they are (every key in the data so far). */
export const SHAREABLE_KEY = /^[a-z]+:[a-z0-9._-]+(\/[a-z0-9._-]+)*$/;

/** The share page of a node, relative to the site root: `work:aqours/aozora-jumping-heart` → `n/work/aqours/aozora-jumping-heart/`. */
export function sharePath(key: string): string {
  return `n/${key.replace(":", "/")}/`;
}

/** From the share page back to the site root: `../` for every directory in its path. */
export function shareRoot(key: string): string {
  return "../".repeat(sharePath(key).split("/").filter(Boolean).length);
}
