import type { Memo } from "../types/memo";
import { tagService } from './tagService';
import { normalizeTagName } from '../utils/normalizeTagName';
export type AiResult = { title?: string; tags?: string[]; date?: string; [k: string]: any };
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
}

export const memoService = new MemoService();
