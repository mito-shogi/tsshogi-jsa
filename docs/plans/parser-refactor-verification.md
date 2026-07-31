# パーサ実装の未検証リファクタの検証

## 背景

テンプレート追従で `tsconfig.json` に `noUncheckedIndexedAccess` が入り、型エラー 58 件を
解消するためにパーサ本体へ手を入れた。**このとき変更したファイルを通るテストは
認証情報を必要とし、ローカルでは実行できなかった**。

変更時のローカル実行結果は 40 pass / 18 fail で、失敗 18 件はすべて
`Authorization Required` / `Unauthorized` / `Internal Server Error`。
これは変更前のベースラインと同一の内訳であり、**リグレッションが無いことの証明にはならない**
（該当コードパスがそもそも実行されていない）。

計測日: 2026-07-30

## 追記 (2026-07-30): igoshogi 棋譜データ API の廃止

失敗 18 件のうち `Internal Server Error` 9 件は認証とは無関係で、
囲碁将棋チャンネルの棋譜データ API が廃止されたことによるものと判明した。

- `https://www.igoshogi.net/apis/kifu/readKifuData.php?KIFU=<key>` → **HTTP 500 / body 0 バイト**
  （`L46K0501` / `L46K0102` / `g32A0101` / `g32K0101` で確認）
- 対局一覧 `readKekkaList.php` は **200 で健在**。`Parse Game List > Loushou/Ginga` は現在もパスしている

`__tests__/parse/index.test.ts` の `Parse Game > Loushou/Ginga`（計 9 件）を理由付きでコメントアウトした。
これにより **49 tests / 40 pass / 9 fail** となり、残る失敗はすべて認証情報未設定によるものに揃った。
`importIKF` のカバレッジは失われるため、API 復旧または新形式への移行時に復活させること。

## 検証完了 (2026-07-30)

**全認証情報が揃い、`bun test` が 49 pass / 0 fail になった。**
下記の未検証項目はすべて実データを通過しており、カバレッジも
`decode.ts` 0% → 97%、`ai.dto.ts` 0% → 52%、`jsam.dto.ts` 0% → 99% に上がっている。
`RangeError: chunk index N is out of range` は一度も発生しなかった。

検証中に見つかった別件の不具合は 2 つとも修正済み
（`TournamentList` の未登録棋戦 65 件、進行中対局で落ちる不安定なテスト）。
詳細は [biome-plugins 警告の解消](./biome-plugins-compliance.md) を参照。

**このドキュメントは閉じてよい。** 以下は経緯の記録。

## 検証が必要な変更

いずれも型と読みでは等価性を確認済みだが、実データでの実行確認が取れていない。

- [ ] `src/utils/decode.ts:14` — `chunk()` の戻り値を `Buffer[]` からアクセサ関数
      `(index: number) => Buffer` に変更。全参照を `bytes[4]` → `bytes(4)` に書き換えた。
      範囲外アクセスは `RangeError` を投げる（従来は `undefined` が静かに伝播していた）。
      対象は `decodeKI` / `decodeBI` / `decodeKC` / `decodeSC` の全体
- [ ] `src/utils/decode.ts` — `.split('/')[0]` を `head(value, '/')` ヘルパに置換（`decodeKI` / `decodeSC` の `title`）
- [ ] `src/models/game/ai.dto.ts:85` — `GameSchema.array().transform(v => v[0])` に
      `.nonempty()` と ctx 検証を追加。**空配列の挙動が変わる**:
      従来は `undefined` が返って後続でクラッシュ、現在は Zod のバリデーションエラー
- [ ] `src/models/game/ikf.dto.ts:31` — `parts[0]` / `parts.slice(1)` を分割代入 + ガードに置換
- [ ] `src/models/game/meijin.dto.ts:66,78` — `match[1]` を明示的な `undefined` チェック経由に変更
- [ ] `src/utils/parse.ts:40` — `_toKanjiNumber` の漢数字テーブル参照を `kanjiAt()` に集約し、
      ループを `map().join()` 化。**負数の挙動が変わる**: 従来は `undefined` を
      `string` として返していた（潜在バグ）、現在は `RangeError`

## 手順

1. 認証情報を用意する。`.env.example` をコピーして以下を設定する
   - `MEIJIN_USERNAME` / `MEIJIN_PASSWORD` / `MEIJIN_SESSION`
   - `JSAM_USERNAME` / `JSAM_PASSWORD`
   - `AI_USERNAME` / `AI_PASSWORD`

   参照箇所はすべて `__tests__/utils/client.ts`。**名人戦は認証が 2 系統に分かれており、
   片方だけ更新しても直らない**ので注意する。
   - 棋譜取得 `fetch_meijin_game` → `MEIJIN_SESSION` を `kisen_session` クッキーとして送る
     （ホスト: `member.meijinsen.jp`）
   - 対局一覧 `fetch_meijin_game_list` → `MEIJIN_USERNAME` / `MEIJIN_PASSWORD` の Basic 認証
     （ホスト: `d31j6ipzjd5eeo.cloudfront.net`）
2. `bun test` を実行し、**49 件全パス**を確認する
   （`Parse Game > Loushou/Ginga` の 9 件は上記の追記のとおり無効化済み）
3. 特に以下のテストが通ることを確認する（上記変更が通るパス）
   - `Parse Game List > AI` / `Meijin` / `JSAM`
   - `Parse Game > JSAM`
   - `Parse Game List > Loushou` / `Ginga`（`decodeIKFList` のみ。`importIKF` は API 廃止で検証不能）
4. カバレッジで `src/utils/decode.ts` と `src/models/game/ai.dto.ts` が
   0% でなくなっていることを確認する

## 失敗した場合の切り分け

`chunk()` のアクセサ化が原因なら `RangeError: chunk index N is out of range` という
明示的なメッセージが出る。これは `lengths` 配列の定義と参照インデックスのズレを意味し、
**リファクタで作り込んだバグではなく、元から存在したズレが顕在化した**可能性が高い。
その場合は該当の `decodeXX` 関数の `lengths` 定義とインデックスの対応を読み直すこと。

## 補足

CI（`.github/workflows/integration.yaml`）の test ジョブには上記の secrets を
env として渡す設定を引き継いである。リポジトリの Actions secrets が設定されていれば
CI 側で自動的に検証される。**CI が緑になった時点でこのドキュメントは閉じてよい。**
