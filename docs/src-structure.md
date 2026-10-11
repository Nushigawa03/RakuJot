# src 配置ガイド (RakuJot)

## 全体像

```
src/
  root.tsx, entry.client.tsx, sw.ts   アプリの殻・起動時の同期開始・Service Worker
  app.css                             デザイントークン（ライト/ダーク）と各 CSS の読み込み
  routes/                             React Router のルート（薄く保つ）
  components/                         ドメイン非依存の部品（Button, Modal, TagInput, DatePickerInput, Textarea, Switch, Loading）と ui.css
  features/
    sync/        localDb.ts（IndexedDB）, syncService.ts（クライアント同期）, sync.server.ts（同期 API の処理）
    memos/       メモ一覧画面: components/, hooks/useLocalData.ts, searchStore.ts, services/, utils/, models/*.server.ts
    memos.edit/  メモ編集画面: EditPage.tsx, useMemoForm.ts
    settings/    設定画面・設定ストア
    auth/        認証（サーバー: config/, models/, utils/*.server.ts / クライアント: components/, currentUser.ts）
    App/services AI（Gemini）呼び出しと端末内埋め込みモデル
```

## データの流れ（オフラインファースト）

```
UI → services (memoService / tagService) → localDb (IndexedDB) ──変更通知──→ hooks/useLocalData → UI
                                              │
                                              └→ syncService → POST /api/sync → sync.server.ts → Prisma
```

- 書き込みはすべてローカル DB に即時反映し、オンラインならバックグラウンドで同期する。
- `localDb` は書き込みのたびに `subscribeLocalDb` の購読者へ通知する。画面は `useMemos` / `useTags` / `useExpressions` などで購読するだけでよく、手動の再読込やイベント発行は不要。
- 同期はサーバーの全データを返し、ローカルは未同期の変更を保護しながら置き換える（`bulkReplace*`）。
- 検索条件は `searchStore.ts` に1つだけ持ち、検索バー・サイドバー・フィルタ表示・メモ一覧が共有する。

## 配置の指針

1. **UI**: 汎用部品は `src/components/`、ドメイン固有は `features/<feature>/components/`。PC とスマホで同じ機能を別コンポーネントに複製しない（`variant` で出し分ける）。
2. **スタイル**: 色・角丸・影は `app.css` のトークン（`--bg`, `--text`, `--primary` など）だけを使う。汎用部品は `components/ui.css`、画面ごとの CSS は各 feature 直下（`memos.css` など）に置き、`app.css` から読み込む。分類の色のような動的な値だけは `style` で CSS 変数（`--category-color`）を渡す。
3. **ロジック**
   - API ルート (`routes/api.*`) は入出力だけを扱い、処理は `*.server.ts` に委譲する。
   - DB 操作は `models/*.server.ts` / `sync.server.ts`、外部 API は `App/services/*.server.ts`。
   - 純粋関数は `utils/`（テストもここに置く）。
4. **ルート**: 認証が必要なページは `requirePageUser`（`auth/routeAuth.server.ts`）を loader に、オフラインでも開けるよう `offlineClientLoader` を clientLoader に使う。
5. **文言**: ユーザー向けは日本語。ログは簡潔な英語でも可。
