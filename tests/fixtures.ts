import type * as V from "../shared/v1";

/** Builds the tracks view the way `build_v1.track_view` does, from a release's discs. */
function trackRows(releases: V.Release[], links: Record<string, string | undefined>): V.TrackRow[] {
  const rows: V.TrackRow[] = [];
  for (const r of releases) {
    const editions = r.editions?.length ? r.editions.map((e) => e.id) : [null];
    for (const ed of editions) {
      for (const disc of r.discs) {
        if (disc.editions && disc.editions !== "all" && ed && !disc.editions.includes(ed)) continue;
        disc.tracks.forEach((t, i) => {
          const [work, rec] = t.recording.split("#");
          const id = `${r.id}@${ed ?? "-"}/${disc.disc ?? 1}-${i + 1}`;
          const url = links[id] ?? null;
          rows.push({
            id, release: r.id, edition: ed, disc: disc.disc ?? 1, position: i + 1, no: t.no ?? null,
            status: r.status ?? "released", release_date: r.release_date ?? null, recording: t.recording, work,
            kind: rec === "off-vocal" ? "off_vocal" : rec === "drama" ? "drama" : "vocal", version: null,
            title: { ja: `${work} ${rec}` }, link: { youtube_music: url, source: url ? "own" : "none" }, note: null,
          });
        });
      }
    }
  }
  return rows;
}

