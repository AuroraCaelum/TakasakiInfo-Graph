import { describe, expect, it } from "vitest";

import { GRAPH_FORMAT, type GraphFile } from "../shared/graph";
import { analyze } from "../scripts/lib/analyze";
import { buildGraph } from "../scripts/lib/build-graph";
import { personalizedPageRank, shortestPath, similarNodes } from "../src/lib/analysis";
import { fandomTab, fandomUrl } from "../src/lib/links";
import { buildSearchIndex, normalize, search } from "../src/lib/search";
import { fromQuery, toQuery } from "../src/lib/url";
import { computeVisible, type VisibilityInput } from "../src/lib/visibility";
import { buildModel } from "../src/model";
import { cloneFilters, type ViewState } from "../src/view";
import { fixture } from "./fixtures";

const built = buildGraph(fixture());
const a = analyze(built.nodes, built.edges, { iterations: 30 });
const file: GraphFile = {
  format: GRAPH_FORMAT,
  meta: { format: "1.0.0", dbLastUpdate: "", source: "", builtAt: "", counts: {}, dateRange: null },
  nodes: [...built.nodes.values()].map((n) => ({ ...n, ...a.positions.get(n.k)!, m: a.metrics.get(n.k)! })),
  edges: built.edges,
  communities: a.communities,
};
const model = buildModel(file);

const view = (over: Partial<VisibilityInput> = {}): VisibilityInput => ({ ...cloneFilters(), time: null, selected: null, focus: 0, ...over });

describe("visibility", () => {
  it("hides drama works unless asked, and nodes left without links", () => {
    const v = computeVisible(model, view());
    expect(v.nodes.has("work:alpha/d1")).toBe(false);
    expect(v.nodes.has("work:beta/unreleased")).toBe(true); // linked to its project
    expect(computeVisible(model, view({ drama: true })).nodes.has("work:alpha/d1")).toBe(true);
  });

  it("shows BGM works unless turned off", () => {
    expect(computeVisible(model, view()).nodes.has("work:alpha/bgm1")).toBe(true);
    expect(computeVisible(model, view({ bgm: false })).nodes.has("work:alpha/bgm1")).toBe(false);
  });

  it("at a date: only what exists by then, and the cast of that day", () => {
    const v = computeVisible(model, view({ time: "2022-12-31" }));
    expect(v.nodes.has("release:alpha/2022-r1")).toBe(true);
    expect(v.nodes.has("release:beta/2024-r2")).toBe(false);
    expect(v.nodes.has("person:cv-one")).toBe(true);
    expect(v.nodes.has("person:cv-two")).toBe(false);
    const later = computeVisible(model, view({ time: "2023-06-01" }));
    expect(later.nodes.has("person:cv-two")).toBe(true);
    expect(later.nodes.has("person:cv-one")).toBe(false); // her casting ended: no link left
  });

  it("keeps the selection visible and limits the focus view to its neighbourhood", () => {
    const sel = computeVisible(model, view({ selected: "work:alpha/d1" }));
    expect(sel.nodes.has("work:alpha/d1")).toBe(true);
    const focus = computeVisible(model, view({ selected: "person:writer", focus: 1 }));
    expect([...focus.nodes].sort()).toEqual(["person:writer", "work:alpha/w1", "work:alpha/w2"]);
    // depth 2 reaches the project hub but does not expand through it
    const deep = computeVisible(model, view({ selected: "person:writer", focus: 2 }));
    expect(deep.nodes.has("project:alpha")).toBe(true);
    expect(deep.nodes.has("artist:unit-b")).toBe(false);
  });

  it("filters by project (persons by the projects of their works)", () => {
    const v = computeVisible(model, view({ projects: ["beta"] }));
    expect(v.nodes.has("work:alpha/w1")).toBe(false);
    expect(v.nodes.has("release:beta/2024-r2")).toBe(true);
  });
});

