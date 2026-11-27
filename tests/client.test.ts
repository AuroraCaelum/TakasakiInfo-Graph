import { describe, expect, it } from "vitest";

import { GRAPH_FORMAT, type GraphFile } from "../shared/graph";
import { analyze } from "../scripts/lib/analyze";
import { buildGraph } from "../scripts/lib/build-graph";
import { personalizedPageRank, shortestPath, similarNodes } from "../src/lib/analysis";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { FA2_DEFAULTS, fa2Settings } from "../shared/layout";
import { fitInto, layoutGraph } from "../src/lib/layouts";
import { audioPasses, audioSummary, formatDuration, keyText, parseBpm } from "../src/lib/audio";
import { birthdaysOn, formatBirthday, localDate } from "../src/lib/birthday";
import { buildDays } from "../scripts/lib/days";
import { countsByDay, eventsOn, finalConsonant, parseTemplate, particle, shiftDate } from "../src/lib/days";
import { fandomTab, fandomUrl } from "../src/lib/links";
import { namePartText, otherNames } from "../src/lib/names";
import { buildSearchIndex, normalize, search } from "../src/lib/search";
import { fromQuery, toQuery } from "../src/lib/url";
import { computeVisible, sameVisible, type VisibilityInput } from "../src/lib/visibility";
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

  it("tells the same picture from another one by content, not by identity", () => {
    expect(sameVisible(computeVisible(model, view()), computeVisible(model, view()))).toBe(true);
    expect(sameVisible(computeVisible(model, view()), computeVisible(model, view({ drama: true })))).toBe(false);
    // a selected node the filters leave out joins the picture
    expect(sameVisible(computeVisible(model, view()), computeVisible(model, view({ selected: "work:alpha/d1" })))).toBe(false);
  });
});

