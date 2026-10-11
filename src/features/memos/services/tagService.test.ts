import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tagService, expressionService } from './tagService';
import { syncInBackground } from '../../sync/syncService';
import * as localDb from '../../sync/localDb';

vi.mock('../../sync/localDb', () => ({
  getAllTags: vi.fn().mockResolvedValue([]),
  putTag: vi.fn().mockResolvedValue(undefined),
  markTagDeleted: vi.fn().mockResolvedValue(undefined),
  getAllMemos: vi.fn().mockResolvedValue([]),
  getAllTagExpressions: vi.fn().mockResolvedValue([]),
  getTagExpression: vi.fn().mockResolvedValue(undefined),
  putTagExpression: vi.fn().mockResolvedValue(undefined),
  deleteTagExpression: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../sync/syncService', () => ({ syncInBackground: vi.fn() }));

describe('tagService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('タグをローカルに pending-create で保存して同期する', async () => {
    const tag = await tagService.createTag('新しいタグ', '説明');

    expect(tag.name).toBe('新しいタグ');
    expect(localDb.putTag).toHaveBeenCalledWith(expect.objectContaining({ name: '新しいタグ', _syncStatus: 'pending-create' }));
    expect(syncInBackground).toHaveBeenCalled();
  });

  it('更新はローカルを pending-update にして同期する', async () => {
    vi.mocked(localDb.getAllTags).mockResolvedValueOnce([{ id: 'tag-1', name: '旧タグ', _syncStatus: 'synced' }]);

    const result = await tagService.updateTag('tag-1', { name: '新タグ', description: '説明' });

    expect(localDb.putTag).toHaveBeenCalledWith({ id: 'tag-1', name: '新タグ', description: '説明', _syncStatus: 'pending-update' });
    expect(result.ok).toBe(true);
  });

  it('未同期のタグは更新しても pending-create のまま', async () => {
    vi.mocked(localDb.getAllTags).mockResolvedValueOnce([{ id: 'tag-1', name: '旧', _syncStatus: 'pending-create' }]);
    await tagService.updateTag('tag-1', { name: '新' });
    expect(localDb.putTag).toHaveBeenCalledWith(expect.objectContaining({ _syncStatus: 'pending-create' }));
  });

  it('メモで使われていないタグは削除できる', async () => {
    const result = await tagService.deleteTag('tag-1');
    expect(localDb.markTagDeleted).toHaveBeenCalledWith('tag-1');
    expect(result.ok).toBe(true);
  });

  it('メモで使われているタグは削除しない', async () => {
    vi.mocked(localDb.getAllMemos).mockResolvedValueOnce([
      { id: 'm1', title: 'a', tags: ['tag-1'], createdAt: '', updatedAt: '', _syncStatus: 'synced' },
    ]);
    const result = await tagService.deleteTag('tag-1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('1個のメモ');
    expect(localDb.markTagDeleted).not.toHaveBeenCalled();
  });

  it('タグ名の表記ゆれは既存タグに寄せ、未知の名前は作成する', async () => {
    vi.mocked(localDb.getAllTags).mockResolvedValueOnce([{ id: 'work', name: 'Work', _syncStatus: 'synced' }]);

    const ids = await tagService.resolveTagIds(['ｗｏｒｋ', ' 新規 ', 'work']);

    expect(ids[0]).toBe('work');
    expect(ids).toHaveLength(2);
    expect(localDb.putTag).toHaveBeenCalledWith(expect.objectContaining({ name: '新規' }));
  });
});

describe('expressionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未同期の分類は削除するとローカルからも消える', async () => {
    vi.mocked(localDb.getTagExpression).mockResolvedValueOnce({ id: 'e1', orTerms: [], _syncStatus: 'pending-create' });
    await expressionService.delete('e1');
    expect(localDb.deleteTagExpression).toHaveBeenCalledWith('e1');
  });

  it('同期済みの分類は pending-delete にする', async () => {
    vi.mocked(localDb.getTagExpression).mockResolvedValueOnce({ id: 'e1', orTerms: [], _syncStatus: 'synced' });
    await expressionService.delete('e1');
    expect(localDb.putTagExpression).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', _syncStatus: 'pending-delete' }));
  });
});
