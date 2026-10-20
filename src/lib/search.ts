/**
 * Search over every name of every node (ja, kana, rom, ko and person aliases).
 *
 * ~2,600 nodes is small enough to scan on every keystroke, which gives exact substring matches
 * in Japanese and Korean (no tokenizer needed) and ignores spacing, width and kana script:
 * `ゆうき`, `ユウキ` and `ﾕｳｷ` all match. Latin queries also tolerate a typo or two.
 */

import type { GNode } from "../../shared/graph";

const PUNCT = /[\s\u30fb\uff65\-\u2010-\u2015~\uff5e\u301c!?.,\u3001\u3002'\u2018\u2019"\u201c\u201d()[\]{}\u3010\u3011\u300c\u300d\u300e\u300f:/\u2605\u2606\u2661\u2665\u266a\u00d7*&+#@]/g;

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) // katakana → hiragana
    .replace(PUNCT, "");
}

export interface SearchIndex {
  entries: { node: GNode; texts: string[] }[];
}

export function buildSearchIndex(nodes: GNode[]): SearchIndex {
  return {
    entries: nodes.map((node) => {
      const raw = [node.n.ja, node.n.kana, node.n.rom, node.n.ko, ...(node.al ?? []), node.k.slice(node.k.indexOf(":") + 1)];
      const texts = [...new Set(raw.filter((x): x is string => !!x).map(normalize).filter(Boolean))];
      return { node, texts };
    }),
  };
}

/** Smallest edit distance between `q` and any substring of `s` (Sellers' algorithm). */
export function substringDistance(q: string, s: string): number {
  let prev = new Array<number>(s.length + 1).fill(0);
  for (let i = 1; i <= q.length; i++) {
    const cur = new Array<number>(s.length + 1);
    cur[0] = i;
    for (let j = 1; j <= s.length; j++) {
      const cost = q[i - 1] === s[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return Math.min(...prev);
}

export function search(index: SearchIndex, query: string, limit = 30): GNode[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { node: GNode; score: number }[] = [];
  for (const { node, texts } of index.entries) {
    let best = 0;
    for (const t of texts) {
      const i = t.indexOf(q);
      if (i < 0) continue;
      const cover = q.length / t.length;
      best = Math.max(best, t === q ? 100 : i === 0 ? 60 + 20 * cover : 30 + 20 * cover);
    }
    if (best) scored.push({ node, score: best + Math.log1p(node.m.wdeg) * 2 });
  }
  const latin = /^[a-z0-9]+$/.test(q);
  if (!scored.length && latin && q.length >= 4) {
    const allowed = q.length >= 7 ? 2 : 1;
    for (const { node, texts } of index.entries) {
      const d = Math.min(...texts.filter((t) => /[a-z]/.test(t)).map((t) => substringDistance(q, t)));
      if (d <= allowed) scored.push({ node, score: 20 - 5 * d + Math.log1p(node.m.wdeg) });
    }
  }
  return scored.sort((a, b) => b.score - a.score || a.node.k.localeCompare(b.node.k)).slice(0, limit).map((x) => x.node);
}
