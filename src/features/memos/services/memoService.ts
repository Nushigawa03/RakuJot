import type { Memo } from "../types/memo";
import { tagService } from './tagService';
import { normalizeTagName } from '../utils/normalizeTagName';
import { refreshTags } from '../utils/tagUtils';
export type AiResult = { title?: string; tags?: string[]; date?: string;[k: string]: any };
export type MemoPayload = { title: string; body: string; tags: string[]; date?: string };

export class MemoService {
  private basePath = '/api';

  async callAi(content: string): Promise<AiResult> {
    try {
      const resp = await fetch(`${this.basePath}/memos/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!resp.ok) return {};
      try {
        return await resp.json();
      } catch {
        return {};
      }
    } catch {
      return {};
    }
  }

  async createMemo(payload: MemoPayload): Promise<{ ok: boolean; memo?: any; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || '保存に失敗しました。' };
      }
      // return created memo object when available
      const d = await resp.json().catch(() => null);
      // try to refresh tag cache so UI/components see newly created tags
      try {
        await refreshTags();
      } catch (e) {
        // don't fail memo creation if tag refresh fails
        console.warn('refreshTags failed after createMemo:', e);
      }
      return { ok: true, memo: d };
    } catch (e: any) {
      return { ok: false, error: e?.message || '保存中にエラーが発生しました' };
    }
  }

  /**
   * Build payload by calling AI, merging tags with existing tags, deduping and creating memo.
   * Returns { ok, payload, memo?, error }
   */
  async createMemoWithAiSuggestions(content: string, opts?: { tagLimit?: number }): Promise<{ ok: boolean; payload?: MemoPayload; memo?: any; error?: string }> {
    try {
      const ai = await this.callAi(content);
      const fallbackTitle = content.trim().split('\n')[0].slice(0, 80) || '無題';
      const aiTags: string[] = Array.isArray(ai?.tags) ? ai.tags : [];

      // get available tags from tagService (cached)
      const available = await tagService.getTags();
      const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

      const mapped = aiTags.map(tag => {
        const norm = normalizeTagName(tag);
        const found = normalizedAvailable.find(t => t._norm === norm);
        return found ? found.name : tag;
      }).map(t => t.trim()).filter(Boolean);

      // dedupe preserving order
      const deduped: string[] = [];
      const seen = new Set<string>();
      for (const t of mapped) {
        const lower = normalizeTagName(t);
        if (!seen.has(lower)) {
          seen.add(lower);
          deduped.push(t);
        }
      }

      const tagLimit = opts?.tagLimit ?? 10;
      const finalTags = deduped.slice(0, tagLimit);

      const payload: MemoPayload = {
        title: ai?.title || fallbackTitle,
        body: content.trim(),
        tags: finalTags,
        date: ai?.date || '',
      };

      const res = await this.createMemo(payload);
      if (!res.ok) {
        return { ok: false, error: res.error || '保存に失敗しました' };
      }

      return { ok: true, payload, memo: res.memo };
    } catch (e: any) {
      return { ok: false, error: e?.message || '作成中にエラーが発生しました' };
    }
  }

  /**
   * Generate suggestion by calling AI and mapping tags to available tags.
   * Does NOT create a memo, only returns a suggested payload.
   */
  async suggestForContent(content: string, opts?: { tagLimit?: number }): Promise<MemoPayload> {
    // call AI service
    const ai = await this.callAi(content);

    const fallbackTitle = content.trim().split('\n')[0].slice(0, 80) || '無題';
    const aiTags: string[] = Array.isArray(ai?.tags) ? ai.tags : [];

    // get available tags from tagService (cached)
    const available = await tagService.getTags();
    const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

    const mapped = aiTags.map(tag => {
      const norm = normalizeTagName(tag);
      const found = normalizedAvailable.find(t => t._norm === norm);
      return found ? found.name : tag;
    }).map(t => t.trim()).filter(Boolean);

    // dedupe preserving order
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const t of mapped) {
      const lower = normalizeTagName(t);
      if (!seen.has(lower)) {
        seen.add(lower);
        deduped.push(t);
      }
    }

    const tagLimit = opts?.tagLimit ?? 10;
    const finalTags = deduped.slice(0, tagLimit);

    const payload: MemoPayload = {
      title: ai?.title || fallbackTitle,
      body: content.trim(),
      tags: finalTags,
      date: ai?.date || '',
    };

    return payload;
  }

  /**
   * Given an original memo content and a short edit instruction (quick edit),
   * request AI to produce a suggested payload that applies the instruction
   * to the original. Returns a suggested MemoPayload but does NOT create a memo.
   */
  async suggestEditForContent(original: string, instruction: string, opts?: { tagLimit?: number }): Promise<MemoPayload> {
    try {
      const resp = await fetch(`${this.basePath}/memos/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'edit', original: original || '', instruction: instruction || '' }),
      });
      let ai: AiResult & { body?: string } = {};
      if (resp.ok) {
        try {
          ai = await resp.json();
        } catch {
          ai = {};
        }
      }

      const fallbackTitle = original.trim().split('\n')[0].slice(0, 80) || '無題';
      const aiTags: string[] = Array.isArray(ai?.tags) ? ai.tags : [];

      // get available tags from tagService (cached)
      const available = await tagService.getTags();
      const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

      const mapped = aiTags.map(tag => {
        const norm = normalizeTagName(tag);
        const found = normalizedAvailable.find(t => t._norm === norm);
        return found ? found.name : tag;
      }).map(t => t.trim()).filter(Boolean);

      // dedupe preserving order
      const deduped: string[] = [];
      const seen = new Set<string>();
      for (const t of mapped) {
        const lower = normalizeTagName(t);
        if (!seen.has(lower)) {
          seen.add(lower);
          deduped.push(t);
        }
      }

      const tagLimit = opts?.tagLimit ?? 10;
      const finalTags = deduped.slice(0, tagLimit);

      const payload: MemoPayload = {
        title: ai?.title || fallbackTitle,
        body: ai?.body || original.trim(),
        tags: finalTags,
        date: ai?.date || '',
      };

      return payload;
    } catch (e: any) {
      return { title: original || '', body: original || '', tags: [], date: '' };
    }
  }

  async getMemos(): Promise<Memo[]> {
    try {
      const r = await fetch(`${this.basePath}/memos`);
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }

  async updateMemo(id: string, payload: MemoPayload): Promise<{ ok: boolean; memo?: any; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/memos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || '更新に失敗しました。' };
      }
      const d = await resp.json().catch(() => null);
      try {
        await refreshTags();
      } catch (e) {
        console.warn('refreshTags failed after updateMemo:', e);
      }
      return { ok: true, memo: d };
    } catch (e: any) {
      return { ok: false, error: e?.message || '更新中にエラーが発生しました' };
    }
  }

  async deleteMemo(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/memos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || '削除に失敗しました。' };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || '削除中にエラーが発生しました' };
    }
  }

  async getTrashedMemos(): Promise<any[]> {
    try {
      const r = await fetch(`${this.basePath}/memos/trash`);
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }

  async restoreMemo(originalId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/memos/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalId, action: 'restore' }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || '復元に失敗しました。' };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || '復元中にエラーが発生しました' };
    }
  }

  async permanentlyDeleteMemo(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch(`${this.basePath}/memos/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'permanent-delete' }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err?.error || '完全削除に失敗しました。' };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || '完全削除中にエラーが発生しました' };
    }
  }
}

export const memoService = new MemoService();
