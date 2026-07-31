# biome-plugins 警告の解消

## 背景

[qtmleap/devcontainers](https://github.com/qtmleap/devcontainers) の `examples/hono-node/`
テンプレートに合わせる過程で、[qtmleap/biome-plugins](https://github.com/qtmleap/biome-plugins)
を submodule として導入した。GritQL ルールが Zod ファーストの TypeScript スタイル
（`let` 禁止、`??` フォールバック禁止、`as` 禁止、`safeParse` 優先など）を強制する。

現状 `bunx --bun biome check` は **exit 0**（警告のみで CI はブロックされない）だが、
警告 63 件 + info 1 件が残っている。本ドキュメントはその解消計画。

計測日: 2026-07-30 / biome 2.3.4

## 全体像

| 件数 | ルール | 主な対象 |
| --- | --- | --- |
| 44 | `no-bare-z-string` | `ai.dto.ts` 38, `message.dto.ts` 4, `ikf.dto.ts` 1, `list.dto.ts` 1 |
| 5 | `prefer-z-nonempty` | `ai.dto.ts` 2, `ikf.dto.ts` 2, `list.dto.ts` 1 |
| 5 | `no-type-assertion` | `jsam.dto.ts` 2, `parse.ts` 2, `meijin.dto.ts` 1 |
| 2 | `lint/correctness/noUnusedImports` | `__tests__/utils/client.ts` |
| 2 | `prefer-z-safe-parse` | `ai.dto.ts`, `jsam.dto.ts` |
| 2 | `no-while-loop` | `jsam.dto.ts`, `parse.ts` |
| 1 | `suppressions/unused` | `ai.dto.ts:45` |
| 1 | `lint/suspicious/noExplicitAny` | `ai.dto.ts:47` |
| 1 | `no-nullish-coalescing` | `parse.ts:156` |
| (info) 1 | `deserialize` | `biome.json:2` |

## 進捗 (2026-07-30 更新): 62 → 51 件

実データを必要としない 11 件を解消した。残り 51 件はすべて `no-bare-z-string` /
`prefer-z-nonempty` / `prefer-z-safe-parse` で、Step 2 の判断待ち。

**重要**: GritQL プラグイン由来の警告は `// biome-ignore plugin: ...` では抑制できない
（`plugin` / `plugins` / `plugin/<name>` いずれもカテゴリとして解釈されず
`Failed to parse category` になる）。**Step 2 の選択肢 2「`biome-ignore` で理由付きで抑制」は
実行不可能**であり、コードを直すか `plugins` 配列を落とすかの二択になる。

解消済み:

- [x] `__tests__/utils/client.ts` — 未使用 import 2 件
- [x] `ai.dto.ts:45,47` — `noExplicitAny` と効いていない `biome-ignore`。
      `(input: any) => input.length === 0` を `(input) => input === ''` に変更した。
      `preprocess` の入力は `unknown` なので `any` が不要になる
- [x] `no-while-loop` 2 件 — `parse.ts` にジェネレータ `markerIndexes()` を切り出し、
      `parse.ts` と `jsam.dto.ts` の両方から使う。
      **等価性はランダムバイナリ 20,000 件の差分テストで旧実装と完全一致を確認済み**
- [x] `no-type-assertion` 5 件 — `parse.ts` の `as Buffer` は `slice` を `subarray` に
      変えることで解消（`Buffer.subarray` は `Buffer` を返す）。
      `jsam.dto.ts` / `meijin.dto.ts` の `as any` は `list.dto.ts` に追加した
      `GameInfoListInput`（`z.input`）を transform の戻り値型として注釈することで解消
- [x] `no-nullish-coalescing` 1 件 — `match.groups?.player?.trim() ?? name`。
      `player` は `.+?` で必ずマッチするため到達不能なフォールバックだった。
      明示的な `undefined` チェック + throw に変更（`parseName` の 34 テストは全パス）
- [x] `bun run typecheck` — TypeScript 7 で `baseUrl` が削除されたエラー。
      `paths` は `moduleResolution: bundler` 下で tsconfig 相対に解決されるため
      `baseUrl` 行を消すだけでよい

### `as any` が隠していた 2 件の型不整合

削除して初めて表面化した。いずれも **`GameInfoListSchema` の検証時に実行時エラーになる**
経路であり、`as any` はコンパイル時の検出だけを潰していた。

1. `metadata.tournament` — `TournamentList.find(...)?.value` は該当なしで `undefined` を返すが、
   `MetadataInfo` では必須。`jsam.dto.ts` / `meijin.dto.ts` の両方で
   `ctx.addIssue` + `z.NEVER` による明示的な検証エラーに変更した
   （`ai.dto.ts` の既存パターンに合わせた）
2. `kif: null` — `jsam.dto.ts` / `meijin.dto.ts` の中間 transform にあったが
   `GameInfoListSchema` に存在せず strip されるため出力に現れない。参照箇所も無いので削除した

`meijin.dto.ts` の書き換えは `__tests__/parse/meijin_all_game_list.txt` の実データ
**13,461 件**で検証し、リファクタ前後の出力ハッシュが一致することを確認済み
（フィクスチャは UTF-8 保存だがパーサは shift_jis 前提なので、
検証時は `iconv.encode(utf8, 'shift_jis')` で再エンコードする必要がある）。

### 副産物: 未登録棋戦 2 件の発見と追加（解決済み）

`tournament` の検証を `ctx.addIssue` に変えたことで、JSAM の 3 テストが失敗する
**本当の原因**が読めるようになった。これは元から失敗していたもので、リファクタによる退行ではない。

- 変更前: `Invalid input: expected string, received undefined`（どの棋戦か分からない）
- 変更後: `Unknown tournament: 【無料】ABEMA地域トーナメント2026予選Aリーグ第一試合①`

JSAM の全対局一覧（p3=1/2/3）を走査したところ、**185 棋戦中 65 件が未登録**だった。

- 64 件: `ABEMA地域トーナメント`（個人戦の `ABEMAトーナメント` とは別大会）
- 1 件: `将棋フェス2026スペシャル対局`

`Tournament` enum に `ABEMA_REGIONAL` / `SHOGI_FES` を追加して解消した。
**`ABEMA地域トーナメント` のエントリは既存の `ABEMAトーナメント` より前に置くこと**。
`TournamentList.find()` は先頭一致なので、順序を逆にすると地域対抗戦が
個人戦として誤判定される（`ABEMA地域トーナメント` は `ABEMAトーナメント` を含まないため
現状は competing しないが、将来キーを緩めた場合の事故を防ぐ）。

追加前後で全 185 棋戦の判定を突き合わせ、**変化したのは 65 件の
`(none)` → 登録済みのみ**で既存 120 棋戦の判定は不変であることを確認済み。

## Step 1: 機械的に片付く 4 件

先に手を動かす価値があり、判断を伴わないもの。

- [ ] `__tests__/utils/client.ts:1-2` — 未使用 import 2 件。`bunx --bun biome check --write` で自動修正される
- [ ] `biome.json:2` — `$schema` がテンプレート由来の `2.0.0` のまま。CLI は 2.3.4 なので
      `https://biomejs.dev/schemas/2.3.4/schema.json` に更新する。
      **注意**: テンプレート本体からの意図的な逸脱になるため、テンプレート側の更新方針を確認するか、
      追従コストを許容するかを決めてから変更すること
- [ ] `ai.dto.ts:45` — 効いていない `biome-ignore` コメント。直下の `noExplicitAny`（`:47`）を
      抑制しようとして位置がずれている。コメントを正しい行に移すか、Step 3 で `any` ごと解消する

## Step 2: `no-bare-z-string` / `prefer-z-nonempty`（49 件）

最大の塊。`z.string()` に `.nonempty()` 等の制約を付けて「空文字を受け入れない」意図を明示するルール。

- [ ] `src/models/game/ai.dto.ts`（38 + 2 件）
- [ ] `src/models/message.dto.ts`（4 件）
- [ ] `src/models/list.dto.ts:27`（1 + 1 件）
- [ ] `src/models/game/ikf.dto.ts:56-57`（1 + 2 件）

**判断が必要**: これらは外部 API（将棋連盟ライブ中継）のレスポンスを写したスキーマである。
機械的に `.nonempty()` を付けると、**API が実際に空文字を返すフィールドで
パースが落ちる**リスクがある。以下のどちらかを選ぶこと。

1. フィールドごとに実データを確認して `.nonempty()` を付ける（安全だが手間）
2. 空文字を許容すべきフィールドを洗い出し、そこだけ `biome-ignore` で理由付きで抑制する

いずれにせよ **Step 4 の検証環境が整ってから着手する**のが望ましい。
盲目的な一括置換は避ける。

### 選択肢 2 は使えない (2026-07-30 追記)

上の「進捗」節のとおり、プラグイン警告は `biome-ignore` で抑制できない。
残る手は「実データで確認して `.nonempty()` を付ける」か「`plugins` を落とす」のみ。

### 着手前に必要なもの

**解決済み (2026-07-30)**: 全認証情報が `.env` に揃い、
`bun test` は **49 pass / 3 skip / 0 fail**（着手時は 40 pass / 9 fail）。
カバレッジは全体 94.89%。
`jsam.dto.ts` 0% → 96%、`decode.ts` 0% → 97%、`ai.dto.ts` 0% → 91% に改善した。

残る低カバレッジは `ikf.dto.ts` の 65% のみ。未カバー部分は `importIKF`（`:138-210`）で、
**囲碁将棋チャンネルの棋譜 API が 500 のまま復旧していない**ため検証不能
（2026-07-30 再確認済み）。API 復旧か新形式移行までは上げようがない。

この 3 件はコメントアウトではなく `it.skip` にしてある。ランナーに skip として出るので
「無効化されている事実」が見える。復旧したら `it.skip` を `it` に戻すだけでよい。

名人戦は**認証が 2 系統に分かれている**ので注意すること。片方だけ更新しても直らない。

| 用途 | 認証 | ホスト |
| --- | --- | --- |
| `fetch_meijin_game`（棋譜取得） | `MEIJIN_SESSION` クッキー | `member.meijinsen.jp` |
| `fetch_meijin_game_list`（対局一覧） | `MEIJIN_USERNAME` / `MEIJIN_PASSWORD` の Basic | `d31j6ipzjd5eeo.cloudfront.net` |

これで `ai.dto.ts` の `z.string()` 41 件も実データで確認できる状態になった。

### 副産物 3: `importBJF` が実データで 100% 失敗していた

カバレッジ確認をきっかけに発覚。`ai.dto.ts` の `GameSchema` が `__v: z.number()` を
**必須**にしていたが、**実データに `__v` は存在しない**（20 件サンプルで 20 件とも欠落）。
`importBJF` は AI 棋譜 API のレスポンスに対して常にパースエラーを投げる状態だった。

見逃されていた理由はテスト側の 2 つの欠陥。

1. `try { ... } catch { console.error(game.game_id) }` で例外を握り潰しており、
   **全件失敗してもテストが緑になる**
2. `Parse Game > JSAM` の中で **JSAM の `game_id` を AI の API に渡していた**。
   別サービスの ID なので大半が 403 になり、失敗が「ID 違いのせい」に見えてしまう

`__v` をスキーマから削除し、AI を独立した `it('AI')` に切り出して
メタデータまで検証するようにした。60 件の広域サンプリングで 57 件成功
（失敗 3 件はいずれも HTTP 403 で棋譜自体が存在しないもの。`game_id: 0` を含む）。
`ai.dto.ts` のカバレッジは 52% → 91%（関数 100%）。

なお実データには逆にスキーマ側が持たない `breaktime` が全件に存在する。
Zod は既定で未知キーを strip するため実害はない。

同じ「握り潰し」パターンが `Parse Game` 内にもう 1 つあり、そちらは
`expect` を一切持たず `console.log` するだけで、しかも `it('AI')` が重複登録されていた。
検証していない以上テストとして機能しないので削除した。

### 副産物 2: 進行中の対局で落ちる不安定なテスト

`Parse Game > Meijin` は最新 10 対局を無条件に対象にしていたため、
**当日の対局がまだ終局していないと `END_DATETIME` が無く落ちる**（日によって成否が変わる）。
`game.metadata.end_time !== null` で終局済みに絞ってから `slice(0, 10)` するよう修正した。
フィルタを `slice` の後に置くと検証対象が 10 件を割るので順序に注意。

調査中に、対局一覧では `end_time=null` なのに棋譜側には終了時刻がある対局
（`game_id=116237`）も見つかった。一覧の更新が棋譜に追いついていないだけで、
パーサ側の問題ではない。

### 実データ無しでも危険と分かっている箇所

機械的に `.nonempty()` を付けてはならない具体例。着手時の反例として使うこと。

- `message.dto.ts:181` `comment: z.string()` — 同ファイル `:193,:204` に
  `v.comment.length === 0` の分岐があり、**空文字が正規値であることがコード上確定している**
- `ai.dto.ts` の `note` / `end_reason` / `place` / `handicap` 系 — `endtime` が
  空文字で来る前提の `preprocess` が既にあることから、他フィールドも空文字を返す可能性が高い
- `ikf.dto.ts:54-56` `KEKKA` / `KAISETU` / `KIKITE` — `KIKITE` は
  `9548c4c fix(models): make KIKITE field nullable in KekkaSchema` で
  **実データに合わせて nullable にした経緯がある**。空文字も来ると考えるのが自然

## Step 3: 設計判断を伴うもの（10 件）

- [x] `no-type-assertion` 5 件 — 解消済み（上の「進捗」節を参照）
- [ ] `prefer-z-safe-parse` 2 件 — `ai.dto.ts:84`, `jsam.dto.ts:22`。
      `parse` は例外を投げる。`safeParse` に変えるなら**エラーハンドリングを呼び出し側まで
      設計し直す必要があり、ライブラリの公開 API の挙動が変わる**。破壊的変更になるか要検討。
      **未着手**: `importBJF` / `importBSA` は現状 throw する契約であり、
      これは呼び出し側に影響する仕様変更なので単独で判断すべきではない
- [x] `no-while-loop` 2 件 — 解消済み
- [x] `noExplicitAny` 1 件 — 解消済み
- [x] `no-nullish-coalescing` 1 件 — 解消済み

## 完了条件

- `bunx --bun biome check` が警告 0 件で exit 0
- `bun run typecheck` がエラー 0 件
- `bun test` が [パーサ実装の検証](./parser-refactor-verification.md) の手順で全件パス

## 降りる選択肢

テンプレートの README は次を明記している。

> If a project prefers not to enforce these rules, drop the `plugins` array in
> `biome.json` and skip the submodule step.

Step 2 の 49 件が API 実態と噛み合わないと判明した場合、`biome.json` の `plugins`
配列を落として submodule を外す判断も正当である。その場合は `.gitmodules` と
`biome-plugins/` の削除、`integration.yaml` の `submodules: recursive` の見直しも伴う。
