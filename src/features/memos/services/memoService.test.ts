import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoService } from './memoService';

// fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

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

describe('MemoService', () => {
    let memoService: MemoService;

    beforeEach(() => {
        memoService = new MemoService();
        vi.clearAllMocks();
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
            expect(memos).toEqual(mockMemos);
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
    });

    describe('createMemo', () => {
        it('新しいメモを作成する', async () => {
            const newMemo = { id: '3', title: '新しいメモ', body: '本文', tags: [] };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(newMemo),
            });

            const result = await memoService.createMemo({
                title: '新しいメモ',
                body: '本文',
                tags: ['タグ1'],
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '新しいメモ', body: '本文', tags: ['タグ1'] }),
            });
            expect(result.ok).toBe(true);
            expect(result.memo).toEqual(newMemo);
        });

        it('作成失敗時はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: '保存に失敗しました' }),
            });

            const result = await memoService.createMemo({
                title: 'メモ',
                body: '本文',
                tags: [],
            });

            expect(result.ok).toBe(false);
            expect(result.error).toBe('保存に失敗しました');
        });
    });

    describe('updateMemo', () => {
        it('メモを更新する', async () => {
            const updatedMemo = { id: '1', title: '更新後', body: '更新本文', tags: [] };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(updatedMemo),
            });

            const result = await memoService.updateMemo('1', {
                title: '更新後',
                body: '更新本文',
                tags: [],
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/memos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: '1', title: '更新後', body: '更新本文', tags: [] }),
            });
            expect(result.ok).toBe(true);
        });
    });

    describe('deleteMemo', () => {
        it('メモを削除する', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const result = await memoService.deleteMemo('1');

            expect(mockFetch).toHaveBeenCalledWith('/api/memos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: '1' }),
            });
            expect(result.ok).toBe(true);
        });

        it('削除失敗時はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: '削除に失敗しました' }),
            });

            const result = await memoService.deleteMemo('1');

            expect(result.ok).toBe(false);
            expect(result.error).toBe('削除に失敗しました');
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
