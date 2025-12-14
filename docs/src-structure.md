# src 配置ガイド (RakuJot)

## 目的
- コード配置と再利用方針を明文化し、迷わず追加・改修できるようにする。
- デザインと挙動の一貫性を保ち、機能別に責務を分ける。

## 大枠の階層
- `src/root.tsx`, `src/routes.ts`, `src/routes/` : 画面ルーティング (Remix ルート)。
- `src/components/` : プラットフォーム非依存の再利用 UI (Button, Toggle, TagSuggestionInput など)。
- `src/features/` : 機能単位のまとまり。例: `App`, `memos`, `memos.edit`。
  - 各 feature 配下は `components/`, `hooks/`, `services/`, `stores/`, `utils/`, `types/` を基本とする。
- `src/hooks/` : アプリ横断の汎用カスタムフック。
- `src/utils/` : 言語・ロジック系の共通ユーティリティ (例: `math.ts`)。
- `src/styles/` : グローバルまたはページ単位のスタイル。Tailwind v4 構成に合わせ、CSS トークンを利用。
- `src/db.server.ts` など server 側 util: Remix の loader/action から使うサーバーロジック。

## 配置の指針
1. **UI コンポーネント**
   - 汎用的 (文言・ドメイン依存がない) → `src/components/`。
   - ドメイン固有 (メモ、タグ、サイドバーなど) → 対応する `src/features/<feature>/components/`。
   - 再利用を狙える小さな部品は `components/` で export し、features から import。

2. **スタイル**
   - インライン style は禁止。必ず CSS ファイルにクラスを置き、色・ボーダーは CSS カスタムプロパティ (例: `--color-primary`, `--color-border-subtle`) を使う。
   - 共通トークンは `src/app.css` / `src/tailwind.css` で定義済み。新色が必要な場合はまずトークン追加を検討。
   - コンポーネント専用スタイルは同名 CSS (`Component.tsx` ↔ `Component.css`) を同階層に置く。

3. **ロジック**
   - API 呼び出し・データ変換は `services/`。
   - ビジネスロジックのユーティリティは `utils/`。
   - 状態管理 (Zustand など) は `stores/`。
   - 型定義は `types/` にまとめ、 UI とロジック双方で使う。

4. **フック**
   - 特定機能専用 → `features/<feature>/hooks/`。
   - 複数機能で使う汎用フック → `src/hooks/`。
   - ネットワーク/副作用を伴うフックは `services/` の薄いクライアントを呼ぶ形にする。

5. **ルート/ページ**
   - Remix ルートファイルは `src/routes/` に配置。画面固有の UI は原則対応する feature の `components/` に置き、ルートは「データ取得＋配置」の薄いレイヤに留める。

6. **デザイン一貫性**
   - ボタンや入力はまず `src/components/` の既存部品を使う。足りなければ共通部品として拡張してから利用する。
   - 色・余白・タイポはトークン化したクラスを優先。独自寸法が必要な場合もまず既存 CSS 変数を確認。

7. **命名規約 (推奨)**
   - コンポーネント: パスカルケース `FullScreenMemoInput.tsx`。
   - スタイル: 同名 `.css` を隣に置く。
   - フック: `useXxx.ts`。サービス: `xxxService.ts`。ユーティリティ: 名詞/動詞ベース `tagUtils.ts`。

8. **カテゴリ・タグ等の色指定**
   - 動的カラーは inline スタイルにせず、ID からクラス名を生成し `--category-color` を注入する方式を採用。
   - 表示側では `var(--category-color, var(--color-border-strong))` のようなフォールバックを使う。

9. **テキスト/ログ**
   - ユーザー向け文言は日本語で統一し、 UI 側で表示専用として持つ。ロジック内のログは簡潔な英語でも可。

10. **追加で悩んだら**
    - 「汎用かドメインか」をまず判断して置き場を決める。
    - 汎用化できそうなら `src/components/` or `src/hooks/` に寄せる。
    - 既存のトークンやユーティリティに寄せることで重複を避ける。
