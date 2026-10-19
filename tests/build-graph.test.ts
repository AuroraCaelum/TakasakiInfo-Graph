import { describe, expect, it } from "vitest";

import type { GEdge, ReleaseDetail, WorkDetail } from "../shared/graph";
import { analyze } from "../scripts/lib/analyze";
import { buildGraph } from "../scripts/lib/build-graph";
import { mergePeriods } from "../scripts/lib/dates";
import { checkFormat } from "../scripts/lib/source";
import { fixture } from "./fixtures";

const built = buildGraph(fixture());
const edge = (r: string, s: string, t: string): GEdge | undefined =>
  built.edges.find((e) => e.r === r && e.s === s && e.t === t);
const edgesOf = (r: string) => built.edges.filter((e) => e.r === r);

describe("buildGraph: nodes", () => {
  it("makes one node per entity, keyed by type and id", () => {
    expect(built.warnings).toEqual([]);
    expect(built.nodes.size).toBe(2 + 6 + 4 + 2 + 4 + 2 + 1 + 2);
    expect(built.nodes.get("work:alpha/d1")).toMatchObject({ t: "work", s: "drama", p: ["alpha"] });
    expect(built.nodes.get("person:writer")?.al).toEqual(["作詞太郎"]);
  });

  it("gives persons and venues the projects of what they are linked to", () => {
    expect(built.nodes.get("person:actor")?.p).toEqual(["alpha"]);
    expect(built.nodes.get("person:cv-two")?.p).toEqual(["alpha"]);
    expect(built.nodes.get("venue:hall-2")?.p).toEqual(["alpha"]);
  });

  it("dates works by their first release or performance, and the rest by their first edge", () => {
    expect(built.nodes.get("work:alpha/w1")?.d).toBe("2021-05-01"); // performed before release
    expect(built.nodes.get("work:alpha/d1")?.d).toBe("2024-01-10");
    expect(built.nodes.get("work:beta/unreleased")?.d).toBeUndefined();
    expect(built.nodes.get("person:cv-two")?.d).toBe("2023-04-01");
    expect(built.nodes.get("project:alpha")?.d).toBe("2021-05-01");
  });

  it("dates nodes without dated links of their own by their earliest dated neighbour", () => {
    expect(built.nodes.get("person:cv-one")?.d).toBe("2021-05-01"); // casting without a start: her character's date
    expect(built.nodes.get("artist:unit-b")?.d).toBe("2022-06-01"); // undated lineup: member c3's first song
    expect(built.nodes.get("character:beta/c4")?.d).toBe("2022-06-01"); // no songs: her unit's date
  });

  it("dates an artist's membership in each project by that project's songs, releases and members", () => {
    // unit-a: lineup from 2022-04-01. unit-b (undated lineup): in alpha through c3, who first
    // sings on 2022-06-01; in beta through c4, who has no songs and appears with the unit
    expect(edge("project", "artist:unit-a", "project:alpha")?.d).toBe("2022-04-01");
    expect(edge("project", "artist:unit-b", "project:alpha")?.d).toBe("2022-06-01");
    expect(edge("project", "artist:unit-b", "project:beta")?.d).toBe("2022-06-01");
    expect(built.nodes.get("project:beta")?.d).toBe("2022-06-01"); // c4 with unit-b, before its 2024 release
  });
});

describe("buildGraph: fact edges", () => {
  it("links writers once per work, including credits_override and character credits (D27)", () => {
    expect(edge("lyricist", "person:writer", "work:alpha/w1")?.w).toBe(1);
    expect(edge("composer", "character:alpha/c1", "work:alpha/w2")).toBeDefined();
    expect(edge("composer", "person:composer", "work:alpha/w2")).toBeDefined();
  });

  it("counts arranger and performer recordings without Off Vocal", () => {
    expect(edge("arranger", "person:composer", "work:alpha/w1")?.w).toBe(1);
    expect(edge("arranger", "person:arranger", "work:alpha/w2")?.w).toBe(2);
    expect(edge("performer", "artist:unit-a", "work:alpha/w1")?.w).toBe(1);
    expect(edge("performer", "person:actor", "work:alpha/w2")).toBeDefined();
  });

  it("merges back-to-back lineup periods into one membership", () => {
    expect(edge("member", "character:alpha/c1", "artist:unit-a")?.pd).toEqual([["2022-04-01", null]]);
    expect(edge("member", "character:alpha/c2", "artist:unit-a")?.pd).toEqual([["2022-04-01", "2023-03-31"]]);
    expect(edge("member", "character:alpha/c3", "artist:unit-b")?.pd).toBeUndefined(); // undated = always
  });

  it("keeps casting periods on cv edges", () => {
    expect(edge("cv", "character:alpha/c1", "person:cv-one")?.pd).toEqual([[null, "2023-03-31"]]);
    expect(edge("cv", "character:alpha/c1", "person:cv-two")?.pd).toEqual([["2023-04-01", null]]);
  });

  it("weights track edges by distinct recordings across editions", () => {
    expect(edge("track", "work:alpha/w1", "release:alpha/2022-r1")?.w).toBe(2);
    expect(edge("track", "work:alpha/w1", "release:beta/2024-r2")).toMatchObject({ w: 1, d: "2024-01-10" });
  });

  it("weights setlist edges by performance days, a repeat on the same day once", () => {
    expect(edge("setlist", "work:alpha/w1", "concert:alpha/live")).toMatchObject({ w: 2, d: "2021-05-01" });
    expect(edge("setlist", "work:alpha/w2", "concert:alpha/live")?.w).toBe(2);
    expect(edge("venue", "concert:alpha/live", "venue:hall-1")?.w).toBe(2);
  });

  it("links the release artist credit and the own projects", () => {
    expect(edge("release_artist", "artist:unit-a", "release:alpha/2022-r1")).toBeDefined();
    expect(edge("project", "artist:unit-b", "project:beta")).toBeDefined();
    expect(edgesOf("project").some((e) => e.s.startsWith("person:"))).toBe(false);
  });
});