describe("mood and tempo", () => {
  it("writes length, key and tempo the way people read them", () => {
    expect(formatDuration(256)).toBe("4:16");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect([keyText("F#m"), keyText("Bb"), keyText("C"), keyText("Ebm")]).toEqual(["F♯m", "B♭", "C", "E♭m"]);
    expect(audioSummary({ dur: 256, key: "F#m", bpm: 150 })).toBe("4:16 · F♯m · 150 BPM");
    expect(audioSummary({ dur: 200 })).toBe("3:20");
    expect(audioSummary(undefined)).toBe("");
  });

  it("takes a BPM bound only as a whole number in range", () => {
    expect([parseBpm("140"), parseBpm(" 90 "), parseBpm("0"), parseBpm("401"), parseBpm("12.5"), parseBpm("")]).toEqual([140, 90, null, null, null, null]);
  });

  it("filters works by mood: any label within an axis, every axis chosen", () => {
    const w1 = model.nodes.get("work:alpha/w1")!; // upbeat, wistful, 150
    const pass = (moods: string[], bpm: [number | null, number | null] = [null, null]) => audioPasses(w1, { moods, bpm });
    expect(pass([])).toBe(true);
    expect(pass(["upbeat"])).toBe(true);
    expect(pass(["slow"])).toBe(false);
    expect(pass(["upbeat", "slow"])).toBe(true); // tempo: either
    expect(pass(["upbeat", "bright"])).toBe(false); // tempo and key: both
    expect(pass(["upbeat", "wistful"])).toBe(true);
    expect(pass([], [140, 160])).toBe(true);
    expect(pass([], [151, null])).toBe(false);
    expect(pass([], [null, 150])).toBe(true);
  });

  it("hides works without the values once the filter is on, and leaves other nodes and the selection alone", () => {
    const on = computeVisible(model, view({ moods: ["wistful"] }));
    expect(on.nodes.has("work:alpha/w1")).toBe(true);
    expect(on.nodes.has("work:alpha/w2")).toBe(false); // length only
    expect(on.nodes.has("work:alpha/bgm1")).toBe(false);
    expect(on.nodes.has("person:writer")).toBe(true);
    expect(computeVisible(model, view({ bpm: [100, null], selected: "work:alpha/w2" })).nodes.has("work:alpha/w2")).toBe(true);
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
  it("finds names made only of punctuation", () => {
    const marks = buildSearchIndex([
      { ...model.list[0], k: "work:x/q", n: { ja: "？？？", rom: "???" } },
      { ...model.list[0], k: "work:x/e", n: { ja: "！！！！" } },
    ]);
    expect(search(marks, "???").map((n) => n.k)).toEqual(["work:x/q"]);
    expect(search(marks, "？？").map((n) => n.k)).toEqual(["work:x/q"]);
    expect(search(marks, "!!!!")[0]?.k).toBe("work:x/e");
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
      types: { ...base.types, venue: false }, moods: ["upbeat", "wistful"], bpm: [120, null],
    };
    const q = toQuery(s, base);
    expect(q).toContain("n=work:alpha/w1");
    expect(q).toContain("r=-project,co_credit");
    expect(q).toContain("bgm=0");
    expect(q).toContain("mood=upbeat,wistful");
    expect(q).toContain("bpm=120-");
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
    const m = fromQuery("?mood=sad,slow&bpm=180-90", base, isNode);
    expect([m.moods, m.bpm]).toEqual([["slow"], [90, 180]]); // unknown labels dropped, bounds put in order
    expect(fromQuery("?bpm=fast", base, isNode).bpm).toEqual([null, null]);
    expect(fromQuery("?bpm=-0", base, isNode).bpm).toEqual([null, null]);
  });
});

describe("live layout", () => {
  const v = computeVisible(model, view());
  const at = (k: string) => model.nodes.get(k)!;

  it("lays out the visible nodes over their fact edges, weighted as the build does", () => {
    const withDerived = computeVisible(model, view({ relations: { ...cloneFilters().relations, co_credit: true } }));
    const g = layoutGraph(model, withDerived, at);
    expect(g.order).toBe(withDerived.nodes.size);
    g.forEachEdge((_e, attr, s, t) => {
      const facts = model.graph.edges(s, t).map((e) => model.graph.getEdgeAttributes(e)).filter((x) => !x.derived);
      expect(facts).toHaveLength(1); // derived edges are left out
      expect(attr.weight).toBeCloseTo(facts[0].facts.reduce((sum, f) => sum + (f.r === "project" ? 0.5 : 1 + Math.log2(f.w)), 0));
    });
    expect(g.hasNode("work:alpha/d1")).toBe(false); // hidden nodes stay out
  });

  it("turns every viewer option into a ForceAtlas2 setting graphology knows", () => {
    const flipped = fa2Settings(100, {
      linLog: true, dissuadeHubs: true, strongGravity: false, approximate: false,
      gravity: 2, scaling: 3, edgeWeightInfluence: 0,
    });
    expect(flipped).toMatchObject({
      linLogMode: true, outboundAttractionDistribution: true, strongGravityMode: false,
      barnesHutOptimize: false, gravity: 2, scalingRatio: 3, edgeWeightInfluence: 0,
    });
    // graphology accepts them, and the defaults stay the build's forces
    const g = layoutGraph(model, v, at);
    expect(() => forceAtlas2.assign(g, { iterations: 2, settings: flipped })).not.toThrow();
    expect(fa2Settings(100, FA2_DEFAULTS)).toEqual(fa2Settings(100));
    expect(fa2Settings(100)).toMatchObject({ gravity: 0.05, scalingRatio: 6, strongGravityMode: true, linLogMode: false });
  });

  it("fits a frame back where the nodes started: unchanged positions stay put", () => {
    const g = layoutGraph(model, v, at);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    g.forEachNode((_k, p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    const frame = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span: Math.max(x1 - x0, y1 - y0) };
    for (const [k, p] of fitInto(g, frame)) {
      expect(p.x).toBeCloseTo(at(k).x);
      expect(p.y).toBeCloseTo(at(k).y);
    }
    // a layout that spread out twice as far is scaled back into the same frame
    g.updateEachNodeAttributes((_k, p) => ({ ...p, x: p.x * 2 + 50, y: p.y * 2 - 20 }));
    for (const [k, p] of fitInto(g, frame)) {
      expect(p.x).toBeCloseTo(at(k).x);
      expect(p.y).toBeCloseTo(at(k).y);
    }
  });
});

describe("names", () => {
  const n = { ja: "佐伯 高志", kana: "さえき たかし", rom: "Takashi Saeki", ko: "사에키 타카시" };

  it("lists the other spellings Korean first on a Korean page, romanisation first otherwise, the kana last", () => {
    expect(otherNames(n, "rom", "ko").map((o) => o.lang)).toEqual(["ja", "ko", "kana"]);
    expect(otherNames(n, "ja", "ko").map((o) => o.lang)).toEqual(["ko", "rom", "kana"]);
    expect(otherNames(n, "ko", "en").map((o) => o.lang)).toEqual(["ja", "rom", "kana"]);
    expect(otherNames(n, "ja", "ja").map((o) => o.lang)).toEqual(["rom", "ko", "kana"]);
    expect(otherNames({ ja: "ゲスト", kana: "ゲスト", rom: "Guest" }, "rom", "en").map((o) => o.lang)).toEqual(["ja"]); // kana equal to ja once
  });

  it("writes a name part with the kana as the reading of ja", () => {
    expect(namePartText({ ja: "佐伯", kana: "さえき", rom: "Saeki", ko: "사에키" }, "ko")).toBe("佐伯 (さえき) / 사에키 / Saeki");
    expect(namePartText({ ja: "佐伯", kana: "さえき", rom: "Saeki", ko: "사에키" }, "ja")).toBe("佐伯 (さえき) / Saeki / 사에키");
    expect(namePartText({ ja: "ARR", kana: "ARR", rom: "ARR" }, "en")).toBe("ARR / ARR");
  });
});

describe("birthdays", () => {
  it("takes today's date in the browser's time zone", () => {
    expect(localDate(new Date(2026, 10, 11, 23, 59, 59))).toBe("2026-11-11");
    expect(localDate(new Date(2026, 10, 12, 0, 0, 0))).toBe("2026-11-12");
    expect(localDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("celebrates 02-29 on 02-28 in common years", () => {
    expect([...birthdaysOn("2026-08-01")]).toEqual(["08-01"]);
    expect([...birthdaysOn("2026-02-28")]).toEqual(["02-28", "02-29"]);
    expect([...birthdaysOn("2028-02-28")]).toEqual(["02-28"]);
    expect([...birthdaysOn("2028-02-29")]).toEqual(["02-29"]);
  });

  it("reads a birthday in the UI language, with the year only when there is one", () => {
    expect(formatBirthday("1997-05-02", "ko")).toBe("1997년 5월 2일");
    expect(formatBirthday("05-31", "ko")).toBe("5월 31일");
    expect(formatBirthday("05-31", "en")).toBe("May 31");
    expect(formatBirthday("02-29", "ja")).toBe("2月29日");
  });
});

describe("this day in Love Live!", () => {
  const { events } = buildDays(built);
  const all = { has: () => true };
  const sameName = () => false;

  it("finds the month and day in every year, birthdays first, with the years since", () => {
    const items = eventsOn("2026-05-01", "2026-05-01", events, model.nodes, all, sameName);
    expect(items.map((i) => [i.section, i.template, i.s.join(), i.years])).toEqual([
      ["concert", "concert", "concert:alpha/live", 5],
      ["work", "premiere", "work:alpha/w1,work:alpha/w2", 5],
      ["debut", "debutCharacter", "character:alpha/c1", 5],
      ["debut", "debutPerson", "person:composer,person:writer", 5],
      ["debut", "debutProject", "project:alpha", 5],
    ]);
    expect(eventsOn("2026-08-01", "2026-05-01", events, model.nodes, all, sameName).map((i) => [i.section, i.s[0]]))
      .toEqual([["birthday", "character:alpha/c2"]]);
  });

  it("marks what is still to come, and reads an online show apart", () => {
    const items = eventsOn("2025-03-08", "2025-03-01", events, model.nodes, all, sameName);
    expect(items.map((i) => [i.template, i.future, i.years])).toEqual([["concertOnline", true, 0]]);
  });

  it("drops the subjects the filters hide, and an event left with none", () => {
    const visible = { has: (k: string) => k !== "person:writer" && k !== "project:alpha" };
    const items = eventsOn("2026-05-01", "2026-05-01", events, model.nodes, visible, sameName);
    expect(items.filter((i) => i.section === "debut").map((i) => i.s)).toEqual([["character:alpha/c1"], ["person:composer"]]);
  });

  it("chooses Korean particles by the final sound, both forms when it can't tell", () => {
    expect(finalConsonant("러브 라이브!")).toBe(false);
    expect(finalConsonant("도쿄 돔")).toBe(true);
    expect(finalConsonant("Dream")).toBe(true);
    expect(finalConsonant("Sunshine!!")).toBe(false);
    expect(finalConsonant("Song")).toBe(true);
    expect(finalConsonant("17")).toBe(true);
    expect(finalConsonant("μ's")).toBe(false);
    expect(particle("무지개색☆뤼미에르", "이/가")).toBe("가");
    expect(particle("코즈에", "이/가")).toBe("가");
    expect(particle("호노카 외 3개", "이/가")).toBe("가");
    expect(particle("夢", "이/가")).toBe("이(가)");
    expect(particle("서울", "으로/로")).toBe("로");
    expect(particle("도쿄 돔", "으로/로")).toBe("으로");
  });

  it("splits a template into text, slots and particles", () => {
    expect(parseTemplate("{w}, {s}{이/가} 발매됐어요.")).toEqual([
      { kind: "slot", slot: "w" }, { kind: "text", text: ", " }, { kind: "slot", slot: "s" },
      { kind: "particle", pair: "이/가" }, { kind: "text", text: " 발매됐어요." },
    ]);
  });

  it("counts each day's items for the calendar, with the filters as they are", () => {
    const counts = countsByDay(events, model.nodes, all);
    expect(counts.get("05-01")).toBe(eventsOn("2026-05-01", "2026-05-01", events, model.nodes, all, sameName).length);
    expect(counts.get("08-01")).toBe(1); // a birthday
    expect(countsByDay(events, model.nodes, { has: (k: string) => k !== "character:alpha/c2" }).get("08-01")).toBeUndefined();
  });

  it("moves a date by days across months and years", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
  });
});
