# src 配置ガイド (RakuJot)

## 目的
- コード配置と再利用方針を明文化し、迷わず追加・改修できるようにする。
- デザインと挙動の一貫性を保ち、機能別に責務を分ける。

## 大枠の階層
- `src/root.tsx`, `src/routes.ts`, `src/routes/` : 画面ルーティング (React Router ルート)。
- `src/components/` : プラットフォーム非依存の再利用 UI (Button, Toggle, TagSuggestionInput など)。
- `src/features/` : 機能単位のまとまり。例: `App`, `memos`, `memos.edit`。
  - 各 feature 配下は `components/`, `hooks/`, `services/`, `stores/`, `utils/`, `types/`, `models/` を基本とする。
- `src/hooks/` : アプリ横断の汎用カスタムフック。
- `src/utils/` : 言語・ロジック系の共通ユーティリティ (例: `math.ts`)。
- `src/styles/` : グローバルまたはページ単位のスタイル。Tailwind v4 構成に合わせ、CSS トークンを利用。
- `src/db.server.ts` など server 側 util: React Router の loader/action から使うサーバーロジック。

## 配置の指針
1. **UI コンポーネント**
   - 汎用的 (文言・ドメイン依存がない) → `src/components/`。
   - ドメイン固有 (メモ、タグ、サイドバーなど) → 対応する `src/features/<feature>/components/`。
   - 再利用を狙える小さな部品は `components/` で export し、features から import。

2. **スタイル**
   - インライン style は禁止。必ず CSS ファイルにクラスを置き、色・ボーダーは CSS カスタムプロパティ (例: `--color-primary`, `--color-border-subtle`) を使う。
   - 共通トークンは `src/app.css` / `src/tailwind.css` で定義済み。新色が必要な場合はまずトークン追加を検討。
   - コンポーネント専用スタイルは同名 CSS (`Component.tsx` ↔ `Component.css`) を同階層に置く。

3. **ロジック（重要: レイヤー分離原則）**
   - **API Route 層** (`src/routes/api.*`): HTTP リクエスト/レスポンスの処理のみ。薄いレイヤーとして保つ。
   - **Models 層** (`src/features/*/models/*.server.ts`): **データベースCRUD操作**を担当。Prisma を直接使用し、DB操作の責務を集約する。
     - 例: `memo.server.ts`, `tag.server.ts`, `tagExpression.server.ts`
     - API Route はデータ操作時は**必ず Models 層経由**で行う。
   - **Services 層** (`src/features/*/services/*.ts`): **外部API連携・複雑なビジネスロジック**を担当。
     - 例: `aiMemoProcessor.server.ts` (Google AI API), `embeddingService.ts` (AI Embeddings API)
     - API Route は外部API処理時は Services 層を呼び出す。
   - **Utils** (`utils/`): ドメイン横断の純粋関数・ヘルパー。
   - **状態管理**: Zustand などは `stores/` に配置。
   - **型定義**: `types/` にまとめ、UI とロジック双方で使う。

   **レイヤー構造の例:**
   ```
   UI (React) → Service層 (fetch) → API Route → Models層 → Prisma (DB)
                                   ↓            ↓
                                   └→ Services層 → 外部API
   
   例: メモCRUD
   MemoList.tsx → memoService.ts → api.memos.ts → memo.server.ts → Prisma
   
   例: AI処理
   Component → (client service) → api.memos.ai.ts → aiMemoProcessor.server.ts → Google AI API
                                                   ↘ getTags() → tag.server.ts → Prisma
   ```

4. **フック**
   - 特定機能専用 → `features/<feature>/hooks/`。
   - 複数機能で使う汎用フック → `src/hooks/`。
   - ネットワーク/副作用を伴うフックは `services/` の薄いクライアントを呼ぶ形にする。

5. **ルート/ページ**
   - React Router ルートファイルは `src/routes/` に配置。画面固有の UI は原則対応する feature の `components/` に置き、ルートは「データ取得＋配置」の薄いレイヤに留める。
   - **API Route** (`api.*`) は薄く保ち、Models 層または Services 層に処理を委譲する。直接 Prisma を呼ばない。

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
    - **API Route を追加する場合**: DB操作なら Models 層、外部API なら Services 層を経由する設計にする。