export function fixture(): V.V1Dataset {
  const projects: V.Project[] = [
    { id: "alpha", names: { ja: "アルファ", rom: "Alpha", ko: "알파" } },
    { id: "beta", names: { ja: "ベータ", rom: "Beta", ko: "베타" } },
    { id: "external", names: { ja: "外部作品", rom: "External", ko: "외부 작품" } },
  ];
  const persons: V.Person[] = [
    {
      id: "writer", names: { ja: "作詞 太郎", rom: "Taro Sakushi", ko: "사쿠시 타로" },
      aliases: [{ text: "作詞太郎", kind: "variant" }, { text: "作詞大郎", kind: "misprint", note: "booklet" }],
    },
    { id: "composer", names: { ja: "作曲 花子", rom: "Hanako Sakkyoku", ko: "삿쿄쿠 하나코" } },
    { id: "arranger", names: { rom: "ARR", ja: "ARR", ko: "ARR" }, native_script: "latin" },
    { id: "cv-one", names: { ja: "声優 一", rom: "Ichi Seiyu" } },
    { id: "cv-two", names: { ja: "声優 二", rom: "Ni Seiyu" } },
    { id: "actor", names: { ja: "俳優 三", rom: "San Haiyu" } },
  ];
  const characters: V.Character[] = [
    { id: "alpha/c1", project: "alpha", names: { ja: "一", rom: "C1" }, casting: [{ person: "cv-one", until: "2023-03-31" }, { person: "cv-two", from: "2023-04-01" }] },
    { id: "alpha/c2", project: "alpha", names: { ja: "二", rom: "C2" }, casting: [{ person: "actor" }] },
    { id: "alpha/c3", project: "alpha", names: { ja: "三", rom: "C3" } },
    { id: "beta/c4", project: "beta", names: { ja: "四", rom: "C4" } },
    { id: "external/guest", project: "external", names: { ja: "ゲスト", rom: "Guest" } },
  ];
  const artists: V.Artist[] = [
    {
      id: "unit-a", kind: "unit", projects: ["alpha"], names: { rom: "Unit A" },
      lineups: [
        { from: "2022-04-01", until: "2023-03-31", members: ["alpha/c1", "alpha/c2"] },
        { from: "2023-04-01", members: ["alpha/c1", "alpha/c3"] },
      ],
    },
    { id: "unit-b", kind: "cross_unit", projects: ["alpha", "beta"], names: { rom: "Unit B" }, lineups: [{ members: ["alpha/c3", "beta/c4"] }] },
    { id: "unit-c", kind: "group", projects: ["beta"], names: { rom: "Unit C" } },
  ];
  const works: V.Work[] = [
    {
      id: "alpha/w1", project: "alpha", title: { ja: "曲一", rom: "Song One" },
      credits: { lyricist: [{ person: "writer" }], composer: [{ person: "composer", affiliation: "Studio", fullwidth: true }] },
      recordings: [
        { id: "original", performers: [{ artist: "unit-a" }], arranger: [{ person: "composer" }] },
        { id: "off-vocal", kind: "off_vocal", performers: [{ artist: "unit-a" }], arranger: [{ person: "composer" }], instrumental_of: "original" },
      ],
    },
    {
      id: "alpha/w2", project: "alpha", title: { ja: "曲二", rom: "Song Two" },
      credits: { lyricist: [{ person: "writer" }], composer: [{ character: "alpha/c1" }] },
      recordings: [
        { id: "original", performers: [{ character: "alpha/c3" }, { person: "actor", role: "alpha/c2" }], arranger: [{ person: "arranger" }] },
        {
          id: "alt", version: "Alt Ver.", performers: [{ character: "alpha/c3" }, { character: "external/guest", featured: true }],
          arranger: [{ person: "arranger" }], strings_arranger: [{ person: "arranger" }], credits_override: { composer: [{ person: "composer" }] },
        },
      ],
    },
    {
      id: "alpha/d1", kind: "drama", project: "alpha", title: { ja: "ドラマ" },
      recordings: [{ id: "drama", kind: "drama", performers: [{ character: "alpha/c1" }, { character: "alpha/c2" }] }],
    },
    { id: "beta/unreleased", project: "beta", title: { ja: "未発表" }, recordings: [{ id: "original" }] },
    { id: "alpha/bgm1", kind: "bgm", project: "alpha", title: { ja: "劇伴" }, credits: { composer: [{ person: "composer" }] }, recordings: [] },
    { id: "external/cover", project: "external", title: { ja: "カバー" }, recordings: [] },
  ];
  const releases: V.Release[] = [
    {
      id: "alpha/2022-r1", type: "single", title: { ja: "R1" }, projects: ["alpha"], release_date: "2022-06-01",
      artist_credit: [{ artist: "unit-a" }],
      editions: [{ id: "e1", label: { ja: "初回盤" } }, { id: "e2", label: { ja: "通常盤" } }],
      discs: [{ tracks: [{ no: 1, recording: "alpha/w1#original" }, { no: 2, recording: "alpha/w2#original" }, { no: 3, recording: "alpha/w1#off-vocal" }] }],
      streaming: [{ editions: ["e1"], browse_id: "MPREb_x" }],
    },
    {
      id: "beta/2024-r2", type: "compilation", title: { ja: "R2" }, projects: ["beta"], release_date: "2024-01-10",
      artist_credit: [{ artist: "unit-a", joint: true }, { artist: "unit-c", joint: true }],
      discs: [{ tracks: [{ recording: "alpha/w1#original" }, { recording: "alpha/d1#drama" }, { recording: "alpha/w2#alt" }] }],
    },
  ];
  const tracks = trackRows(releases, { "alpha/2022-r1@e1/1-1": "https://music.youtube.com/watch?v=a" });
  const recordings: V.RecordingRow[] = works.flatMap((w) => w.recordings.map((r) => ({
    id: `${w.id}#${r.id}`, work: w.id, main_link: w.id === "alpha/w1" && r.id === "original" ? "https://music.youtube.com/watch?v=a" : null,
  })));
  const cities: V.City[] = [
    { id: "tokyo", names: { rom: "Tokyo" }, evidence: { names: { status: "draft" } } },
    { id: "osaka", names: { rom: "Osaka" } },
  ];
  const venues: V.Venue[] = [
    { id: "hall-1", city: "tokyo", names: { ja: "ホール1" }, evidence: { names: { status: "official", source: "https://example.com" } } },
    { id: "hall-2", city: "osaka", names: { ja: "ホール2" } },
    { id: "hall-3", city: "osaka", names: { ja: "ホール3" }, external_ids: { fandom: "Hall Three" } },
  ];
  const concerts: V.Concert[] = [{
    id: "alpha/live", projects: ["alpha"], title: { ja: "ライブ" },
    stops: [
      {
        id: "1-tokyo", city: "tokyo", venue: "hall-1", performances: [
          { date: "2021-05-01", setlist: [{ work: "alpha/w1" }, { work: "alpha/w2" }, { type: "mc" }] },
          { date: "2021-05-02", setlist: [{ work: "alpha/w1" }, { work: "alpha/w1", label: "again" }] },
        ],
      },
      { id: "2-osaka", city: "osaka", venue: "hall-2", performances: [{ date: "2021-06-01", setlist: [{ work: "alpha/w2" }] }] },
    ],
  }, {
    // after everything above, so its appearances leave the dates the tests pin down alone
    id: "beta/fes", projects: ["alpha", "beta"], title: { ja: "フェス" }, external_ids: { fandom: "Beta Fes" },
    stops: [
      {
        id: "1-osaka", city: "osaka", venue: "hall-3", performances: [
          {
            date: "2025-03-01", label: "Noon", external_ids: { fandom: "Osaka|Day 1" }, setlist: [
              { work: "alpha/w1", version: "Short Ver.", performers: [{ artist: "unit-a" }, { character: "external/guest", featured: true }] },
              { work: "alpha/w2", recording: "alpha/w2#alt", performers: [{ character: "alpha/c3" }] },
              { work: "external/cover", performers: [{ artist: "unit-a", joint: true }, { artist: "unit-c", joint: true }] },
              { work: "alpha/bgm1" },
            ],
          },
          { date: "2025-03-01", label: "Evening", setlist: [{ work: "alpha/w1", performers: [{ artist: "unit-a" }] }] },
        ],
      },
      { id: "2-online", label: "STREAM", performances: [{ date: "2025-03-08", setlist: [{ work: "alpha/w2", performers: [{ character: "alpha/c3" }] }] }] },
    ],
  }];
  return {
    projects, persons, characters, artists, works, releases, cities, venues, concerts, tracks, recordings,
    format: { schemaVersion: "1.0.0", dbLastUpdate: "2026-10-19T00:00:00Z" },
    version: { sha: "abc" },
  };
}
