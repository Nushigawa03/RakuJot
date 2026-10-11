/**
 * タグ・分類（TagExpression）のローカル CRUD。書き込みは IndexedDB に即時反映し、同期はバックグラウンドで行う。
 */
import {
  getAllTags, putTag, markTagDeleted, getAllMemos,
  getAllTagExpressions, getTagExpression, putTagExpression, deleteTagExpression,
  type LocalTag,
} from '../../sync/localDb';
import { syncInBackground } from '../../sync/syncService';
import type { Tag } from '../types/tags';
import type { TagExpression } from '../types/tagExpressions';
import { normalizeTagName } from '../utils/normalizeTagName';

const newLocalId = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const pendingUpdate = (status: LocalTag['_syncStatus']) => (status === 'pending-create' ? 'pending-create' : 'pending-update');

export const tagService = {
  getTags: async (): Promise<Tag[]> => (await getAllTags()).map(({ id, name, description }) => ({ id, name, description })),

  async createTag(name: string, description?: string): Promise<Tag> {
    const tag: LocalTag = { id: newLocalId(), name, description, _syncStatus: 'pending-create' };
    await putTag(tag);
    syncInBackground();
    return { id: tag.id, name, description };
  },

  async updateTag(id: string, data: { name?: string; description?: string }) {
    const existing = (await getAllTags()).find((t) => t.id === id);
    if (!existing) return { ok: false, error: 'タグが見つかりません' };
    await putTag({ ...existing, ...data, _syncStatus: pendingUpdate(existing._syncStatus) });
    syncInBackground();
    return { ok: true };
  },

  /** メモで使われているタグは削除できない（サーバーと同じ制約をローカルで先に確認する） */
  async deleteTag(id: string) {
    const used = (await getAllMemos()).filter((m) => m.tags.includes(id)).length;
    if (used) return { ok: false, error: `このタグは${used}個のメモで使用されているため削除できません` };
    await markTagDeleted(id);
    syncInBackground();
    return { ok: true };
  },

  /** タグ名をタグ ID に変換する。表記ゆれ（全角半角・大小文字）は既存タグに寄せ、なければ作成する */
  async resolveTagIds(names: string[]): Promise<string[]> {
    const available = await tagService.getTags();
    const ids: string[] = [];
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const found = available.find((t) => normalizeTagName(t.name) === normalizeTagName(name));
      const tag = found || (await tagService.createTag(name));
      if (!found) available.push(tag);
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  },
};

type ExpressionInput = Pick<TagExpression, 'orTerms' | 'name' | 'color' | 'icon'>;

export const expressionService = {
  getAll: (): Promise<TagExpression[]> => getAllTagExpressions(),

  async create(data: ExpressionInput) {
    const now = new Date().toISOString();
    await putTagExpression({ ...data, id: newLocalId(), createdAt: now, updatedAt: now, _syncStatus: 'pending-create' });
    syncInBackground();
  },

  async update(id: string, data: Partial<ExpressionInput>) {
    const existing = await getTagExpression(id);
    if (!existing) return;
    await putTagExpression({ ...existing, ...data, updatedAt: new Date().toISOString(), _syncStatus: pendingUpdate(existing._syncStatus) });
    syncInBackground();
  },

  async delete(id: string) {
    const existing = await getTagExpression(id);
    if (!existing) return;
    if (existing._syncStatus === 'pending-create') await deleteTagExpression(id);
    else await putTagExpression({ ...existing, _syncStatus: 'pending-delete' });
    syncInBackground();
  },
};
