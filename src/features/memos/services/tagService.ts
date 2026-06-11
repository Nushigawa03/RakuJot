import {
  getAllTags as localGetAllTags,
  putTag as localPutTag,
  markTagDeleted as localMarkTagDeleted,
  type LocalTag,
} from '../../sync/localDb';
import { performSync } from '../../sync/syncService';

export type Tag = { id: string; name: string; description?: string };

/**
 * ローカルID生成
 */
const generateLocalId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `local_${timestamp}_${randomPart}`;
};

export class TagService {
  private basePath = '/api';
  private cachedTags: Tag[] | null = null;

  /**
   * タグ一覧取得 — ローカルDB優先
   */
  async getTags(): Promise<Tag[]> {
    if (this.cachedTags) return this.cachedTags;

    try {
      // ローカルDBから取得
      const localTags = await localGetAllTags();
      if (localTags.length > 0) {
        this.cachedTags = localTags.map(t => ({ id: t.id, name: t.name, description: t.description }));
        return this.cachedTags;
      }

      // ローカルが空ならサーバーから取得（初回）
      if (navigator.onLine) {
        const r = await fetch(`${this.basePath}/tags`);
        if (!r.ok) return (this.cachedTags = []);
        const d = await r.json();
        this.cachedTags = Array.isArray(d) ? d : [];

        // ローカルDBにキャッシュ
        for (const tag of this.cachedTags) {
          await localPutTag({
            id: tag.id,
            name: tag.name,
            description: tag.description,
            _syncStatus: 'synced',
          });
        }

        return this.cachedTags;
      }

      return (this.cachedTags = []);
    } catch {
      return (this.cachedTags = []);
    }
  }

  clearCache() {
    this.cachedTags = null;
  }

  /**
   * タグ作成 — ローカルDBに即座に保存
   */
  async createTag(name: string, description?: string): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
    const localTag: LocalTag = {
      id: generateLocalId(),
      name,
      description,
      _syncStatus: 'pending-create',
    };

    // ローカルDBに保存
    await localPutTag(localTag);
    this.clearCache();

    // オンラインなら同期サービスに任せる。通常API直叩きと二重化しない。
    if (navigator.onLine) {
      performSync().catch(console.error);
    }

    return { ok: true, tag: { id: localTag.id, name: localTag.name, description: localTag.description } };
  }

  async updateTag(id: string, data: { name?: string; description?: string }): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
    const existing = (await localGetAllTags()).find((tag) => tag.id === id);
    if (!existing) {
      return { ok: false, error: 'タグが見つかりません' };
    }

    const updated: LocalTag = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      _syncStatus: existing._syncStatus === 'pending-create' ? 'pending-create' : 'pending-update',
    };

    await localPutTag(updated);
    this.clearCache();

    if (navigator.onLine) {
      performSync().catch(console.error);
    }

    return { ok: true, tag: { id: updated.id, name: updated.name, description: updated.description } };
  }

  async deleteTag(id: string): Promise<{ ok: boolean; error?: string }> {
    await localMarkTagDeleted(id);
    this.clearCache();

    if (navigator.onLine) {
      performSync().catch(console.error);
    }

    return { ok: true };
  }
}

export const tagService = new TagService();
