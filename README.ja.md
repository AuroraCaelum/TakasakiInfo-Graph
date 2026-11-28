<div align="center">

# TakasakiInfo Graph

**ラブライブ！シリーズの楽曲、人物、リリース、公演をひとつにつなぐ<br>日本語・韓国語・英語のインタラクティブな関係マップ**

[![マップを開く](https://img.shields.io/badge/%E3%83%9E%E3%83%83%E3%83%97%E3%82%92%E9%96%8B%E3%81%8F-takasakiinfo.auroracaelum.com-e4007f?style=flat-square)](https://takasakiinfo.auroracaelum.com/)
[![APIリファレンス](https://img.shields.io/badge/API%E3%83%AA%E3%83%95%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%B9-Swagger%20UI-5d9cec?style=flat-square)](https://takasakiinfo.auroracaelum.com/api/)
[![データ](https://img.shields.io/badge/%E3%83%87%E3%83%BC%E3%82%BF-TakasakiInfo-555?style=flat-square)](https://github.com/AuroraCaelum/TakasakiInfo)
[![デプロイ](https://img.shields.io/github/actions/workflow/status/AuroraCaelum/TakasakiInfo-Graph/deploy.yml?branch=main&style=flat-square&label=%E3%83%87%E3%83%97%E3%83%AD%E3%82%A4)](https://github.com/AuroraCaelum/TakasakiInfo-Graph/actions/workflows/deploy.yml)
[![Hits](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph.svg?style=flat-square&label=hits&color=79c83d)](https://hits.sh/github.com/AuroraCaelum/TakasakiInfo-Graph/)

[English](README.md) · [한국어](README.ko.md) · **日本語**

<a href="https://takasakiinfo.auroracaelum.com/"><img src="https://takasakiinfo.auroracaelum.com/og/main.png" alt="TakasakiInfo Graph：プロジェクトごとの色で塗ったマップ全体" width="720"></a>

</div>

> [!NOTE]
> データは [TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo) データベースです。サイトは毎日データを確認し、変わっていればビルドし直すので、マップが1日以上遅れることはありません。

> [!IMPORTANT]
> データベースはまだ入力中のため、欠けているところがマップにそのまま表れます。
> - Aqours・Liella!・虹ヶ咲のグループアーティストにはまだラインナップがなく、そのメンバーのつながりと、グループ曲から生まれる共同歌唱がありません。
> - 長さ・キー・BPMがあるのは約580曲です。劇伴は長さのみで、拍子はまだどの曲にもありません。
> - セットリストに歌唱者が書かれていない公演（現在5件）には出演のつながりがありません。

## このサイトについて

- データベースのすべてのエンティティ（プロジェクト、アーティスト、キャラクター、人物、楽曲、リリース、公演、会場、都市、約3,800件）をノード、すべての関係（クレジット、歌唱、ラインナップ、キャスティング、収録、セットリスト、会場、約22,000件）をリンクとして描きます。
- レイアウトはサイトのビルド時に計算しておくので、いつ開いても同じマップがすぐに表示されます。
- ノードを選ぶと、データベースがそのノードについて持っているすべての情報を根拠とともに表示します。各言語の表記、クレジット、音源、エディション、セットリスト、中心性などです。
- GitHub Pages の静的サイトで、データは TakasakiInfo の CDN から取得します。

## 機能

### 探す

- **マップ**：WebGL で描画します。ノードの色分けは種類・プロジェクト・コミュニティ（Louvain）から選べます。
- **ノードパネル**：4つのタブがあります。
  - **概要**：楽曲の動画、すべての表記、別名、誕生日、初登場日、長さ・キー・BPM・雰囲気、プロジェクト、リンク（公式・YouTube Music・Fandom）、値ごとの根拠
  - **データ**：種類ごとの詳細。楽曲はクレジット・音源・収録リリース・公演歴、リリースはエディション・トラックリスト、公演は出演者・日別セットリスト・ライブ音源、都市は会場と公演
  - **関連ノード**：データ上のすべてのリンクを関係別に、強さ・期間・根拠とともに
  - **関連度**：中心性（リンク数・リンクの強さ・PageRank・媒介中心性）、間接的な関連（パーソナライズド PageRank）、類似ノード（Jaccard・Adamic-Adar）、コミュニティ
- **検索**（`/`）：日本語・かな・ローマ字・韓国語・別名で検索できます。部分一致で、カタカナ/ひらがな・全角/半角・空白は区別せず、ローマ字の1〜2文字の打ち間違いも許容します。
- **フィルター**：プロジェクト、ノードの種類（ドラマトラックは初期状態で非表示、劇伴は個別にオフ可）、曲の雰囲気・BPM、リンクの種類、派生リンク、リンクのないノード
- **中心表示**：選んだノードから深さ1〜3の近傍だけを残して配置し直します。ノードのダブルクリックでも使えます。
- **経路を探す**：2つのノードの間の最短経路です。画面に見えているリンクだけをたどり、強いリンクを優先し、プロジェクトのハブは経由しません。
- **期間スライダー**：選んだ日付までに出た楽曲・リリースと、その日のラインナップ・キャスティングだけを表示します。再生もできます。

### 聴く・振り返る

- **シャッフル再生**：YouTube の音源がある曲を、フィルターに合うものからランダムに続けて再生します。パネルを閉じても再生は続きます。
- **M月D日のラブライブ！**：今日と同じ月日にあった誕生日、公演、リリース、初登場、キャスティング・ラインナップの変化を、何周年かとあわせて文章で表示します。カレンダーから好きな日を選べます。
- **誕生日**：今日が誕生日の人物・キャラクターは、マップ上で小さなパーティー帽をかぶります。

### 共有する

- **リンク**：選んだノード、タブ、フィルター、日付が URL に入ります（[パラメーター](#url-parameters)）。
- **リンクプレビュー**：KakaoTalk・Discord・X・Slack にリンクを貼ると、そのノードのカードが表示されます。種類、名前、主な情報、マップ上の位置がわかります。

<details>
<summary>プレビューの仕組み</summary>

<br>

プレビューのクローラーは JavaScript を実行せず、GitHub Pages は `?n=` のリンクにすべて同じ `index.html` を返します。そこでビルド時にノードごとの共有ページ `/n/<種類>/<id>/` を作ります。このページにはそのノードの OG タグと 1200×630 のカード（`og.png`）があり、人が開くと残りのクエリを付けたままマップに移動します。「リンクをコピー」はこのページのアドレスをコピーします。

- **ノードのカード**：右側にはマップ全体を薄いグレーで敷き、そのノードが常に同じ位置に来るよう動かして、そのノードのリンクと近傍だけを種類の色で描きます。左側には種類、大きな日本語名とその下の韓国語・ローマ字表記、主な情報（楽曲はアーティスト・日付・長さ/キー/BPM、公演は期間・会場、キャラクターは CV・ユニット・誕生日など）、プロジェクトがあります。ラベルはすべて `楽曲 · 곡 · Song` のように日・韓・英を併記します。リンク数はプレビューの説明文にだけ書きます。
- **マップ**（`/`）と **API リファレンス**（`/api/`）には専用のカードがあります。マップはプロジェクトごとに公式カラーで塗ったマップ全体、API は種類ごとに最も中心的なノードとそのリンクです。
- 経路のリンクは出発ノードのカードで表示されます。
- 画像の URL にはカード内容のハッシュ（`og.png?v=…`）が付くので、URL でキャッシュするサービスは変わったカードを読み直します。KakaoTalk は独自に長くキャッシュするため、[Kakao 共有デバッガー](https://developers.kakao.com/tool/debugger/sharing)でキャッシュを消します。

</details>

### そのほか

- **スマートフォン**：幅 820px 以下では専用のレイアウトを使います。ノードを選ぶまではマップが画面全体を使い、選ぶとマップとノードパネルで画面を分けます。
- **言語とテーマ**：画面は韓国語・英語・日本語、名前の表記は日本語・ローマ字・韓国語を別々に選べます。ライト・ダークテーマがあります。
- **誤りを報告**：ノードパネルの一番下のボタンを押すと、[TakasakiInfo](https://github.com/AuroraCaelum/TakasakiInfo/issues) に新しい Issue が開き、ノード・タブ・データのバージョンがあらかじめ入力されます。
- **API リファレンス**（[`/api/`](https://takasakiinfo.auroracaelum.com/api/)）：TakasakiInfo API を Swagger UI で表示します。API が返す `openapi.json` を開くたびに読み込み、「Try it out」でページから直接呼び出せます。

<a id="url-parameters"></a>

<details>
<summary><b>URL パラメーター</b></summary>

<br>

| パラメーター | 意味 | 例 |
| :-- | :-- | :-- |
| `n` | 選んだノード | `n=work:nijigasaki/dive` |
| `tab` | パネルのタブ（`data`、`neighbors`、`related`） | `tab=related` |
| `focus` | 中心表示の深さ 1〜3 | `focus=2` |
| `path`, `hubs` | 経路の到着ノード、ハブ経由の許可 | `path=character:liella/kanon-shibuya` |
| `ui`, `names` | 画面の言語（`ko`・`en`・`ja`）、名前の表記（`ja`・`rom`・`ko`） | `ui=ja` |
| `color` | 色分け（`project`、`community`） | `color=community` |
| `p` | 表示するプロジェクト | `p=nijigasaki,aqours` |
| `t`, `r` | ノードの種類・リンクの種類を初期値から変えたもの（`-` はオフ） | `r=-project,co_credit` |
| `drama`, `bgm`, `isolated` | ドラマトラックを含める、劇伴を隠す、リンクのないノードを表示 | `drama=1`, `bgm=0` |
| `mood` | 曲の雰囲気（`upbeat`・`slow`・`bright`・`wistful`） | `mood=upbeat,bright` |
| `bpm` | 曲の BPM の範囲（片側だけでも可） | `bpm=120-160`, `bpm=140-` |
| `at` | 期間スライダーの日付 | `at=2023-04-01` |

</details>

## グラフのモデル

ノードはプロジェクト、アーティスト、キャラクター、人物、楽曲（Work）、リリース、公演、会場、都市です。音源（Recording）は楽曲ノードにまとめ、エディション・トラックはノードパネルで表示します。モデルは TakasakiInfo の設計文書 §10.7 に従い、以下の `D` 番号はその文書の決定番号です。

<details>
<summary><b>リンク</b>：事実のリンクと派生リンク</summary>

<br>

**事実のリンク**はデータの関係からだけ作ります。

| 関係 | 向き | 強さ（w） |
| :-- | :-- | :-- |
| 作詞・作曲 | 人物・キャラクター（D27）→ 楽曲 | 1（`credits_override` を含む） |
| 編曲・弦編曲・管編曲・歌唱 | 人物・キャラクター・アーティスト → 楽曲 | 該当する音源の数（Off Vocal・インストを除く、最低1） |
| メンバー | キャラクター → アーティスト | 1、ラインナップの期間（続く期間はまとめる） |
| CV | キャラクター → 人物 | 1、キャスティングの期間 |
| 収録 | 楽曲 → リリース | そのリリースに収録された音源の数（エディションの合計） |
| リリースアーティスト | アーティスト・キャラクター・人物 → リリース | 1（`artist_credit`） |
| セットリスト | 楽曲 → 公演 | 披露した日数 |
| 出演 | アーティスト・キャラクター・人物 → 公演 | セットリストで歌った公演日数（ゲスト・連名を含む） |
| 会場 | 公演 → 会場 | その会場での公演日数 |
| 所在地 | 会場 → 都市 | 1 |
| 所属 | ノード → プロジェクト | 1（外部作品はなし） |

**派生リンク**はルールで計算し、曲線と別の色で描いて事実のリンクと区別します。根拠になったノードの一覧（`via`）も保存します。

| 関係 | ルール | 強さ |
| :-- | :-- | :-- |
| 共同クレジット | 同じ楽曲に作詞・作曲・編曲で一緒にクレジットされた人物のペア | 曲数 |
| 共同歌唱 | 同じ楽曲を一緒に歌ったキャラクターのペア。アーティストはその音源の初リリース日のラインナップに展開し、役として歌った人物（D29）は役のキャラクターとして数えます | 曲数 |
| 共有メンバー | ラインナップに同じキャラクターがいるアーティストのペア | 重なるキャラクター数 |

</details>

<details>
<summary><b>ノード</b>：劇伴、外部作品、日付、指標</summary>

<br>

- **劇伴**（アニメの BGM、`kind: bgm`、D50）は専用のアイコンとフィルターを持つ楽曲です。データベースに音源がないため、作曲とセットリストでのみつながります。
- **外部作品**（`project: external`：異次元フェスのアイドルマスターの楽曲、カバー曲、初音ミクなど他作品のキャラクター）はプロジェクトのハブにまとめません。「外部作品」の印を付け、つながる公演・リリース・楽曲のプロジェクトに従います。
- オンライン限定の公演には都市・会場がありません（D47）。
- 公演の出演者（`cast`、D52）とライブ音源の収録公演（`live`、D54）はパネルにだけ表示し、リンクにはしません。出演のリンクはセットリストで歌った人だけを数えます。
- **日付**（期間スライダー用）：楽曲は初リリース日と初披露日のうち早いほう、リリースは発売日、公演は初日です。ほかのノードは最初の事実のリンクの日付で、それもなければ日付のある近傍のうち最も早い日を受け継ぎます。アーティストのプロジェクト所属は、そのプロジェクトでの最初の楽曲・リリース・公演・メンバーの日付を使います。
- **指標**：PageRank、媒介中心性、リンク数、Louvain コミュニティを、プロジェクト所属と派生リンクを除いたグラフで計算します（プロジェクトのハブを通るとすべてのノードが2ステップ以内でつながるため）。ブラウザで計算する間接的な関連・類似ノード・経路も同じグラフを使います。

</details>

## 色とアクセシビリティ

- **ノードの種類**の色は検証済みのカテゴリカルパレットを使います（ライト・ダークそれぞれ）。ノードリンク図ではどの2つのノードも隣り合いうるため、誰にでも見分けられる色は3つしかありません。そこで最も多い3種類（楽曲・人物・リリース、ノードの約90%）にその3色を割り当てています。
- そのため色だけで種類を区別しません。すべてのノードに種類のアイコンを描き（劇伴は専用）、ツールチップ・パネルに種類名を書き、凡例にマウスを乗せるとその種類だけを強調します。
- カテゴリカルカラーは8色で、紫は派生リンクに使います。そのため9番目の種類である都市はニュートラルなグレーで、アイコンで区別します。
- **プロジェクト**の色は公式カラーです（[lovelive-anime.jp](https://www.lovelive-anime.jp/) のプロジェクト一覧の「Official SNS」の文字色、`src/theme.ts`）。ダークテーマでは背景とのコントラストが 3:1 に満たない数色だけを少し明るくします。色は ID に固定されているので、フィルターを変えても塗り直されません。
- **A-RISE・Saint Snow・Sunny Passion** は所属プロジェクトとは別に自分の公式カラーを使います。グループ自身、メンバーのキャラクター、そのグループだけがクレジットされた楽曲・リリースがその色で（`shared/graph.ts` の `COLOR_GROUPS`、ノードの `g`）、凡例ではプロジェクトのすぐ下に表示されます。
- **ラブライブ！シリーズ**のプロジェクトとそれ以外のノード（複数のプロジェクト、プロジェクトなし、色のないプロジェクト）は共通の色を使います。公式の共通カラー（#E4007F）は μ's の色（#E50080）と見分けがつかないため、彩度を落としたローズ（#B06680）に変えています。

## 開発

Node.js 22 以上が必要です。

```sh
npm ci
npm run data          # CDN から v1 を取得して public/data/ を生成（約40秒）
npm run dev           # http://localhost:5173
npm test              # ビルダーとクライアントのロジックの単体テスト
npm run og            # public/data/ から共有ページとカードを生成（すべて描くと8コアで約3分）
npm run build         # data + og + 型チェック + dist/ のバンドル
```

ローカルで作った v1 でビルドするには、`takasaki dist` の出力ディレクトリを指定します。

```sh
npm run data -- --src ../TakasakiInfo/dist/v1
# または：TAKASAKI_V1=../TakasakiInfo/dist/v1 npm run build
```

`public/data/`、`public/n/`、`public/og/`、`.cache/` は生成物なのでコミットしません。

<details>
<summary><b>データの流れ</b></summary>

<br>

```
TakasakiInfo CDN /data/v1/*.json ──(npm run data)──▶ public/data/
  projects, persons, characters, artists,              graph.json           ノード・リンク・座標・指標・コミュニティ
  works, releases, cities, venues, concerts,           detail/<種類>.json    ノードパネルのデータ（必要なときに読み込み）
  tracks, recordings（ビュー）                          days.json            日付ごとの出来事（M月D日のラブライブ！）
                                                       meta.json            データのバージョン
public/data/ ──(npm run og)──▶ public/n/<種類>/<id>/index.html, og.png      ノードの共有ページとカード
                               public/og/main.png, api.png                  マップ・API リファレンスのカード
```

- 入力は v1 ファイル形式 `1.x` です。別のメジャーバージョンだとビルドは失敗します。
- 参照が壊れている場合（存在しない ID）は警告を出し、そのリンクだけを飛ばします。`--strict` を付けると警告も失敗扱いになります。
- メイン URL の代替（D2）などのリンク規則は、v1 の `tracks.json`・`recordings.json` の結果をそのまま使います。

</details>

<details>
<summary><b>リンクプレビューのカード</b>：フォント、キャッシュ、容量</summary>

<br>

- カードは satori でレイアウトし、resvg で描画します。日・韓・英は Pretendard JP ひとつでまかない、足りない文字（簡体字の会場名、絵文字、半角かな）は Noto Sans SC・Noto Sans Symbols 2・Noto Emoji で補います。フォントは初回実行時に `.cache/fonts/` に取得し、ハッシュで固定します。どのフォントにもない文字があれば警告を出します。
- カードは内容のハッシュで `.cache/og/` に残しておき、ビルドし直すときは変わったカードだけを、コアごとに1つのワーカーで分担して描きます（`scripts/lib/og-worker.ts`）。すべてのノードのカードの背景にマップがあるため、データ更新でレイアウトが変わるとカードをすべて描き直します。デプロイのワークフローは `.cache` を次の実行に引き継ぎ、`public/` のカードはキャッシュファイルへのハードリンクです。
- マップの点のせいでロスレスではカードが大きくなるため、128色の PNG で保存します。1枚あたり約60KB、合計約230MBです。
- サイトのアドレス（`https://takasakiinfo.auroracaelum.com/`）は `shared/share.ts` の `SITE_URL` と、`index.html`・`api/index.html` の OG タグにあります。プレビューの URL は絶対 URL である必要があるので、ドメインを変えるときは3か所をそろえて直します（テストが一致を確認します）。

</details>

<details>
<summary><b>技術スタック</b></summary>

<br>

| | |
| :-- | :-- |
| ビルド | Vite 7, TypeScript 5.9 |
| UI | React 19, zustand |
| マップ | Sigma.js 3（WebGL）、@sigma/node-image（種類のアイコン）、@sigma/edge-curve（派生リンク） |
| グラフ計算 | graphology, ForceAtlas2, graphology-metrics, Louvain（ビルド時） |
| プレビューのカード | satori, resvg |
| テスト | Vitest |

</details>

## デプロイ

`.github/workflows/deploy.yml` が GitHub Pages にデプロイします（Settings → Pages → Source：**GitHub Actions**）。テスト、データ、カード、バンドル、デプロイの順に実行します。

- `main` に push すると必ずデプロイします。
- **毎日 06:17（KST）**に CDN の `version.json` とデプロイ済みサイトの `data/meta.json` を比べ、データが変わったときだけビルドし直します。
- TakasakiInfo のデプロイ直後にすぐ反映するには、TakasakiInfo 側から `repository_dispatch` を送ります。このリポジトリに `contents: write` 権限のあるトークンが必要です。

  ```sh
  gh api repos/<owner>/<this-repo>/dispatches -f event_type=takasaki-data-updated
  ```

アセットとデータは相対パス（`base: "./"`）で読み込むので、どのサブパスに置いても動作します。

## フィードバック

データの誤りや不足はノードの「誤りを報告」ボタンか [TakasakiInfo の Issue](https://github.com/AuroraCaelum/TakasakiInfo/issues) で、マップ自体の問題は[このリポジトリの Issue](https://github.com/AuroraCaelum/TakasakiInfo-Graph/issues) でお知らせください。

## Disclaimer

楽曲、歌詞を含むすべての素材の権利は

> ©2013 プロジェクトラブライブ！<br>
> ©2017 プロジェクトラブライブ！サンシャイン!!<br>
> ©PROJECT YOHANE<br>
> ©2022 プロジェクトラブライブ！虹ヶ咲学園スクールアイドル同好会<br>
> ©プロジェクトラブライブ！にじよん あにめーしょん2<br>
> ©2024 プロジェクトラブライブ！スーパースター!!<br>
> ©2026 プロジェクトラブライブ！蓮ノ空女学院スクールアイドルクラブ<br>
> ©プロジェクトラブライブ！スクールアイドルミュージカル<br>
> ©プロジェクトイキヅライブ！

とその権利者である SUNRISE、Bandai Namco Filmworks Inc.、Lantis、Bushiroad に帰属します。
