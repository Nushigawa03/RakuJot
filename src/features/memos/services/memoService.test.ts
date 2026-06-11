import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoService } from './memoService';
import { performSync } from '../../sync/syncService';
import { hasAnyMemoRecords } from '../../sync/localDb';

// fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// localDb と syncService をモック（IndexedDB の代替）
vi.mock('../../sync/localDb', () => ({
  getAllMemos: vi.fn().mockResolvedValue([]),
  hasAnyMemoRecords: vi.fn().mockResolvedValue(false),
  getMemo: vi.fn().mockResolvedValue(undefined),
  putMemo: vi.fn().mockResolvedValue(undefined),
  deleteMemo: vi.fn().mockResolvedValue(undefined),
  markMemoDeleted: vi.fn().mockResolvedValue(undefined),
  getCanonicalMemoId: vi.fn((id: string) => Promise.resolve(id)),
  getAllTrashedMemos: vi.fn().mockResolvedValue([]),
  putTrashedMemo: vi.fn().mockResolvedValue(undefined),
  deleteTrashedMemo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../sync/syncService', () => ({
  performSync: vi.fn().mockResolvedValue(undefined),
}));

// tagService と refreshTags をモック
vi.mock('./tagService', () => ({
    tagService: {
        getTags: vi.fn().mockResolvedValue([
            { id: '1', name: 'タグ1' },
            { id: '2', name: 'タグ2' },
        ]),
    },
}));

vi.mock('../utils/tagUtils', () => ({
    refreshTags: vi.fn().mockResolvedValue(undefined),
}));

// navigator.onLine をモック (テスト時はオンラインとみなす)
Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

describe('MemoService', () => {
    let memoService: MemoService;

    beforeEach(() => {
        memoService = new MemoService();
        vi.clearAllMocks();
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    });

    describe('getMemos', () => {
        it('APIからメモ一覧を取得する', async () => {
            const mockMemos = [
                { id: '1', title: 'メモ1', body: '本文1', tags: [] },
                { id: '2', title: 'メモ2', body: '本文2', tags: [] },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMemos),
            });

            const memos = await memoService.getMemos();

            expect(mockFetch).toHaveBeenCalledWith('/api/memos');
            // getMemos はサーバーデータに _syncStatus: 'synced' を付与して返す
            expect(memos).toEqual([
                { ...mockMemos[0], _syncStatus: 'synced' },
                { ...mockMemos[1], _syncStatus: 'synced' },
            ]);
        });

        it('API失敗時は空配列を返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const memos = await memoService.getMemos();

            expect(memos).toEqual([]);
        });

        it('ネットワークエラー時は空配列を返す', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const memos = await memoService.getMemos();

            expect(memos).toEqual([]);
        });

        it('pending-delete だけが残っている場合はサーバー取得で一時復活させない', async () => {
            vi.mocked(hasAnyMemoRecords).mockResolvedValueOnce(true);

            const memos = await memoService.getMemos();

            expect(memos).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalledWith('/api/memos');
        });
    });

    describe('createMemo', () => {
        it('新しいメモを作成する', async () => {
            const result = await memoService.createMemo({
                title: '新しいメモ',
                body: '本文',
                tags: ['タグ1'],
            });

            expect(mockFetch).not.toHaveBeenCalledWith('/api/memos', expect.anything());
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
        });

        it('サーバー失敗時でもローカル保存は成功する（オフラインファースト）', async () => {
            const result = await memoService.createMemo({
                title: 'メモ',
                body: '本文',
                tags: [],
            });

            // オフラインファースト: ローカルDBには常に保存成功
            expect(result.ok).toBe(true);
        });
    });

    describe('updateMemo', () => {
        it('メモを更新する', async () => {
            const result = await memoService.updateMemo('1', {
                title: '更新後',
                body: '更新本文',
                tags: [],
            });

            expect(mockFetch).not.toHaveBeenCalledWith('/api/memos', expect.anything());
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
        });
    });

    describe('deleteMemo', () => {
        it('メモを削除する', async () => {
            const result = await memoService.deleteMemo('1');

            expect(mockFetch).not.toHaveBeenCalledWith('/api/memos', expect.anything());
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
        });

        it('サーバー失敗時でもローカル削除は成功する（オフラインファースト）', async () => {
            const result = await memoService.deleteMemo('1');

            // オフラインファースト: ローカルDBでは常にpending-deleteにマーク成功
            expect(result.ok).toBe(true);
        });
    });

    describe('getTrashedMemos', () => {
        it('ゴミ箱のメモ一覧を取得する', async () => {
            const trashedMemos = [
                { id: 'trash-1', originalId: '1', title: '削除済みメモ' },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(trashedMemos),
            });

            const memos = await memoService.getTrashedMemos();

            expect(mockFetch).toHaveBeenCalledWith('/api/memos/trash');
            expect(memos).toEqual(trashedMemos);
        });
    });

    describe('restoreMemo', () => {
        it('メモを復元する', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const result = await memoService.restoreMemo('memo-1');

            expect(mockFetch).toHaveBeenCalledWith('/api/memos/trash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalId: 'memo-1', action: 'restore' }),
            });
            expect(result.ok).toBe(true);
        });
    });

    describe('permanentlyDeleteMemo', () => {
        it('メモを完全削除する', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const result = await memoService.permanentlyDeleteMemo('trash-1');

            expect(mockFetch).toHaveBeenCalledWith('/api/memos/trash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 'trash-1', action: 'permanent-delete' }),
            });
            expect(result.ok).toBe(true);
        });
    });
});
