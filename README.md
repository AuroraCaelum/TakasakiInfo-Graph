<div align="center">

# TakasakiInfo Graph

**Every song, person, release and concert of the Love Live! series<br>as one interactive map, in Japanese, Korean and English.**

[![Open the map](https://img.shields.io/badge/open%20the%20map-takasakiinfo.auroracaelum.com-e4007f?style=flat-square)](https://takasakiinfo.auroracaelum.com/)
[![API reference](https://img.shields.io/badge/API%20reference-Swagger%20UI-5d9cec?style=flat-square)](https://takasakiinfo.auroracaelum.com/api/)
[![Data](https://img.shields.io/badge/data-TakasakiInfo-555?style=flat-square)](https://github.com/AuroraCaelum/TakasakiInfo)
[![Deploy](https://img.shields.io/github/actions/workflow/status/AuroraCaelum/TakasakiInfo-Graph/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/AuroraCaelum/TakasakiInfo-Graph/actions/workflows/deploy.yml)
[![Hits](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph.svg?style=flat-square&label=hits&color=79c83d)](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph/)

**English** · [한국어](README.ko.md) · [日本語](README.ja.md)

<a href="https://takasakiinfo.auroracaelum.com/"><img src="https://takasakiinfo.auroracaelum.com/og/main.png" alt="TakasakiInfo Graph: the whole map, each project in its color" width="720"></a>

</div>

> [!NOTE]
> The data is the [TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo) database. The site checks it every day and rebuilds when it has changed, so the map is never more than a day behind.

> [!IMPORTANT]
> The database is still being filled in, and the map shows its gaps as they are:
> - The group artists of Aqours, Liella! and Nijigasaki have no lineups yet, so their member links, and the co-singing that comes from group songs, are missing.
> - Length, key and tempo are known for about 580 songs. Original soundtrack cues have a length only, and no song has a time signature yet.
> - Concerts whose setlists name no singers (5 so far) have no performer links.

## About

- Every entity of the database is a node: projects, artists, characters, people, songs, releases, concerts, venues and cities, about 3,800 in all. Every relation is a link: credits, singing, lineups, casting, tracks, setlists and venues, about 22,000.
- The layout is computed when the site is built, so the same map opens at once on every visit.
- Pick a node to read everything the database knows about it, with sources: names in every language, credits, recordings, editions, setlists, and how central it is.
- It is a static site on GitHub Pages; the data comes from the TakasakiInfo CDN.

## Features

### Explore

- **Map**: drawn with WebGL. Color nodes by type, project or community (Louvain).
- **Node panel**: four tabs.
  - **Overview**: the song's video, its names in every script, aliases, birthday, first appearance, length, key, tempo and mood, projects, links (official, YouTube Music, Fandom), and the evidence for each value.
  - **Data**: what the type has. Songs: credits, recordings, releases and every show they were sung at. Releases: editions and track lists. Concerts: cast, setlists by day, live recordings. Cities: venues and concerts.
  - **Links**: every relation in the data, with its strength, period and evidence.
  - **Relatedness**: centrality (degree, strength, PageRank, betweenness), indirect relatedness (personalized PageRank), similar nodes (Jaccard, Adamic–Adar) and community.
- **Search** (`/`): Japanese, kana, romaji, Korean and aliases. Partial matches; katakana and hiragana, full and half width and spaces don't matter; a typo or two in romaji is forgiven.
- **Filters**: projects, node types (drama tracks are off at first and original soundtrack cues can be turned off), song mood and BPM, link types, derived links, unlinked nodes.
- **Focus**: keep only the neighbours of a node, 1 to 3 steps out, and lay them out again. Or double-click the node.
- **Path**: the shortest path between two nodes over the links on screen, stronger links first, around the project hubs.
- **Timeline**: only the songs and releases out by a date, with that day's lineups and casting. It can play.

### Listen and look back

- **Shuffle**: plays songs that have a YouTube recording, one after another, from what the filters let through. It keeps playing with the panel closed.
- **On this day in Love Live!**: what happened on today's month and day, in sentences: birthdays, concerts, releases, first appearances, castings and lineup changes, with the anniversary. Pick any day from the calendar.
- **Birthdays**: people and characters whose birthday is today wear a small party hat on the map.

### Share

- **Links**: the node, tab, filters and date are in the URL ([parameters](#url-parameters)).
- **Link previews**: a link pasted into KakaoTalk, Discord, X or Slack shows a card of the node: its type, its names, a few facts, and where it is on the map.

<details>
<summary>How the previews work</summary>

<br>

Preview crawlers don't run JavaScript, and GitHub Pages sends the same `index.html` for every `?n=` link. So the build writes a share page for every node at `/n/<type>/<id>/`, with the node's Open Graph tags and a 1200×630 card (`og.png`), and the page sends people on to the map with the rest of its query. **Copy link** copies that page.

- **Node cards**: on the right, the whole map in faint gray, moved so the node always sits in the same place, with its own links and neighbours in their type colors. On the left, the type, the Japanese name large with the Korean and romanized names under it, facts (a song's artist, date, length/key/BPM; a tour's dates and venues; a character's CV, units and birthday), and the projects. Every label is in Japanese · Korean · English. Counts go into the preview text.
- **The map** (`/`) and **the API reference** (`/api/`) have cards of their own: the whole map with each project in its color, and the most central node of each type with its links.
- Path links preview as their start node.
- The image URL carries a hash of the card (`og.png?v=…`), so services that cache by URL pick up a changed card. KakaoTalk keeps its own cache; clear it with the [Kakao sharing debugger](https://developers.kakao.com/tool/debugger/sharing).

</details>

### And

- **Phones**: a layout of its own under 820 px wide: the map takes the screen until a node is picked, then shares it with the node's panel.
- **Languages and themes**: the interface in Korean, English or Japanese; names in Japanese, romaji or Korean, chosen apart. Light and dark.
- **Report a mistake**: the button at the bottom of a node's panel opens a new issue on [TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo/issues) with the node, the tab and the data version filled in.
- **API reference** ([`/api/`](https://takasakiinfo.auroracaelum.com/api/)): Swagger UI over the TakasakiInfo API, read from the API's own `openapi.json` on every visit. **Try it out** calls the API from the page.

<a id="url-parameters"></a>

<details>
<summary><b>URL parameters</b></summary>

<br>

| Parameter | Meaning | Example |
| :-- | :-- | :-- |
| `n` | the selected node | `n=work:nijigasaki/dive` |
| `tab` | the panel tab (`data`, `neighbors`, `related`) | `tab=related` |
| `focus` | focus depth, 1 to 3 | `focus=2` |
| `path`, `hubs` | path target, and whether it may go through hubs | `path=character:liella/kanon-shibuya` |
| `ui`, `names` | interface language (`ko`, `en`, `ja`), names (`ja`, `rom`, `ko`) | `ui=ja` |
| `color` | color by (`project`, `community`) | `color=community` |
| `p` | projects shown | `p=nijigasaki,aqours` |
| `t`, `r` | node and link types changed from the defaults (`-` turns off) | `r=-project,co_credit` |
| `drama`, `bgm`, `isolated` | drama tracks on, soundtrack cues off, unlinked nodes shown | `drama=1`, `bgm=0` |
| `mood` | song mood (`upbeat`, `slow`, `bright`, `wistful`) | `mood=upbeat,bright` |
| `bpm` | song tempo range (either end may be left open) | `bpm=120-160`, `bpm=140-` |
| `at` | timeline date | `at=2023-04-01` |

</details>

## Graph model

Nodes are projects, artists, characters, people, songs (works), releases, concerts, venues and cities. Recordings are folded into their song; editions and tracks are in the node panel. The model follows §10.7 of the TakasakiInfo design notes; `D` numbers below are its decisions.

<details>
<summary><b>Links</b>: fact links and derived links</summary>

<br>

**Fact links** come only from the relations in the data.

| Relation | Direction | Strength (w) |
| :-- | :-- | :-- |
| Lyrics · Music | person, character (D27) → song | 1 (`credits_override` included) |
| Arrangement · Strings · Brass · Vocals | person, character, artist → song | recordings (off vocal and instrumental left out, at least 1) |
| Member | character → artist | 1, with the lineup periods (joined where they meet) |
| CV | character → person | 1, with the casting period |
| Track | song → release | recordings on the release (editions added up) |
| Release artist | artist, character, person → release | 1 (`artist_credit`) |
| Setlist | song → concert | days it was performed |
| Performer | artist, character, person → concert | days they sang on the setlist (guests and joint credits included) |
| Venue | concert → venue | days performed there |
| City | venue → city | 1 |
| Project | node → project | 1 (none for works outside the series) |

**Derived links** are worked out by rule, drawn curved and in another color, and keep the nodes they came from (`via`).

| Relation | Rule | Strength |
| :-- | :-- | :-- |
| Co-credit | people credited together on a song for lyrics, music or arrangement | songs |
| Co-singing | characters who sang a song together; an artist counts as its lineup on the recording's first release, a person singing in role (D29) as the character | songs |
| Shared member | artists whose lineups share a character | characters |

</details>

<details>
<summary><b>Nodes</b>: soundtrack cues, works outside the series, dates and metrics</summary>

<br>

- **Original soundtrack cues** (`kind: bgm`, D50) are songs with an icon of their own and a filter of their own. The database has no recordings of them, so they link only through their composer and setlists.
- **Works outside the series** (`project: external`: THE IDOLM@STER songs at the crossover festival, covers, characters of other franchises such as Hatsune Miku) have no project hub. They are marked as such and take the projects of the concerts, releases and songs they are linked to.
- Online-only shows have no city or venue (D47).
- A concert's cast (`cast`, D52) and where a live recording was made (`live`, D54) are shown in the panel, not as links: performer links count only those who sang on the setlist.
- **Dates** (for the timeline): a song's is its first release or first performance, whichever is earlier; a release's its release date; a concert's its first show. The other nodes take the date of their first fact link, or else the earliest dated neighbour's. An artist's link to each of its projects is dated by its first song, release, concert or member there.
- **Metrics**: PageRank, betweenness, degree and Louvain communities, on the graph without project links and derived links (everything is two steps apart through a project hub). Relatedness, similar nodes and paths in the browser use the same graph.

</details>

## Colors and accessibility

- **Node types** take a validated categorical palette, light and dark. On a node-link map any two nodes may sit side by side, and only three colors stay distinct for every reader there, so the three most common types (songs, people, releases: about 90% of nodes) have them.
- So color is never the only cue: every node carries its type's icon (soundtrack cues one of their own), tooltips and panels name the type, and hovering the legend picks out a type.
- Eight categorical colors, violet kept for derived links: cities, the ninth type, are neutral gray and told apart by their icon.
- **Projects** take their official colors, those of the "Official SNS" labels on [lovelive-anime.jp](https://www.lovelive-anime.jp/) (`src/theme.ts`); the dark theme lightens the few below 3:1 on its background. Colors are tied to ids, so filtering never repaints.
- **A-RISE, Saint Snow and Sunny Passion** keep their own official colors inside their projects: the group, its members, and the songs and releases credited to them alone (`COLOR_GROUPS` in `shared/graph.ts`, `g` on the node). The legend lists each under its project.
- **The Love Live! Series** project and everything else (several projects, none, a project without a color) share one color. The series' own pink (#E4007F) can't be told from μ's (#E50080), so it is greyed toward rose (#B06680).

## Development

Node.js 22 or later.

```sh
npm ci
npm run data          # the v1 files from the CDN into public/data/ (about 40 s)
npm run dev           # http://localhost:5173
npm test              # unit tests of the builders and the client logic
npm run og            # share pages and cards from public/data/ (all of them: about 3 min on 8 cores)
npm run build         # data + og + typecheck + the bundle in dist/
```

To build from a v1 you made yourself, point at the output of `takasaki dist`:

```sh
npm run data -- --src ../TakasakiInfo/dist/v1
# or: TAKASAKI_V1=../TakasakiInfo/dist/v1 npm run build
```

`public/data/`, `public/n/`, `public/og/` and `.cache/` are generated and not committed.

<details>
<summary><b>Data flow</b></summary>

<br>

```
TakasakiInfo CDN /data/v1/*.json ──(npm run data)──▶ public/data/
  projects, persons, characters, artists,              graph.json           nodes, links, layout, metrics, communities
  works, releases, cities, venues, concerts,           detail/<type>.json   what the node panel shows (loaded when needed)
  tracks, recordings (views)                           days.json            events by day (On this day)
                                                       meta.json            data version
public/data/ ──(npm run og)──▶ public/n/<type>/<id>/index.html, og.png      share pages and cards
                               public/og/main.png, api.png                  the map's and the API reference's cards
```

- The input is v1 format `1.x`; another major version fails the build.
- A broken reference (an id that doesn't exist) is a warning and its link is skipped; `--strict` makes warnings fail.
- Link rules such as main-URL fallback (D2) are taken as they are from v1's `tracks.json` and `recordings.json`.

</details>

<details>
<summary><b>Link preview cards</b>: fonts, cache, size</summary>

<br>

- satori lays the cards out and resvg draws them. Pretendard JP covers Japanese, Korean and Latin; Noto Sans SC, Noto Sans Symbols 2 and Noto Emoji fill in the rest (simplified Chinese venue names, emoji, half-width kana). The fonts are downloaded into `.cache/fonts/` on the first run, pinned by hash; a character no font has is reported.
- Cards are kept in `.cache/og/` by a hash of their content, so a rebuild draws only the cards that changed, on a worker per core (`scripts/lib/og-worker.ts`). The map is behind every node card, so a data update that moves the layout redraws them all. The deploy workflow keeps `.cache` across runs; the files in `public/` are hard links into it.
- The map's dots make lossless cards large, so they are 128-color PNGs: about 60 KB each, about 230 MB in all.
- The site's address (`https://takasakiinfo.auroracaelum.com/`) is in `SITE_URL` in `shared/share.ts` and in the Open Graph tags of `index.html` and `api/index.html`. Preview URLs must be absolute, so change the three together; a test checks that they agree.

</details>

<details>
<summary><b>Stack</b></summary>

<br>

| | |
| :-- | :-- |
| Build | Vite 7, TypeScript 5.9 |
| Interface | React 19, zustand |
| Map | Sigma.js 3 (WebGL), @sigma/node-image (type icons), @sigma/edge-curve (derived links) |
| Graph | graphology, ForceAtlas2, graphology-metrics, Louvain (at build time) |
| Preview cards | satori, resvg |
| Tests | Vitest |

</details>

## Deployment

The site is deployed to GitHub Pages by `.github/workflows/deploy.yml` (Settings → Pages → Source: **GitHub Actions**): tests, data, cards, bundle, deploy.

- A push to `main` always deploys.
- Every day at 06:17 KST the workflow compares the CDN's `version.json` with the live site's `data/meta.json`, and rebuilds only when the data has changed.
- TakasakiInfo can trigger a run right after its own deploy, with a token that has `contents: write` on this repository:

  ```sh
  gh api repos/<owner>/<this-repo>/dispatches -f event_type=takasaki-data-updated
  ```

Assets and data are loaded by relative paths (`base: "./"`), so the site works under any subpath.

## Feedback

A wrong or missing value in the data: the **Report a mistake** button on the node, or an [issue on TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo/issues). Something wrong with the map itself: an [issue here](https://github.com/AuroraCaelum/TakasakiInfo-Graph/issues).

## Disclaimer

All rights to the material, including songs and lyrics, belong to

> ©2013 PROJECT Lovelive!<br>
> ©2017 PROJECT Lovelive! Sunshine!!<br>
> ©PROJECT YOHANE<br>
> ©2022 PROJECT Lovelive! Nijigasaki High School Idol Club<br>
> ©PROJECT Lovelive! Nijiyon Animation 2<br>
> ©2024 PROJECT Lovelive! Superstar!!<br>
> ©2026 PROJECT Lovelive! Hasunosora Jogakuin School Idol Club<br>
> ©PROJECT Lovelive! School Idol Musical<br>
> ©PROJECT IKIZULIVE!

and their rights holders SUNRISE, Bandai Namco Filmworks Inc., Lantis, and Bushiroad.