describe("buildGraph: derived edges", () => {
  it("co_credit counts works two persons share, with the works as evidence", () => {
    expect(edge("co_credit", "person:composer", "person:writer")).toMatchObject({ w: 2, via: ["work:alpha/w1", "work:alpha/w2"] });
    expect(edge("co_credit", "person:arranger", "person:composer")?.via).toEqual(["work:alpha/w2"]);
  });

  it("co_perform expands an artist to its lineup at the recording date and a role to its character", () => {
    // w1 (2021 performance, 2022-06 release): unit-a lineup 1 = c1, c2. d1 (drama): c1, c2.
    expect(edge("co_perform", "character:alpha/c1", "character:alpha/c2")).toMatchObject({ w: 2, via: ["work:alpha/d1", "work:alpha/w1"] });
    // w2: c3 and the actor singing as c2
    expect(edge("co_perform", "character:alpha/c2", "character:alpha/c3")?.via).toEqual(["work:alpha/w2"]);
    expect(edge("co_perform", "character:alpha/c1", "character:alpha/c3")).toBeUndefined();
  });

  it("shared_member counts characters two artists share", () => {
    expect(edge("shared_member", "artist:unit-a", "artist:unit-b")).toMatchObject({ w: 1, via: ["character:alpha/c3"] });
  });
});

describe("buildGraph: details", () => {
  it("groups editions with the same tracklist and links", () => {
    const r1 = built.details.get("release:alpha/2022-r1") as ReleaseDetail;
    expect(r1.tracklists.map((t) => t.editions)).toEqual([["e1"], ["e2"]]); // e1 has its own link on track 1
    expect(r1.streaming).toEqual([{ editions: ["e1"], url: "https://music.youtube.com/browse/MPREb_x" }]);
  });

  it("lists a work's releases and performances", () => {
    const w1 = built.details.get("work:alpha/w1") as WorkDetail;
    expect(w1.appearances.map((a) => a.release)).toEqual(["release:alpha/2022-r1", "release:beta/2024-r2"]);
    expect(w1.appearances[0].tracks.find((t) => t.rec === "off-vocal")?.editions).toEqual(["e1", "e2"]);
    expect(w1.performances.map((p) => p.date)).toEqual(["2021-05-01", "2021-05-02"]);
    expect(w1.recordings[0].mainLink).toBe("https://music.youtube.com/watch?v=a");
  });

  it("records who sang as a character (D29)", () => {
    const c2 = built.details.get("character:alpha/c2");
    expect(c2).toMatchObject({ playedBy: [{ person: "person:actor", works: ["work:alpha/w2"] }] });
  });
});

describe("buildGraph: robustness", () => {
  it("skips unknown references with a warning instead of failing", () => {
    const ds = fixture();
    ds.works[0].credits!.lyricist!.push({ person: "nobody" });
    const g = buildGraph(ds);
    expect(g.warnings).toEqual(["work alpha/w1: unknown reference person:nobody"]);
    expect(g.edges.some((e) => e.s === "person:nobody")).toBe(false);
  });

  it("rejects an unsupported v1 format", () => {
    expect(() => checkFormat("works", { schemaVersion: "2.0.0", dbLastUpdate: "", count: 0, data: [] })).toThrow(/not supported/);
    expect(() => checkFormat("works", { schemaVersion: "1.3.0", dbLastUpdate: "", count: 0, data: [] })).not.toThrow();
  });
});

describe("mergePeriods", () => {
  it("joins overlapping and adjacent periods and keeps gaps", () => {
    expect(mergePeriods([["2024-04-01", "2025-03-31"], ["2023-04-01", "2024-03-31"], ["2026-01-01", null]]))
      .toEqual([["2023-04-01", "2025-03-31"], ["2026-01-01", null]]);
    expect(mergePeriods([[null, "2020-01-01"], ["2019-01-01", "2021-01-01"]])).toEqual([[null, "2021-01-01"]]);
  });
});

describe("analyze", () => {
  it("is deterministic and leaves project membership out of the metrics", () => {
    const a = analyze(built.nodes, built.edges, { iterations: 50 });
    const b = analyze(built.nodes, built.edges, { iterations: 50 });
    expect([...a.positions]).toEqual([...b.positions]);
    expect(a.metrics.get("project:alpha")?.deg).toBe(0);
    expect(a.metrics.get("work:alpha/w1")!.deg).toBeGreaterThan(0);
    expect(a.communities.reduce((s, c) => s + c.size, 0)).toBe(built.nodes.size);
  });
});
