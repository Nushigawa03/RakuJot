import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoService } from './memoService';
import { performSync, syncInBackground } from '../../sync/syncService';
import * as localDb from '../../sync/localDb';
import { getSettings } from '../../settings/useSettings';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

vi.mock('../../sync/localDb', () => ({
  getAllMemos: vi.fn().mockResolvedValue([]),
  getMemo: vi.fn().mockResolvedValue(undefined),
  putMemo: vi.fn().mockResolvedValue(undefined),
  markMemoDeleted: vi.fn().mockResolvedValue(undefined),
  getCanonicalMemoId: vi.fn((id: string) => Promise.resolve(id)),
  getAllTrashedMemos: vi.fn().mockResolvedValue([]),
  deleteTrashedMemo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../sync/syncService', () => ({
  performSync: vi.fn().mockResolvedValue(undefined),
  syncInBackground: vi.fn(),
}));

vi.mock('./tagService', () => ({
  tagService: {
    getTags: vi.fn().mockResolvedValue([{ id: '1', name: 'タグ1' }, { id: '2', name: 'Work' }]),
    resolveTagIds: vi.fn(async (names: string[]) => names.map((n) => `id:${n}`)),
  },
}));

vi.mock('../../settings/useSettings', () => ({
  getSettings: vi.fn(() => ({ aiUsageEnabled: true, googleApiKey: '', detailSearchAlwaysVisible: false })),
}));

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: () => Promise.resolve(body) });

describe('MemoService', () => {
  let service: MemoService;

  beforeEach(() => {
    service = new MemoService();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('メモはローカルに pending-create で保存し、サーバーへは同期経由で送る', async () => {
    const result = await service.createMemo({ title: '新しいメモ', body: '本文', tags: ['タグ1'], date: '2026-01-01' });

    expect(result.ok).toBe(true);
    expect(localDb.putMemo).toHaveBeenCalledWith(expect.objectContaining({
      title: '新しいメモ', tags: ['id:タグ1'], date: '2026-01-01', _syncStatus: 'pending-create',
    }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(syncInBackground).toHaveBeenCalled();
  });

  it('AI の提案でタイトル・日付を補い、タグ名を既存タグの表記に寄せる', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ title: 'AIタイトル', tags: ['work', 'WORK', '新'], date: '2026-02-03' }));

    await service.createMemoWithAiSuggestions('本文です');

    expect(localDb.putMemo).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AIタイトル', body: '本文です', date: '2026-02-03', tags: ['id:Work', 'id:新'],
    }));
  });

  it('AI がオフのときは呼び出さず、1行目をタイトルにする', async () => {
    vi.mocked(getSettings).mockReturnValueOnce({ aiUsageEnabled: false, googleApiKey: '', detailSearchAlwaysVisible: false });

    await service.createMemoWithAiSuggestions('一行目\n二行目');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(localDb.putMemo).toHaveBeenCalledWith(expect.objectContaining({ title: '一行目' }));
  });

  it('AI 編集が失敗したときは提案を返さない（タイトルを書き換えない）', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false));
    expect(await service.suggestEdit('本文', '明日に変更')).toBeNull();
  });

  it('更新は同期中の作成を保ちつつ、日付が変わったら埋め込みを捨てる', async () => {
    vi.mocked(localDb.getMemo).mockResolvedValueOnce({
      id: '1', title: '旧', date: '2026-01-01', tags: [], embedding: [1], createdAt: 'c', updatedAt: 'u', _syncStatus: 'pending-create',
    });

    await service.updateMemo('1', { title: '更新後', body: '更新本文', tags: [], date: '2026-05-05' });

    expect(localDb.putMemo).toHaveBeenCalledWith(expect.objectContaining({
      id: '1', title: '更新後', createdAt: 'c', embedding: undefined, _syncStatus: 'pending-create',
    }));
  });

  it('削除済みのメモへの保存では復活させない', async () => {
    vi.mocked(localDb.getMemo).mockResolvedValueOnce({
      id: '1', title: '旧', tags: [], createdAt: 'c', updatedAt: 'u', _syncStatus: 'pending-delete',
    });
    const result = await service.updateMemo('1', { title: '編集', body: '', tags: [] });
    expect(result.ok).toBe(false);
    expect(localDb.putMemo).not.toHaveBeenCalled();
  });

  it('削除は pending-delete にして同期する', async () => {
    const result = await service.deleteMemo('1');
    expect(localDb.markMemoDeleted).toHaveBeenCalledWith('1');
    expect(result.ok).toBe(true);
  });

  it('ゴミ箱は保持期限内のものを新しい順に返す', async () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    vi.mocked(localDb.getAllTrashedMemos).mockResolvedValueOnce([
      { id: 'old', deletedAt: daysAgo(40) },
      { id: 'a', deletedAt: daysAgo(5) },
      { id: 'b', deletedAt: daysAgo(1) },
    ] as any);

    expect((await service.getTrashedMemos()).map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('復元はサーバーで行い、同期してローカルに反映する', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const result = await service.restoreMemo('memo-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/memos/trash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalId: 'memo-1', action: 'restore' }),
    });
    expect(performSync).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('完全削除はサーバーとローカルの両方から消す', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const result = await service.permanentlyDeleteMemo('trash-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/memos/trash', expect.objectContaining({
      body: JSON.stringify({ id: 'trash-1', action: 'permanent-delete' }),
    }));
    expect(localDb.deleteTrashedMemo).toHaveBeenCalledWith('trash-1');
    expect(result.ok).toBe(true);
  });

  it('オフライン中はゴミ箱の操作をしない', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const result = await service.restoreMemo('memo-1');
    expect(result.ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
