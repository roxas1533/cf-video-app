# ライブラリバグ追跡

## 現在発生中のバグ

### 1. UnoCSS: dev SSR で `/__uno.css?inline` が `ERR_DENIED_ID` になる

- **影響範囲**: 開発サーバー (localhost)
- **原因**: UnoCSSのVite統合が`\0`prefix仮想モジュール慣習に従わず、`/__uno.css`という実ファイルパスに見えるIDを返す。Vite 8のサーバーモジュールランナーがこれを実ファイルへのアクセスと判断して拒否する
- **追跡**: [unocss/unocss#5271](https://github.com/unocss/unocss/issues/5271) (2026-08-28 CLOSED/COMPLETED)
- **修正PR**: [unocss/unocss#5284](https://github.com/unocss/unocss/pull/5284) (2026-08-28 merge済み・未リリース。`v66.8.1`以降のバージョンで含まれる予定)
- **参考**: [solidjs/solid-start#2293](https://github.com/solidjs/solid-start/pull/2293) (根本解決できていないとしてclose済み)
- **回避策**: `patches/vite@8.2.1.patch` (後述)

### 2. UnoCSS: 本番ビルドでCSSユーティリティクラスが生成されない

- **影響範囲**: 本番ビルド (`vite build`)
- **原因**: `unocss:global:build:generate`プラグインの`configResolved`フックがVite 8 builderのshared configフェーズ(`outDir="dist"`)で呼ばれるため、実際の`renderChunk`時の`options.dir`(`.output/public`)と不一致になり`vite:css-post`プラグインのlookupが失敗する
- **追跡**: upstream issue未報告 (2026-08-25時点)
- **回避策**: `vite.config.ts`に`build.outDir: ".output/public"`を明示 (後述)

### 3. nitro: dev サーバーで `.json?import` リクエストが SPA HTML として返される

- **影響範囲**: 開発サーバー、特にLAN IP経由アクセス (スマホ等)
- **原因**: `nitroDevMiddlewarePre`の`ASSET_EXT_RE`に`json`が含まれておらず、`@solidjs/start`が起動時にfetchする`package.json?import`がSSRアプリに流れてHTMLが返される。その結果クライアントのモジュールグラフが壊れアプリが起動しない。LAN IPからのアクセスはブラウザが`Sec-Fetch-Dest`ヘッダを送らないため影響が顕在化する
- **追跡**: [unjs/nitro#4531](https://github.com/unjs/nitro/issues/4531)
- **修正PR**: [unjs/nitro#4453](https://github.com/unjs/nitro/pull/4453) (2026-07-22 merge済み・未リリース。最新betaは2026-06-10の`3.0.260610-beta`)
- **回避策**: `node_modules/nitro/dist/_build/vite.dev.mjs`への直接編集 (後述)

### 4. nitro: dev サーバーで `Sec-Fetch-Dest: image` のリクエストが 404 になる

- **影響範囲**: 開発サーバー (localhost)
- **原因**: `nitroDevMiddlewarePre`が`Sec-Fetch-Dest: image`を「静的アセット」と判断してViteに流し、SolidStartの`/**`キャッチオールルートにマッチするAPIエンドポイント(`/api/.../thumbnail`)が呼ばれない
- **追跡**: [unjs/nitro#4531](https://github.com/unjs/nitro/issues/4531)
- **回避策**: なし (本番では発生しない)

---

## 本来不要な変更

ライブラリのバグ回避のために加えた変更。対応するバグが上流で修正・リリースされたら削除できる。

### `patches/vite@8.2.1.patch`

- **対応バグ**: バグ①
- **内容**: `vite/dist/node/chunks/node.js`の`isServerAccessDeniedForTransform`チェックから`/__uno.css`と`/@unocss/`プレフィックスを除外
- **管理**: `bun patch`で管理済み。`bun install`後も自動適用される
- **削除条件**: PR#5284を含むUnoCSSバージョン(`v66.8.1`より新しいリリース)にアップデートしたら不要

### `build.outDir: ".output/public"` in `vite.config.ts`

- **対応バグ**: バグ②
- **内容**: nitroがclient環境のoutDirとして使う値と同じパスをrootのshared configにも明示することで、UnoCSSの`configResolved`フックが正しいoutDirを参照できるようにする
- **削除条件**: UnoCSSがVite 8 Environment APIの`configResolved`ライフサイクルに正しく対応したら不要

### `solidStart({ devOverlay: false })` in `vite.config.ts`

- **対応バグ**: バグ③の調査時に追加したが効果なし
- **内容**: DevToolbarを無効化。バグ③の根本原因(nitroのASSet_EXT_RE)とは無関係だったが削除せず残留
- **削除条件**: いつでも削除可。削除してもバグ③の回避には影響しない

### `node_modules/nitro/dist/_build/vite.dev.mjs` への直接編集

- **対応バグ**: バグ③
- **内容**: `ASSET_EXT_RE`の正規表現に`json`を追加
- **管理**: `bun patch`非管理。`bun install`または`rm -rf node_modules`で消える → 再適用が必要
- **削除条件**: nitroが`3.0.260610-beta`より新しいbetaをリリースしたら`bun update nitro`で解決する可能性がある(PR#4453がmerge済みのため)
