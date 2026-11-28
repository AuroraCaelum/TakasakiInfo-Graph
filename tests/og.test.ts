import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ConcertDetail } from "../shared/graph";
import { SHAREABLE_KEY, SITE_URL, sharePath, shareRoot } from "../shared/share";
import { analyze } from "../scripts/lib/analyze";
import { buildGraph } from "../scripts/lib/build-graph";
import { birthdayText, cardDescription, cardIndex, cardTitle, nodeCard, tri } from "../scripts/lib/og-card";
import { shareUrl } from "../src/lib/url";
import { fixture } from "./fixtures";

const built = buildGraph(fixture());
const a = analyze(built.nodes, built.edges, { iterations: 30 });
const nodes = [...built.nodes.values()].map((n) => ({ ...n, ...a.positions.get(n.k)!, m: a.metrics.get(n.k)! }));
const concerts = Object.fromEntries([...built.details].filter(([, d]) => d.t === "concert")) as Record<string, ConcertDetail>;
const ix = cardIndex({ nodes, edges: built.edges }, concerts);
const card = (k: string) => nodeCard(ix.nodes.get(k)!, ix);

describe("share pages", () => {
  it("puts a node at a path of its key, and finds the way back to the map", () => {
    expect(sharePath("work:alpha/w1")).toBe("n/work/alpha/w1/");
    expect(shareRoot("work:alpha/w1")).toBe("../../../../");
    expect(shareRoot("city:tokyo")).toBe("../../../");
    for (const n of nodes) expect(n.k).toMatch(SHAREABLE_KEY);
    expect(SHAREABLE_KEY.test("work:a b")).toBe(false);
  });

  it("copies the share page with the rest of the view, wherever the map is served", () => {
    expect(shareUrl("https://example.test/?n=work:alpha/w1&tab=related&p=alpha,beta", "work:alpha/w1"))
      .toBe("https://example.test/n/work/alpha/w1/?tab=related&p=alpha,beta");
    expect(shareUrl("https://example.test/repo/?n=city:tokyo", "city:tokyo")).toBe("https://example.test/repo/n/city/tokyo/");
    expect(shareUrl("https://example.test/repo/index.html?n=city:tokyo#x", "city:tokyo")).toBe("https://example.test/repo/n/city/tokyo/");
    // a key that can't be a path keeps the map's own link
    expect(shareUrl("https://example.test/?n=work:odd%20key", "work:odd key")).toBe("https://example.test/?n=work:odd%20key");
  });

  it("gives the map and the API reference absolute preview URLs on the site", () => {
    for (const [file, url, image] of [["index.html", SITE_URL, "og/main.png"], ["api/index.html", `${SITE_URL}api/`, "og/api.png"]]) {
      const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(html).toContain(`<meta property="og:url" content="${url}" />`);
      expect(html).toContain(`<meta property="og:image" content="${SITE_URL}${image}" />`);
    }
  });
});

describe("share cards", () => {
  it("writes labels in Japanese, Korean and English, each once", () => {
    expect(tri((d) => d.types.work)).toBe("楽曲 · 곡 · Song");
    expect(tri(() => "CV")).toBe("CV");
    expect(birthdayText("08-01")).toBe("8月1日 · 8월 1일 · August 1");
  });

  it("names a song by every spelling, with its artist, date and counts", () => {
    const c = card("work:alpha/w1");
    expect(c.kind).toBe("楽曲 · 곡 · Song");
    expect(c.title).toBe(ix.nodes.get("work:alpha/w1")!.n.ja);
    expect(cardTitle(c).split(" / ").length).toBe(1 + c.alt.length);
    expect(c.facts.find((f) => f.icon === "artist")?.text).toBe("Unit A");
    expect(c.stats.map((s) => s.label)).toContain("公演 · 공연 · Concerts");
    expect(c.stats.every((s) => s.value > 0)).toBe(true);
    expect(cardDescription(c)).toMatch(/^楽曲 · 곡 · Song \| /);
  });

  it("dates a tour from its first show to its last, venues in stop order", () => {
    const c = card("concert:alpha/live");
    expect(c.facts.find((f) => f.icon === "calendar")?.text).toBe("2021-05-01 – 2021-06-01");
    expect(c.stats.find((s) => s.label.startsWith("公演日"))?.value).toBe(3);
    expect(c.stats.find((s) => s.label.startsWith("会場"))?.value).toBe(2);
  });

  it("gives a character its CV and birthday", () => {
    const c = card("character:alpha/c2");
    expect(c.facts.find((f) => f.icon === "person")?.text).toBe(`CV ${ix.nodes.get("person:actor")!.n.ja}`);
    expect(c.facts.find((f) => f.icon === "hat")?.text).toBe(birthdayText("08-01"));
  });
});
