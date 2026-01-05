# テストフレームワーク基盤

このプロジェクトでは、以下のテストフレームワークを使用しています：

## 使用技術

- **Vitest**: 高速なテストランナー（Viteベース）
- **React Testing Library**: Reactコンポーネントのテスト
- **@testing-library/jest-dom**: DOMマッチャー拡張
- **happy-dom**: 軽量なDOM環境

## テストの実行

```bash
# テストを実行
npm test

# ウォッチモード
npm test -- --watch

# UIモード
npm run test:ui

# カバレッジ付き
npm run test:coverage
```

## テストファイルの配置

テストファイルは、テスト対象のファイルと同じディレクトリに配置します：

```
src/features/memos/components/TrashPage/
├── TrashPage.tsx
├── TrashPage.css
└── TrashPage.test.tsx  ← テストファイル
```

## サンプルテスト

`TrashPage.test.tsx` にサンプルテストが含まれています。このテストは以下を確認します：

- メモ一覧の表示
- 空のゴミ箱表示
- 復元機能
- 完全削除機能
- 残り日数表示

## テスト作成のベストプラクティス

1. **ユーザーの視点でテスト**: ユーザーがどう使うかを考える
2. **実装詳細に依存しない**: 内部実装ではなく、UIの動作をテスト
3. **モックは最小限**: 必要な部分のみモック
4. **アクセシビリティを意識**: `getByRole`, `getByLabelText` などを優先使用

## 今後の拡張

- E2Eテストフレームワーク（Playwright等）の追加を検討
- Visual Regression Testing の導入
- テストカバレッジの目標設定
