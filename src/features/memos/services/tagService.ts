import {
  getAllTags as localGetAllTags,
  putTag as localPutTag,
  type LocalTag,
} from '../../sync/localDb';

export type Tag = { id: string; name: string };

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
        this.cachedTags = localTags.map(t => ({ id: t.id, name: t.name }));
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

    // オンラインならサーバーにも送信
    if (navigator.onLine) {
      try {
        const resp = await fetch(`${this.basePath}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });
        if (resp.ok) {
          const d = await resp.json();
          const serverTag = d?.tag ? { id: d.tag.id, name: d.tag.name } : undefined;
          if (serverTag) {
            // サーバーのIDでローカルを更新
            const { deleteTag: localDeleteById } = await import('../../sync/localDb');
            await localDeleteById(localTag.id);
            await localPutTag({
              id: serverTag.id,
              name: serverTag.name,
              _syncStatus: 'synced',
            });
            this.clearCache();
            return { ok: true, tag: serverTag };
          }
        }
      } catch {
        // オフライン — ローカルに保存済み
      }
    }

    return { ok: true, tag: { id: localTag.id, name: localTag.name } };
  }
}

export const tagService = new TagService();