## レイヤーアーキテクチャの原則

### Models 層の責務
- データベースへの CRUD 操作
- Prisma クライアントの直接使用
- データの整形・変換（DB ↔ アプリケーション型）
- **配置**: `src/features/*/models/*.server.ts`

### Services 層の責務
- 外部 API との連携（Google AI, Embedding API など）
- 複雑なビジネスロジック（複数のデータソースを組み合わせる処理）
- Models 層を組み合わせた高レベルな操作
- **配置**: `src/features/*/services/*.ts` (サーバーサイドの場合は `*.server.ts`)

### API Route 層の責務
- HTTP リクエスト/レスポンスのハンドリング
- バリデーション（基本的なもののみ）
- Models 層または Services 層への処理委譲
- エラーハンドリングと適切な HTTP ステータスの返却
- **配置**: `src/routes/api.*`
- **重要**: Prisma を直接使用しない。必ず Models/Services 層を経由する。

### 判断基準
| 処理内容 | 呼び出す層 | 例 |
|---------|-----------|-----|
| データベース操作（単一テーブル） | Models 層 | `getMemos()`, `createTag()` |
| データベース操作（複数テーブル） | Models 層 | `deleteMemo()` (関連削除含む) |
| 外部 AI API 呼び出し | Services 層 | `aiMemoProcessor()`, `computeEmbeddings()` |
| AI + DB の組み合わせ | Services 層 → Models 層 | AI処理後にタグ情報を取得 |

## テストコード

### 基本方針
- **テストフレームワーク**: Vitest + Testing Library (React)
- **環境**: happy-dom (軽量DOM実装)
- **カバレッジ**: v8 プロバイダー

### テストファイルの配置 (Colocation)
テストファイルは**テスト対象と同じディレクトリに配置**する（colocation パターン）。

```
src/features/memos/components/TrashPage/
├── TrashPage.tsx        # コンポーネント
├── TrashPage.css        # スタイル
└── TrashPage.test.tsx   # テスト ← 同じフォルダ
```

**メリット**:
- テスト対象とテストが近い位置にあるため、関連ファイルが見つけやすい
- ファイル移動時にテストも一緒に移動しやすい
- import パスが短くなる

### 命名規約
| 種類 | パターン | 例 |
|------|---------|-----|
| 単体テスト | `*.test.ts(x)` | `TrashPage.test.tsx` |
| E2E/統合テスト | `*.spec.ts(x)` | `memo-flow.spec.ts` |

### テストセットアップ
グローバル設定は `src/test/setup.ts` に配置:

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// happy-dom にないグローバルをモック
globalThis.alert = vi.fn();
globalThis.confirm = vi.fn(() => true);

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
```

### モックの書き方
```typescript
// 同じ階層からの相対パスでモック
vi.mock('../../services/memoService', () => ({
    memoService: {
        getTrashedMemos: vi.fn(),
        restoreMemo: vi.fn(),
    },
}));

// テスト内でモック値を設定
(memoService.getTrashedMemos as any).mockResolvedValue(mockData);
```

**重要**: `vi.mock()` のパスは **import 文と同じパス** を使用する。

### テストの書き方（推奨パターン）
```typescript
describe('ComponentName', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('日本語でテスト内容を記述する', async () => {
        // Arrange: モックデータ・レンダリング準備
        (service.method as any).mockResolvedValue(data);
        render(<Component />);

        // Act: ユーザー操作をシミュレート
        await waitFor(() => {
            fireEvent.click(screen.getByText('ボタン'));
        });

        // Assert: 期待結果を検証
        expect(screen.getByText('期待するテキスト')).toBeInTheDocument();
    });
});
```

### テスト実行コマンド
```bash
npm test              # watch モード
npm test -- --run     # 単発実行
npm run test:coverage # カバレッジ付き
```

