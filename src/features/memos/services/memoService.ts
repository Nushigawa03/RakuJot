import type { Memo } from "../types/memo";
import { tagService } from './tagService';
import { normalizeTagName } from '../utils/normalizeTagName';
import { refreshTags } from '../utils/tagUtils';
import { SETTINGS_KEY } from '../../settings/settings';
import {
  getAllMemos as localGetAllMemos,
  putMemo as localPutMemo,
  markMemoDeleted as localMarkMemoDeleted,
  getAllTrashedMemos as localGetAllTrashedMemos,
  putTrashedMemo as localPutTrashedMemo,
  deleteTrashedMemo as localDeleteTrashedMemo,
  type LocalMemo,
  type LocalTrashedMemo,
} from '../../sync/localDb';
import { performSync } from '../../sync/syncService';

export type AiResult = { title?: string; tags?: string[]; date?: string;[k: string]: any };
export type MemoPayload = { title: string; body: string; tags: string[]; date?: string };

/**
 * ローカル用 UUID を生成。
 * オフライン時のローカル保存専用。オンライン時はサーバーが正規IDを発行する。
 */
const generateId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export class MemoService {
  private basePath = '/api';

  private getPreferredGoogleApiKey(): string | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      const key = typeof parsed?.googleApiKey === 'string' ? parsed.googleApiKey.trim() : '';
      return key || undefined;
    } catch {
      return undefined;
    }
  }

  async callAi(content: string): Promise<AiResult> {
    try {
      const preferredApiKey = this.getPreferredGoogleApiKey();
      const resp = await fetch(`${this.basePath}/memos/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          ...(preferredApiKey ? { googleApiKey: preferredApiKey } : {}),
        }),
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

  /**
   * メモを作成 — ローカルDBに即座に保存、オンラインならバックグラウンド同期
   *
   * オンライン: サーバーがIDを発行し、ローカルをそのIDで更新
   * オフライン: クライアントがUUIDを生成、同期時にサーバーが正規IDに置換
   */
  async createMemo(payload: MemoPayload): Promise<{ ok: boolean; memo?: any; error?: string }> {
    const now = new Date().toISOString();
    const tempId = generateId();
    const localMemo: LocalMemo = {
      id: tempId,
      title: payload.title,
      date: payload.date || '',
      tags: payload.tags,
      body: payload.body,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'pending-create',
    };

    // ローカルDBに保存
    await localPutMemo(localMemo);

    // オンラインならサーバーにAPI送信（IDはサーバーが生成）
    if (navigator.onLine) {
      try {
        const resp = await fetch(`${this.basePath}/memos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          const serverMemo = await resp.json().catch(() => null);
          if (serverMemo?.id) {
            // サーバーが発行したIDでローカルを置換
            const { deleteMemo: localDeleteById } = await import('../../sync/localDb');
            await localDeleteById(tempId);
            await localPutMemo({
              ...localMemo,
              id: serverMemo.id,
              createdAt: serverMemo.createdAt || now,
              updatedAt: serverMemo.updatedAt || now,
              _syncStatus: 'synced',
            });
          }
          try { await refreshTags(); } catch { }
          return { ok: true, memo: serverMemo };
        }
      } catch {
        // ネットワークエラー — ローカルに保存済なので OK
      }
    }

    return { ok: true, memo: localMemo };
  }

  async createMemoWithAiSuggestions(content: string, opts?: { tagLimit?: number }): Promise<{ ok: boolean; payload?: MemoPayload; memo?: any; error?: string }> {
    try {
      const ai = await this.callAi(content);
      const fallbackTitle = content.trim().split('\n')[0].slice(0, 80) || '無題';
      const aiTags: string[] = Array.isArray(ai?.tags) ? ai.tags : [];

      const available = await tagService.getTags();
      const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

      const mapped = aiTags.map(tag => {
        const norm = normalizeTagName(tag);
        const found = normalizedAvailable.find(t => t._norm === norm);
        return found ? found.name : tag;
      }).map(t => t.trim()).filter(Boolean);

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

  async suggestForContent(content: string, opts?: { tagLimit?: number }): Promise<MemoPayload> {
    const ai = await this.callAi(content);

    const fallbackTitle = content.trim().split('\n')[0].slice(0, 80) || '無題';
    const aiTags: string[] = Array.isArray(ai?.tags) ? ai.tags : [];

    const available = await tagService.getTags();
    const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

    const mapped = aiTags.map(tag => {
      const norm = normalizeTagName(tag);
      const found = normalizedAvailable.find(t => t._norm === norm);
      return found ? found.name : tag;
    }).map(t => t.trim()).filter(Boolean);

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

  async suggestEditForContent(original: string, instruction: string, opts?: { tagLimit?: number }): Promise<MemoPayload> {
    try {
      const preferredApiKey = this.getPreferredGoogleApiKey();
      const resp = await fetch(`${this.basePath}/memos/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'edit',
          original: original || '',
          instruction: instruction || '',
          ...(preferredApiKey ? { googleApiKey: preferredApiKey } : {}),
        }),
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

      const available = await tagService.getTags();
      const normalizedAvailable = available.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));

      const mapped = aiTags.map(tag => {
        const norm = normalizeTagName(tag);
        const found = normalizedAvailable.find(t => t._norm === norm);
        return found ? found.name : tag;
      }).map(t => t.trim()).filter(Boolean);

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

  /**
   * メモ一覧取得 — ローカルDBから即座に返す
   */
  async getMemos(): Promise<Memo[]> {
    try {
      const localMemos = await localGetAllMemos();

      if (localMemos.length > 0) {
        return localMemos.map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          tags: m.tags,
          _syncStatus: m._syncStatus,
          body: m.body,
          embedding: m.embedding,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }));
      }

      // ローカルDB が空の場合はサーバーから取得（初回）
      if (navigator.onLine) {
        const r = await fetch(`${this.basePath}/memos`);
        if (!r.ok) return [];
        const d = await r.json();
        if (!Array.isArray(d)) return [];

        const memos = d.map((memo: any) => ({
          ...memo,
          _syncStatus: 'synced' as const,
          tags: Array.isArray(memo.tags)
            ? memo.tags.map((t: any) => (typeof t === 'string' ? t : t.id))
            : []
        }));

        // ローカルDBにキャッシュ
        for (const memo of memos) {
          await localPutMemo({
            ...memo,
            _syncStatus: 'synced' as const,
          });
        }

        return memos;
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * メモ更新 — ローカルDBに即座に反映、オンラインならサーバーにも送信
   */
  async updateMemo(id: string, payload: MemoPayload): Promise<{ ok: boolean; memo?: any; error?: string }> {
    const now = new Date().toISOString();

    // ローカルDBを更新
    const { getMemo: localGetMemo } = await import('../../sync/localDb');
    const existing = await localGetMemo(id);
    const updatedMemo: LocalMemo = {
      id,
      title: payload.title,
      date: payload.date || '',
      tags: payload.tags,
      body: payload.body,
      embedding: existing?.embedding,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      _syncStatus: existing?._syncStatus === 'pending-create' ? 'pending-create' : 'pending-update',
    };
    await localPutMemo(updatedMemo);

    // オンラインならサーバーにも送信
    if (navigator.onLine) {
      try {
        const resp = await fetch(`${this.basePath}/memos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (resp.ok) {
          const d = await resp.json().catch(() => null);
          // 同期済みに更新
          updatedMemo._syncStatus = 'synced';
          if (d?.updatedAt) updatedMemo.updatedAt = d.updatedAt;
          await localPutMemo(updatedMemo);
          try { await refreshTags(); } catch { }
          return { ok: true, memo: d };
        }
      } catch {
        // オフライン — ローカルに保存済み
      }
    }

    return { ok: true, memo: updatedMemo };
  }

  /**
   * メモ削除 — ローカルDBで pending-delete マーク、オンラインならサーバーにも送信
   */
  async deleteMemo(id: string): Promise<{ ok: boolean; error?: string }> {
    await localMarkMemoDeleted(id);

    if (navigator.onLine) {
      try {
        const resp = await fetch(`${this.basePath}/memos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (resp.ok) {
          // サーバーで削除成功 → ローカルも物理削除
          const { deleteMemo: localDeleteById } = await import('../../sync/localDb');
          await localDeleteById(id);
          return { ok: true };
        }
      } catch {
        // オフライン — ローカルでマーク済み
      }
    }

    return { ok: true };
  }

  async getTrashedMemos(): Promise<any[]> {
    try {
      // ローカルDBから取得
      const localTrashed = await localGetAllTrashedMemos();
      if (localTrashed.length > 0) {
        return localTrashed;
      }

      // ローカルが空ならサーバーから取得
      if (navigator.onLine) {
        const r = await fetch(`${this.basePath}/memos/trash`);
        if (!r.ok) return [];
        const d = await r.json();
        return Array.isArray(d) ? d : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async restoreMemo(originalId: string): Promise<{ ok: boolean; error?: string }> {
    if (navigator.onLine) {
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
        // 同期してローカルDBを更新
        performSync().catch(console.error);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message || '復元中にエラーが発生しました' };
      }
    }

    return { ok: false, error: 'オフライン中は復元できません' };
  }

  async permanentlyDeleteMemo(id: string): Promise<{ ok: boolean; error?: string }> {
    if (navigator.onLine) {
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
        // ローカルからも削除
        await localDeleteTrashedMemo(id);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message || '完全削除中にエラーが発生しました' };
      }
    }

    return { ok: false, error: 'オフライン中は完全削除できません' };
  }
}

export const memoService = new MemoService();
