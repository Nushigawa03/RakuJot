import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagService } from './tagService';
import { performSync } from '../../sync/syncService';
import { getAllTags, markTagDeleted, putTag } from '../../sync/localDb';

// localDb と syncService をモック（IndexedDB の代替）
vi.mock('../../sync/localDb', () => ({
  getAllTags: vi.fn().mockResolvedValue([]),
  putTag: vi.fn().mockResolvedValue(undefined),
  deleteTag: vi.fn().mockResolvedValue(undefined),
  markTagDeleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../sync/syncService', () => ({
  performSync: vi.fn().mockResolvedValue(undefined),
}));

// fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// navigator.onLine をモック (テスト時はオンラインとみなす)
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

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
            const result = await tagService.createTag('新しいタグ', '説明');

            expect(mockFetch).not.toHaveBeenCalledWith('/api/tags', expect.anything());
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
            expect(result.tag?.name).toBe('新しいタグ');
        });

        it('サーバー失敗時でもローカル保存は成功する（オフラインファースト）', async () => {
            const result = await tagService.createTag('タグ');

            // オフラインファースト: ローカルDBには常に保存成功
            expect(result.ok).toBe(true);
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
                    json: () => Promise.resolve([...mockTags, { id: '2', name: 'タグ2' }]),
                });

            await tagService.getTags();
            await tagService.createTag('タグ2');
            await tagService.getTags();

            // getTags が2回呼ばれる（キャッシュクリア後）。作成自体は同期経路に任せる。
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(performSync).toHaveBeenCalled();
        });
    });

    describe('updateTag', () => {
        it('ローカルをpending-updateにして同期する', async () => {
            vi.mocked(getAllTags).mockResolvedValueOnce([
                { id: 'tag-1', name: '旧タグ', _syncStatus: 'synced' } as any,
            ]);

            const result = await tagService.updateTag('tag-1', { name: '新タグ', description: '説明' });

            expect(putTag).toHaveBeenCalledWith({
                id: 'tag-1',
                name: '新タグ',
                description: '説明',
                _syncStatus: 'pending-update',
            });
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
        });
    });

    describe('deleteTag', () => {
        it('ローカルをpending-deleteにして同期する', async () => {
            const result = await tagService.deleteTag('tag-1');

            expect(markTagDeleted).toHaveBeenCalledWith('tag-1');
            expect(performSync).toHaveBeenCalled();
            expect(result.ok).toBe(true);
        });
    });
});
