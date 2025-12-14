export type Tag = { id: string; name: string };

export class TagService {
  private basePath = '/api';
  private cachedTags: Tag[] | null = null;

  async getTags(): Promise<Tag[]> {
    if (this.cachedTags) return this.cachedTags;
    try {
      const r = await fetch(`${this.basePath}/tags`);
      if (!r.ok) return (this.cachedTags = []);
      const d = await r.json();
      this.cachedTags = Array.isArray(d) ? d : [];
      return this.cachedTags;
    } catch {
      return (this.cachedTags = []);
    }
  }

  clearCache() {
    this.cachedTags = null;
  }

  async createTag(name: string, description?: string): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || 'タグの作成に失敗しました' };
      }
      const d = await resp.json();
      const tag = d?.tag ? { id: d.tag.id, name: d.tag.name } : undefined;
      // invalidate cache so subsequent getTags gets fresh data
      this.clearCache();
      return { ok: true, tag };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'タグ作成中にエラーが発生しました' };
    }
  }
}

export const tagService = new TagService();
