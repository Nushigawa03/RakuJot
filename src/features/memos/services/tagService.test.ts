import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagService } from './tagService';

// fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('TagService', () => {
    let tagService: TagService;

    beforeEach(() => {
        tagService = new TagService();
        vi.clearAllMocks();
    });

    describe('getTags', () => {
        it('APIからタグ一覧を取得する', async () => {
            const mockTags = [
                { id: '1', name: 'タグ1' },
                { id: '2', name: 'タグ2' },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTags),
            });

            const tags = await tagService.getTags();

            expect(mockFetch).toHaveBeenCalledWith('/api/tags');
            expect(tags).toEqual(mockTags);
        });

        it('キャッシュされたタグを返す（2回目以降）', async () => {
            const mockTags = [{ id: '1', name: 'タグ1' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTags),
            });

            await tagService.getTags();
            const tags = await tagService.getTags();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(tags).toEqual(mockTags);
        });

        it('API失敗時は空配列を返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const tags = await tagService.getTags();

            expect(tags).toEqual([]);
        });

        it('ネットワークエラー時は空配列を返す', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const tags = await tagService.getTags();

            expect(tags).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('キャッシュをクリアして次回はAPIを呼ぶ', async () => {
            const mockTags = [{ id: '1', name: 'タグ1' }];
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockTags),
            });

            await tagService.getTags();
            tagService.clearCache();
            await tagService.getTags();

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('createTag', () => {
        it('新しいタグを作成する', async () => {
            const newTag = { id: '3', name: '新しいタグ' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ tag: newTag }),
            });

            const result = await tagService.createTag('新しいタグ', '説明');

            expect(mockFetch).toHaveBeenCalledWith('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '新しいタグ', description: '説明' }),
            });
            expect(result).toEqual({ ok: true, tag: newTag });
        });

        it('作成失敗時はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: '作成エラー' }),
            });

            const result = await tagService.createTag('タグ');

            expect(result.ok).toBe(false);
            expect(result.error).toBe('作成エラー');
        });

        it('作成後にキャッシュをクリアする', async () => {
            const mockTags = [{ id: '1', name: 'タグ1' }];
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockTags),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ tag: { id: '2', name: 'タグ2' } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([...mockTags, { id: '2', name: 'タグ2' }]),
                });

            await tagService.getTags();
            await tagService.createTag('タグ2');
            await tagService.getTags();

            // getTags が2回呼ばれる（キャッシュクリア後）
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
    });
});
