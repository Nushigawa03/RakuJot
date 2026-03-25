import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getAllMemos,
  getMemo,
  putMemo,
  markMemoDeleted,
  getPendingMemos,
  getAllTags,
  putTag,
  getPendingTags,
  getAllTagExpressions,
  putTagExpression,
  getLastSyncAt,
  setLastSyncAt,
  clearAllLocalData,
  bulkReplaceMemos,
  type LocalMemo,
  type LocalTag,
  type LocalTagExpression,
} from './localDb';

// fake-indexeddb は自動的にグローバルの indexedDB をモックする

describe('localDb', () => {
  beforeEach(async () => {
    // DB接続を再利用しつつ全ストアのデータをクリア
    await clearAllLocalData();
  });

  describe('Memo CRUD', () => {
    const makeMemo = (overrides: Partial<LocalMemo> = {}): LocalMemo => ({
      id: 'memo-1',
      title: 'テストメモ',
      date: '2026-03-25',
      tags: ['tag-1'],
      body: '本文テスト',
      createdAt: '2026-03-25T00:00:00Z',
      updatedAt: '2026-03-25T00:00:00Z',
      _syncStatus: 'synced',
      ...overrides,
    });

    it('メモを保存して取得できる', async () => {
      const memo = makeMemo();
      await putMemo(memo);

      const result = await getMemo('memo-1');
      expect(result).toEqual(memo);
    });

    it('全メモを取得できる（pending-delete は除外）', async () => {
      await putMemo(makeMemo({ id: 'memo-1' }));
      await putMemo(makeMemo({ id: 'memo-2', _syncStatus: 'pending-delete' }));
      await putMemo(makeMemo({ id: 'memo-3', _syncStatus: 'pending-update' }));

      const memos = await getAllMemos();
      expect(memos).toHaveLength(2);
      expect(memos.map((m) => m.id).sort()).toEqual(['memo-1', 'memo-3']);
    });

    it('markMemoDeleted: synced → pending-delete に変更', async () => {
      await putMemo(makeMemo({ id: 'memo-1', _syncStatus: 'synced' }));
      await markMemoDeleted('memo-1');

      const memo = await getMemo('memo-1');
      expect(memo?._syncStatus).toBe('pending-delete');
    });

    it('markMemoDeleted: pending-create → 物理削除', async () => {
      await putMemo(makeMemo({ id: 'memo-1', _syncStatus: 'pending-create' }));
      await markMemoDeleted('memo-1');

      const memo = await getMemo('memo-1');
      expect(memo).toBeUndefined();
    });

    it('getPendingMemos: synced 以外を返す', async () => {
      await putMemo(makeMemo({ id: 'memo-1', _syncStatus: 'synced' }));
      await putMemo(makeMemo({ id: 'memo-2', _syncStatus: 'pending-create' }));
      await putMemo(makeMemo({ id: 'memo-3', _syncStatus: 'pending-update' }));

      const pending = await getPendingMemos();
      expect(pending).toHaveLength(2);
    });
  });

  describe('Tag CRUD', () => {
    const makeTag = (overrides: Partial<LocalTag> = {}): LocalTag => ({
      id: 'tag-1',
      name: 'テストタグ',
      _syncStatus: 'synced',
      ...overrides,
    });

    it('タグを保存して取得できる', async () => {
      await putTag(makeTag());
      const tags = await getAllTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('テストタグ');
    });

    it('getPendingTags: pending のものだけ返す', async () => {
      await putTag(makeTag({ id: 'tag-1', _syncStatus: 'synced' }));
      await putTag(makeTag({ id: 'tag-2', _syncStatus: 'pending-create' }));

      const pending = await getPendingTags();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('tag-2');
    });
  });

  describe('TagExpression CRUD', () => {
    it('TagExpressionを保存して取得できる', async () => {
      const te: LocalTagExpression = {
        id: 'te-1',
        orTerms: [{ include: ['tag-1'], exclude: [] }],
        name: 'テスト式',
        color: '#ff0000',
        icon: '🏷️',
        _syncStatus: 'synced',
      };
      await putTagExpression(te);
      const result = await getAllTagExpressions();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('テスト式');
    });
  });

  describe('SyncMeta', () => {
    it('最終同期タイムスタンプを保存・取得できる', async () => {
      expect(await getLastSyncAt()).toBeNull();

      await setLastSyncAt('2026-03-25T00:00:00Z');
      expect(await getLastSyncAt()).toBe('2026-03-25T00:00:00Z');
    });
  });

  describe('bulkReplaceMemos', () => {
    it('既存データを完全に置き換える', async () => {
      const memo1: LocalMemo = {
        id: 'old-1',
        title: '古いメモ',
        tags: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        _syncStatus: 'synced',
      };
      await putMemo(memo1);

      const newMemos: LocalMemo[] = [
        { id: 'new-1', title: '新しいメモ1', tags: [], createdAt: '2026-03-25T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z', _syncStatus: 'synced' },
        { id: 'new-2', title: '新しいメモ2', tags: [], createdAt: '2026-03-25T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z', _syncStatus: 'synced' },
      ];
      await bulkReplaceMemos(newMemos);

      const all = await getAllMemos();
      expect(all).toHaveLength(2);
      expect(all.map((m) => m.id).sort()).toEqual(['new-1', 'new-2']);
    });
  });

  describe('clearAllLocalData', () => {
    it('全ストアをクリアする', async () => {
      await putMemo({ id: 'm1', title: 't', tags: [], createdAt: '', updatedAt: '', _syncStatus: 'synced' });
      await putTag({ id: 't1', name: 'tag', _syncStatus: 'synced' });
      await setLastSyncAt('2026-03-25T00:00:00Z');

      await clearAllLocalData();

      expect(await getAllMemos()).toHaveLength(0);
      expect(await getAllTags()).toHaveLength(0);
      expect(await getLastSyncAt()).toBeNull();
    });
  });
});