describe("analysis", () => {
  it("personalized PageRank ranks direct neighbours first and sums to one", () => {
    const ppr = personalizedPageRank(model, "person:writer");
    expect(ppr.slice(0, 2).map((x) => x.k).sort()).toEqual(["work:alpha/w1", "work:alpha/w2"]);
    const total = ppr.reduce((s, x) => s + x.score, 0);
    expect(total).toBeGreaterThan(0.5);
    expect(total).toBeLessThan(1);
  });

  it("similar nodes share neighbours and are of the same type", () => {
    const sim = similarNodes(model, "person:writer");
    expect(sim[0].k).toBe("person:composer");
    expect(sim[0].shared.sort()).toEqual(["work:alpha/w1", "work:alpha/w2"]);
    expect(sim.every((s) => s.k.startsWith("person:"))).toBe(true);
  });

  it("finds the shortest visible path, through project hubs only when allowed", () => {
    const v = computeVisible(model, view());
    const p = shortestPath(model, v, "person:writer", "person:cv-one", false);
    expect(p?.nodes).toEqual(["person:writer", "work:alpha/w2", "character:alpha/c1", "person:cv-one"]);
    const noRel = computeVisible(model, view({ relations: { ...cloneFilters().relations, composer: false, performer: false, member: false, track: false, setlist: false, release_artist: false } }));
    expect(shortestPath(model, noRel, "person:writer", "person:cv-one", false)).toBeNull();
    expect(shortestPath(model, noRel, "person:writer", "person:cv-one", true)?.nodes).toContain("project:alpha");
  });
});

describe("links", () => {
  it("builds Fandom URLs the way fandom.py does", () => {
    expect(fandomUrl("Aqours First Love Live! ~Step! ZERO to ONE~"))
      .toBe("https://love-live.fandom.com/wiki/Aqours_First_Love_Live!_~Step!_ZERO_to_ONE~");
    expect(fandomUrl("Love Live! Days: A&B, C/D ♡")).toBe("https://love-live.fandom.com/wiki/Love_Live!_Days:_A&B,_C/D_%E2%99%A1");
  });

  it("points a show's tab at its section of the concert page", () => {
    expect(fandomTab("Beta Fes", "OCEAN STAGE|Day 1")).toEqual({
      url: "https://love-live.fandom.com/wiki/Beta_Fes#OCEAN_STAGE", label: "OCEAN STAGE › Day 1",
    });
    expect(fandomTab("Beta Fes", "|Day 2")).toEqual({ url: "https://love-live.fandom.com/wiki/Beta_Fes", label: "Day 2" });
  });
});

describe("search", () => {
  const index = buildSearchIndex(model.list);
  it("ignores kana script, width and spacing", () => {
    expect(normalize("ｻｸｼ タロウ")).toBe(normalize("さくし たろう"));
    expect(search(index, "作詞太郎")[0].k).toBe("person:writer"); // spacing and alias
    expect(search(index, "sakushi")[0].k).toBe("person:writer");
  });
  it("tolerates a typo in latin queries", () => {
    expect(search(index, "sakkyuku")[0]?.k).toBe("person:composer");
  });
});

describe("url", () => {
  const base: ViewState = {
    ...cloneFilters(), uiLang: "ko", nameLang: "ko", colorBy: "type", time: null, selected: null, focus: 0,
    pathOn: false, pathTo: null, pathHubs: false, tab: "overview",
  };
  const isNode = (k: string) => model.nodes.has(k);

  it("writes only what differs and reads it back", () => {
    const s: ViewState = {
      ...base, selected: "work:alpha/w1", tab: "related", focus: 2, colorBy: "community", projects: ["alpha"],
      drama: true, bgm: false, time: "2023-01-01", relations: { ...base.relations, project: false, co_credit: true },
      types: { ...base.types, venue: false },
    };
    const q = toQuery(s, base);
    expect(q).toContain("n=work:alpha/w1");
    expect(q).toContain("r=-project,co_credit");
    expect(q).toContain("bgm=0");
    expect(fromQuery(q, base, isNode)).toEqual(s);
    expect(toQuery(base, base)).toBe("");
  });

  it("ignores unknown nodes and malformed values; names follow an explicit ui", () => {
    const s = fromQuery("?n=work:nope&focus=9&at=yesterday&color=rainbow&ui=ja", base, isNode);
    expect(s.selected).toBeNull();
    expect(s.focus).toBe(0);
    expect(s.time).toBeNull();
    expect(s.colorBy).toBe("type");
    expect([s.uiLang, s.nameLang]).toEqual(["ja", "ja"]);
    expect(fromQuery("?ui=en&names=ko", base, isNode).nameLang).toBe("ko");
    expect(toQuery({ ...base, uiLang: "en", nameLang: "rom" }, base)).toBe("?ui=en");
    expect(toQuery({ ...base, uiLang: "en", nameLang: "ko" }, base)).toBe("?ui=en&names=ko");
  });
});
