<div align="center">

# TakasakiInfo Graph

**러브 라이브! 시리즈의 곡, 인물, 발매물, 공연을 하나로 잇는<br>일본어·한국어·영어 인터랙티브 관계 지도**

[![지도 열기](https://img.shields.io/badge/%EC%A7%80%EB%8F%84%20%EC%97%B4%EA%B8%B0-takasakiinfo.auroracaelum.com-e4007f?style=flat-square)](https://takasakiinfo.auroracaelum.com/)
[![API 문서](https://img.shields.io/badge/API%20%EB%AC%B8%EC%84%9C-Swagger%20UI-5d9cec?style=flat-square)](https://takasakiinfo.auroracaelum.com/api/)
[![데이터](https://img.shields.io/badge/%EB%8D%B0%EC%9D%B4%ED%84%B0-TakasakiInfo-555?style=flat-square)](https://github.com/AuroraCaelum/TakasakiInfo)
[![배포](https://img.shields.io/github/actions/workflow/status/AuroraCaelum/TakasakiInfo-Graph/deploy.yml?branch=main&style=flat-square&label=%EB%B0%B0%ED%8F%AC)](https://github.com/AuroraCaelum/TakasakiInfo-Graph/actions/workflows/deploy.yml)
[![Hits](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph.svg?style=flat-square&label=hits&color=79c83d)](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph/)

[English](README.md) · **한국어** · [日本語](README.ja.md)

<a href="https://takasakiinfo.auroracaelum.com/"><img src="https://takasakiinfo.auroracaelum.com/og/main.png" alt="TakasakiInfo Graph: 프로젝트별 색으로 칠한 전체 지도" width="720"></a>

</div>

> [!NOTE]
> 데이터는 [TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo) 데이터베이스입니다. 사이트가 매일 데이터를 확인해 바뀌었으면 다시 빌드하므로, 지도는 하루 이상 늦지 않습니다.

> [!IMPORTANT]
> 데이터베이스가 아직 채워지는 중이라, 빈 곳이 지도에 그대로 드러납니다.
> - Aqours·Liella!·니지가사키 그룹 아티스트에는 라인업이 아직 없어서, 그 그룹의 멤버 연결과 그룹 곡에서 나오는 공동 가창이 없습니다.
> - 길이·키·BPM은 곡 약 580곡에만 있습니다. BGM은 길이만 있고, 박자는 아직 어느 곡에도 없습니다.
> - 세트리스트에 가창자가 적혀 있지 않은 공연(현재 5개)은 출연 연결이 없습니다.

## 소개

- 데이터베이스의 모든 엔티티(프로젝트, 아티스트, 캐릭터, 인물, 곡, 발매물, 공연, 회장, 도시, 약 3,800개)를 노드로, 모든 관계(크레딧, 가창, 라인업, 캐스팅, 수록, 세트리스트, 회장, 약 22,000개)를 연결로 그립니다.
- 레이아웃은 사이트를 빌드할 때 미리 계산해 두므로, 들어올 때마다 같은 지도가 바로 뜹니다.
- 노드를 고르면 데이터베이스가 그 노드에 대해 아는 모든 것을 근거와 함께 보여줍니다. 모든 언어의 표기, 크레딧, 음원, 에디션, 세트리스트, 중심성 등입니다.
- GitHub Pages의 정적 사이트이고, 데이터는 TakasakiInfo CDN에서 받습니다.

## 기능

### 둘러보기

- **지도**: WebGL로 그립니다. 노드 색 기준은 종류, 프로젝트, 커뮤니티(Louvain) 중에서 고릅니다.
- **노드 패널**: 탭 네 개가 있습니다.
  - **개요**: 곡의 영상, 모든 표기, 별칭, 생일, 첫 등장일, 길이·키·BPM·분위기, 프로젝트, 링크(공식·YouTube Music·Fandom), 값마다의 근거
  - **데이터**: 종류별 상세. 곡은 크레딧·음원·수록 발매물·공연 이력, 발매물은 에디션·트랙 목록, 공연은 출연진·날짜별 세트리스트·라이브 음원, 도시는 회장과 공연
  - **연관 노드**: 데이터의 모든 연결을 관계별로, 강도·기간·근거와 함께
  - **연관도**: 중심성(연결 수·연결 강도·PageRank·매개 중심성), 간접 연관(개인화 PageRank), 유사 노드(Jaccard·Adamic-Adar), 커뮤니티
- **검색** (`/`): 일본어·가나·로마자·한국어·별칭으로 찾습니다. 부분 일치이고, 가타카나/히라가나·전각/반각·띄어쓰기를 구분하지 않으며, 로마자 오타도 한두 글자까지 허용합니다.
- **필터**: 프로젝트, 노드 종류(드라마 트랙은 기본 숨김, BGM은 따로 끌 수 있음), 곡 분위기·BPM, 연결 종류, 파생 연결, 연결 없는 노드
- **중심 보기**: 선택한 노드의 깊이 1~3 이웃만 남기고 다시 배치합니다. 노드를 더블클릭해도 됩니다.
- **경로 찾기**: 두 노드 사이의 최단 경로입니다. 화면에 보이는 연결만 따라가고, 강한 연결을 우선하며, 프로젝트 허브는 거치지 않습니다.
- **기간 슬라이더**: 고른 날짜까지 나온 곡·발매물과 그날의 라인업·캐스팅만 보여줍니다. 재생도 됩니다.

### 듣기와 돌아보기

- **랜덤 재생**: YouTube 음원이 있는 곡을 필터에 맞는 것 중에서 섞어 이어 재생합니다. 패널을 닫아도 계속 재생됩니다.
- **이날의 러브 라이브!**: 오늘과 같은 월·일에 있었던 생일, 공연, 발매, 첫 등장, 캐스팅·라인업 변화를 몇 주년인지와 함께 문장으로 보여줍니다. 달력에서 아무 날이나 고를 수 있습니다.
- **생일**: 오늘이 생일인 인물·캐릭터는 지도에서 작은 고깔모자를 씁니다.

### 공유

- **링크**: 선택한 노드, 탭, 필터, 날짜가 URL에 담깁니다([매개변수](#url-parameters)).
- **링크 미리보기**: 카카오톡·디스코드·X·슬랙에 링크를 붙이면 그 노드의 카드가 뜹니다. 종류, 이름, 주요 정보, 지도에서의 위치를 보여줍니다.

<details>
<summary>미리보기가 동작하는 방식</summary>

<br>

미리보기 크롤러는 JS를 실행하지 않고, GitHub Pages는 `?n=` 링크마다 같은 `index.html`을 내보냅니다. 그래서 빌드할 때 노드마다 공유 페이지 `/n/<종류>/<id>/`를 만듭니다. 이 페이지에는 그 노드의 OG 태그와 1200×630 카드(`og.png`)가 있고, 사람이 열면 나머지 쿼리를 그대로 붙여 지도로 넘어갑니다. `링크 복사`는 이 페이지 주소를 복사합니다.

- **노드 카드**: 오른쪽에는 전체 지도를 옅은 회색으로 깔고, 그 노드가 늘 같은 자리에 오도록 옮겨 그 노드의 연결과 이웃만 종류 색으로 그립니다. 왼쪽에는 종류, 크게 쓴 일본어 이름과 그 아래 한국어·로마자 표기, 주요 정보(곡은 아티스트·날짜·길이/키/BPM, 공연은 기간·회장, 캐릭터는 CV·유닛·생일 등), 프로젝트가 있습니다. 라벨은 모두 `楽曲 · 곡 · Song`처럼 일·한·영을 함께 씁니다. 연결 수는 미리보기 설명문에만 씁니다.
- **메인**(`/`)과 **API 문서**(`/api/`)는 각자 카드가 있습니다. 메인은 프로젝트마다 공식 색으로 칠한 전체 지도, API는 종류마다 가장 중심적인 노드와 그 연결입니다.
- 경로 찾기 링크는 출발 노드의 카드로 나옵니다.
- 이미지 주소에 카드 내용의 해시(`og.png?v=…`)가 붙어서, 주소로 캐시하는 서비스는 바뀐 카드를 새로 읽습니다. 카카오톡은 따로 오래 캐시하므로 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 지웁니다.

</details>

### 그 밖에

- **모바일**: 너비 820px 이하에서는 전용 레이아웃을 씁니다. 노드를 고르기 전에는 지도가 화면 전체를 쓰고, 고르면 지도와 노드 패널이 화면을 나눠 씁니다.
- **언어와 테마**: 화면은 한·영·일, 이름 표기는 일본어·로마자·한국어를 따로 고릅니다. 라이트·다크 테마가 있습니다.
- **오류 제보**: 노드 패널 맨 아래 버튼을 누르면 [TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo/issues)에 새 이슈가 열리고, 노드·탭·데이터 버전이 미리 채워집니다.
- **API 문서** ([`/api/`](https://takasakiinfo.auroracaelum.com/api/)): TakasakiInfo API를 Swagger UI로 보여줍니다. API가 내주는 `openapi.json`을 열 때마다 읽고, `Try it out`으로 페이지에서 바로 호출할 수 있습니다.

<a id="url-parameters"></a>

<details>
<summary><b>URL 매개변수</b></summary>

<br>

| 매개변수 | 뜻 | 예 |
| :-- | :-- | :-- |
| `n` | 선택한 노드 | `n=work:nijigasaki/dive` |
| `tab` | 패널 탭 (`data`, `neighbors`, `related`) | `tab=related` |
| `focus` | 중심 보기 깊이 1~3 | `focus=2` |
| `path`, `hubs` | 경로 찾기 도착 노드, 허브 경유 허용 | `path=character:liella/kanon-shibuya` |
| `ui`, `names` | 화면 언어 (`ko`·`en`·`ja`), 이름 표기 (`ja`·`rom`·`ko`) | `ui=ja` |
| `color` | 색 기준 (`project`, `community`) | `color=community` |
| `p` | 보이는 프로젝트 | `p=nijigasaki,aqours` |
| `t`, `r` | 노드 종류·연결 종류를 기본값에서 바꾼 것 (`-`는 끔) | `r=-project,co_credit` |
| `drama`, `bgm`, `isolated` | 드라마 트랙 포함, BGM 숨김, 연결 없는 노드 표시 | `drama=1`, `bgm=0` |
| `mood` | 곡 분위기 (`upbeat`·`slow`·`bright`·`wistful`) | `mood=upbeat,bright` |
| `bpm` | 곡 BPM 범위 (한쪽만 써도 됨) | `bpm=120-160`, `bpm=140-` |
| `at` | 기간 슬라이더 날짜 | `at=2023-04-01` |

</details>

## 그래프 모델

노드는 프로젝트, 아티스트, 캐릭터, 인물, 곡(Work), 발매물, 공연, 회장, 도시입니다. 음원(Recording)은 곡 노드에 합치고, 에디션·트랙은 노드 패널에서 보여줍니다. 모델은 TakasakiInfo 설계 문서 §10.7을 따르고, 아래의 `D` 번호는 그 문서의 결정 번호입니다.

<details>
<summary><b>연결</b>: 사실 연결과 파생 연결</summary>

<br>

**사실 연결**은 데이터의 관계 행에서만 만듭니다.

| 관계 | 방향 | 강도(w) |
| :-- | :-- | :-- |
| 작사 · 작곡 | 인물·캐릭터(D27) → 곡 | 1 (`credits_override` 포함) |
| 편곡 · 현편곡 · 관편곡 · 가창 | 인물·캐릭터·아티스트 → 곡 | 해당 음원 수 (Off Vocal·인스트 제외, 최소 1) |
| 멤버 | 캐릭터 → 아티스트 | 1, 라인업 기간 (이어지는 기간은 합침) |
| CV | 캐릭터 → 인물 | 1, 캐스팅 기간 |
| 수록 | 곡 → 발매물 | 그 발매물에 실린 음원 수 (에디션 합산) |
| 발매 아티스트 | 아티스트·캐릭터·인물 → 발매물 | 1 (`artist_credit`) |
| 공연곡 | 곡 → 공연 | 공연한 날 수 |
| 출연 | 아티스트·캐릭터·인물 → 공연 | 세트리스트에서 노래한 공연 날 수 (객원·공동 명의 포함) |
| 회장 | 공연 → 회장 | 그 회장에서 공연한 날 수 |
| 소재지 | 회장 → 도시 | 1 |
| 소속 | 노드 → 프로젝트 | 1 (외부 작품은 없음) |

**파생 연결**은 규칙으로 계산하고, 곡선과 다른 색으로 그려 사실 연결과 구분합니다. 근거가 된 노드 목록(`via`)을 함께 저장합니다.

| 관계 | 규칙 | 강도 |
| :-- | :-- | :-- |
| 공동 크레딧 | 같은 곡에 작사·작곡·편곡으로 함께 크레딧된 인물 쌍 | 곡 수 |
| 공동 가창 | 같은 곡을 함께 부른 캐릭터 쌍. 아티스트는 그 음원의 첫 발매일 라인업으로 펼치고, 배역으로 부른 인물(D29)은 배역 캐릭터로 셉니다 | 곡 수 |
| 공유 멤버 | 라인업에 같은 캐릭터가 있는 아티스트 쌍 | 겹치는 캐릭터 수 |

</details>

<details>
<summary><b>노드</b>: BGM, 외부 작품, 날짜, 지표</summary>

<br>

- **BGM**(애니메이션 劇伴, `kind: bgm`, D50)은 아이콘과 필터가 따로 있는 곡입니다. 데이터베이스에 음원이 없어서 작곡과 세트리스트로만 이어집니다.
- **외부 작품**(`project: external`: 이차원 페스의 아이돌마스터 곡, 커버곡, 初音ミク 같은 외부 IP 캐릭터)은 프로젝트 허브로 묶지 않습니다. `외부 작품` 표시를 달고, 이어진 공연·발매물·곡의 프로젝트를 따릅니다.
- 온라인 전용 회차는 도시·회장이 없습니다(D47).
- 공연 출연진(`cast`, D52)과 라이브 음원의 녹음 공연(`live`, D54)은 패널에만 보여주고 연결로 만들지 않습니다. 출연 연결은 세트리스트에서 노래한 사람만 셉니다.
- **날짜**(기간 슬라이더용): 곡은 첫 발매일과 첫 공연일 중 이른 날, 발매물은 발매일, 공연은 첫 공연일입니다. 나머지 노드는 첫 사실 연결의 날짜이고, 그것도 없으면 날짜 있는 이웃 중 가장 이른 날을 물려받습니다. 아티스트의 프로젝트 소속은 그 프로젝트에서의 첫 곡·발매물·공연·멤버 날짜를 씁니다.
- **지표**: PageRank, 매개 중심성, 연결 수, Louvain 커뮤니티를 프로젝트 소속과 파생 연결을 뺀 그래프에서 계산합니다(프로젝트 허브를 거치면 모든 노드가 두 단계 안에 이어지기 때문). 브라우저에서 계산하는 간접 연관·유사 노드·경로도 같은 그래프를 씁니다.

</details>

## 색과 접근성

- **노드 종류** 색은 검증된 범주형 팔레트를 씁니다(라이트·다크 각각). 노드-링크 그림에서는 어떤 두 노드든 나란히 놓일 수 있고, 이때 모든 사람이 구분할 수 있는 색은 세 가지뿐이라서 가장 많은 세 종류(곡·인물·발매물, 노드의 약 90%)에 그 세 색을 줬습니다.
- 그래서 색만으로 종류를 구분하지 않습니다. 모든 노드에 종류 아이콘을 그리고(BGM은 따로), 툴팁·패널에 종류 이름을 적으며, 범례에 마우스를 올리면 그 종류만 강조합니다.
- 범주 색은 여덟 개이고 보라는 파생 연결에 씁니다. 그래서 아홉 번째 종류인 도시는 중립 회색을 쓰고 아이콘으로 구분합니다.
- **프로젝트** 색은 공식 색입니다([lovelive-anime.jp](https://www.lovelive-anime.jp/) 프로젝트 목록의 `Official SNS` 글자색, `src/theme.ts`). 다크 테마에서 배경과 대비가 3:1에 못 미치는 몇 색만 조금 밝혀 씁니다. 색은 ID에 고정되어 있어서 필터를 바꿔도 다시 칠해지지 않습니다.
- **A-RISE·Saint Snow·Sunny Passion**은 속한 프로젝트와 따로 자기 공식 색을 씁니다. 그룹 자신, 멤버 캐릭터, 그 그룹만 크레딧된 곡·발매물이 그 색이고(`shared/graph.ts`의 `COLOR_GROUPS`, 노드의 `g`), 범례에서는 프로젝트 바로 아래에 나옵니다.
- **러브라이브! 시리즈** 프로젝트와 그 밖의 노드(여러 프로젝트, 프로젝트 없음, 색이 없는 프로젝트)는 공통 색을 씁니다. 공식 공통 색(#E4007F)은 μ's 색(#E50080)과 눈으로 구분되지 않아서, 채도를 낮춘 로즈(#B06680)로 바꿔 씁니다.

## 개발

Node.js 22 이상이 필요합니다.

```sh
npm ci
npm run data          # CDN에서 v1을 받아 public/data/ 생성 (약 40초)
npm run dev           # http://localhost:5173
npm test              # 빌더와 클라이언트 로직 단위 테스트
npm run og            # public/data/로 공유 페이지와 카드 생성 (전부 그리면 코어 8개에서 약 3분)
npm run build         # data + og + 타입 검사 + dist/ 번들
```

로컬에서 만든 v1으로 빌드하려면 `takasaki dist`의 출력 디렉터리를 가리킵니다.

```sh
npm run data -- --src ../TakasakiInfo/dist/v1
# 또는: TAKASAKI_V1=../TakasakiInfo/dist/v1 npm run build
```

`public/data/`, `public/n/`, `public/og/`, `.cache/`는 생성물이라 커밋하지 않습니다.

<details>
<summary><b>데이터 흐름</b></summary>

<br>

```
TakasakiInfo CDN /data/v1/*.json ──(npm run data)──▶ public/data/
  projects, persons, characters, artists,              graph.json           노드·연결·좌표·지표·커뮤니티
  works, releases, cities, venues, concerts,           detail/<종류>.json    노드 패널 데이터 (필요할 때 로드)
  tracks, recordings (뷰)                               days.json            날짜별 사건 (이날의 러브 라이브!)
                                                       meta.json            데이터 버전
public/data/ ──(npm run og)──▶ public/n/<종류>/<id>/index.html, og.png      노드 공유 페이지와 카드
                               public/og/main.png, api.png                  메인·API 문서 카드
```

- 입력은 v1 파일 형식 `1.x`입니다. 다른 메이저 버전이면 빌드가 실패합니다.
- 참조가 깨진 경우(없는 ID)는 경고를 내고 그 연결만 건너뜁니다. `--strict`를 붙이면 경고도 실패로 처리합니다.
- 메인 URL 대체(D2) 같은 링크 규칙은 v1의 `tracks.json`·`recordings.json` 결과를 그대로 씁니다.

</details>

<details>
<summary><b>링크 미리보기 카드</b>: 폰트, 캐시, 용량</summary>

<br>

- 카드는 satori로 배치하고 resvg로 그립니다. 한·일·영은 Pretendard JP 한 벌로 쓰고, 없는 글자(간체자 회장명, 이모지, 반각 가나)는 Noto Sans SC·Noto Sans Symbols 2·Noto Emoji로 채웁니다. 폰트는 처음 실행할 때 `.cache/fonts/`에 받고 해시로 고정합니다. 어떤 폰트에도 없는 글자가 나오면 경고를 냅니다.
- 카드는 내용 해시로 `.cache/og/`에 남겨 두어, 다시 빌드할 때는 바뀐 카드만 코어마다 워커 하나씩 나눠 그립니다(`scripts/lib/og-worker.ts`). 모든 노드 카드 뒤에 지도가 있어서, 데이터 갱신으로 레이아웃이 바뀌면 카드를 전부 다시 그립니다. 배포 워크플로는 `.cache`를 다음 실행으로 이어 쓰고, `public/`의 카드는 캐시 파일의 하드 링크입니다.
- 지도의 점 때문에 무손실로는 카드가 커서 128색 PNG로 저장합니다. 장당 약 60KB, 전부 합쳐 약 230MB입니다.
- 사이트 주소(`https://takasakiinfo.auroracaelum.com/`)는 `shared/share.ts`의 `SITE_URL`과 `index.html`·`api/index.html`의 OG 태그에 있습니다. 미리보기 주소는 절대 주소여야 하므로, 도메인을 바꾸면 세 곳을 함께 고칩니다(테스트가 서로 맞는지 확인합니다).

</details>

<details>
<summary><b>스택</b></summary>

<br>

| | |
| :-- | :-- |
| 빌드 | Vite 7, TypeScript 5.9 |
| UI | React 19, zustand |
| 지도 | Sigma.js 3 (WebGL), @sigma/node-image(종류 아이콘), @sigma/edge-curve(파생 연결) |
| 그래프 계산 | graphology, ForceAtlas2, graphology-metrics, Louvain (빌드 시) |
| 미리보기 카드 | satori, resvg |
| 테스트 | Vitest |

</details>

## 배포

`.github/workflows/deploy.yml`이 GitHub Pages로 배포합니다(Settings → Pages → Source: **GitHub Actions**). 테스트, 데이터, 카드, 번들, 배포 순으로 실행합니다.

- `main`에 push하면 항상 배포합니다.
- **매일 06:17 KST**에 CDN의 `version.json`과 배포된 사이트의 `data/meta.json`을 비교해, 데이터가 바뀌었을 때만 다시 빌드합니다.
- TakasakiInfo 배포 직후 바로 반영하려면 TakasakiInfo 쪽에서 `repository_dispatch`를 보냅니다. 이 저장소에 `contents: write` 권한이 있는 토큰이 필요합니다.

  ```sh
  gh api repos/<owner>/<this-repo>/dispatches -f event_type=takasaki-data-updated
  ```

에셋과 데이터는 상대 경로(`base: "./"`)로 읽으므로, 어떤 하위 경로에 올려도 동작합니다.

## 피드백

데이터가 틀리거나 빠졌으면 노드의 `오류 제보` 버튼이나 [TakasakiInfo 이슈](https://github.com/AuroraCaelum/TakasakiInfo/issues)로, 지도 자체의 문제는 [이 저장소의 이슈](https://github.com/AuroraCaelum/TakasakiInfo-Graph/issues)로 알려 주세요.

## Disclaimer

노래, 가사를 포함한 모든 자료의 권리는

> ©2013 PROJECT Lovelive!<br>
> ©2017 PROJECT Lovelive! Sunshine!!<br>
> ©PROJECT YOHANE<br>
> ©2022 PROJECT Lovelive! Nijigasaki High School Idol Club<br>
> ©PROJECT Lovelive! Nijiyon Animation 2<br>
> ©2024 PROJECT Lovelive! Superstar!!<br>
> ©2026 PROJECT Lovelive! Hasunosora Jogakuin School Idol Club<br>
> ©PROJECT Lovelive! School Idol Musical<br>
> ©PROJECT IKIZULIVE!

와 그 권리사인 SUNRISE, Bandai Namco Filmworks Inc., Lantis, Bushiroad에 있습니다.
