/**
 * メモのローカルファースト CRUD と AI 呼び出し。
 * 書き込みは IndexedDB に即時反映し、オンラインならバックグラウンドで同期する。
 */
import type { Memo } from '../types/memo';
import type { TrashedMemo } from '../types/trashedMemo';
import { tagService } from './tagService';
import { normalizeTagName } from '../utils/normalizeTagName';
import { todayString } from '../utils/dateUtils';
import { getSettings } from '../../settings/useSettings';
import {
  getAllMemos, getMemo, putMemo, markMemoDeleted, getCanonicalMemoId,
  getAllTrashedMemos, deleteTrashedMemo, type LocalMemo,
} from '../../sync/localDb';
import { performSync, syncInBackground } from '../../sync/syncService';

export type MemoPayload = { title: string; body: string; tags: string[]; date?: string };
type AiResult = { title?: string; body?: string; tags?: string[]; date?: string | null };
type Result = { ok: boolean; error?: string };

const TRASH_RETENTION_DAYS = 30;
const EMBEDDING_DIMENSIONS = 256;

/** ローカル用 UUID（randomUUID が使えない非セキュアコンテキストでも動くように自前生成） */
const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const firstLine = (text: string) => text.trim().split('\n')[0].slice(0, 80) || '無題';

export class MemoService {
  private embeddingAttempts = new Set<string>();

  /** AI 機能がオフ、または失敗したときは空オブジェクト */
  private async callAi(body: Record<string, string>): Promise<AiResult> {
    const { aiUsageEnabled, googleApiKey } = getSettings();
    if (!aiUsageEnabled) return {};
    try {
      const resp = await fetch('/api/memos/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ...(googleApiKey.trim() ? { googleApiKey: googleApiKey.trim() } : {}) }),
      });
      return resp.ok ? await resp.json() : {};
    } catch {
      return {};
    }
  }

  /** AI が返したタグ名を既存タグの表記に寄せ、重複を除いて上限件数に切る */
  private async normalizeAiTags(aiTags: unknown, limit = 10): Promise<string[]> {
    if (!Array.isArray(aiTags)) return [];
    const available = await tagService.getTags();
    const result: string[] = [];
    for (const raw of aiTags.map(String)) {
      const name = (available.find((t) => normalizeTagName(t.name) === normalizeTagName(raw))?.name || raw).trim();
      if (name && !result.some((t) => normalizeTagName(t) === normalizeTagName(name))) result.push(name);
    }
    return result.slice(0, limit);
  }

  /** 日付（の曖昧な表現）を端末内モデルで埋め込み、ローカルに保存する。1メモ1日付につき1回だけ試みる */
  private refreshEmbedding(memo: LocalMemo) {
    const text = (memo.date || '').trim();
    const key = `${memo.id}:${text}`;
    if (import.meta.env.SSR || typeof window === 'undefined' || !text || this.embeddingAttempts.has(key)) return;
    this.embeddingAttempts.add(key);
    import('../../App/services/browserEmbeddingService')
      .then(({ computeBrowserEmbedding }) => computeBrowserEmbedding(text, 'document'))
      .then(async (embedding) => {
        const latest = embedding && (await getMemo(memo.id));
        if (latest && latest.date === memo.date) await putMemo({ ...latest, embedding });
      })
      .catch((error) => console.warn('[memoService] local embedding refresh failed:', error));
  }

  /** ローカルのメモ一覧。埋め込みが未計算のメモを少しずつ補完する */
  async getMemos(): Promise<LocalMemo[]> {
    const memos = await getAllMemos();
    memos
      .filter((m) => m.date?.trim() && !this.embeddingAttempts.has(`${m.id}:${m.date.trim()}`))
      .filter((m) => !Array.isArray(m.embedding) || m.embedding.length !== EMBEDDING_DIMENSIONS)
      .slice(0, 3)
      .forEach((m) => this.refreshEmbedding(m));
    return memos;
  }

  async createMemo(payload: MemoPayload): Promise<Result & { memo?: Memo }> {
    const now = new Date().toISOString();
    const memo: LocalMemo = {
      id: generateId(),
      title: payload.title,
      date: payload.date || todayString(),
      tags: await tagService.resolveTagIds(payload.tags),
      body: payload.body,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'pending-create',
    };
    await putMemo(memo);
    this.refreshEmbedding(memo);
    syncInBackground();
    return { ok: true, memo };
  }

  /**
   * 本文だけから AI でタイトル・タグ・日付を推定して作成する（AI が使えなければ1行目と今日の日付）。
   * extraTags（選択中の分類のタグなど）は AI の推定に加えて必ずつける。
   */
  async createMemoWithAiSuggestions(content: string, opts: { tagLimit?: number; extraTags?: string[] } = {}): Promise<Result & { memo?: Memo }> {
    try {
      const ai = await this.callAi({ content: content.trim() });
      return await this.createMemo({
        title: ai.title || firstLine(content),
        body: content.trim(),
        tags: [...(opts.extraTags ?? []), ...(await this.normalizeAiTags(ai.tags, opts.tagLimit))],
        date: ai.date || todayString(),
      });
    } catch (e: any) {
      return { ok: false, error: e?.message || '作成中にエラーが発生しました' };
    }
  }

  /** 編集指示を AI に適用した提案を返す。AI が使えない・失敗したときは null */
  async suggestEdit(original: string, instruction: string): Promise<MemoPayload | null> {
    const ai = await this.callAi({ mode: 'edit', original, instruction });
    if (!ai.title && !ai.body) return null;
    return {
      title: ai.title || firstLine(original),
      body: ai.body || original.trim(),
      tags: await this.normalizeAiTags(ai.tags),
      date: ai.date || '',
    };
  }

  async updateMemo(id: string, payload: MemoPayload): Promise<Result & { memo?: Memo }> {
    const canonicalId = await getCanonicalMemoId(id);
    const existing = await getMemo(canonicalId);
    // 削除済み（または他端末で削除された）メモへの保存で復活させない
    if (!existing || existing._syncStatus === 'pending-delete') return { ok: false, error: 'このメモは削除されています' };
    const date = payload.date || '';
    const memo: LocalMemo = {
      id: canonicalId,
      title: payload.title,
      date,
      tags: await tagService.resolveTagIds(payload.tags),
      body: payload.body,
      embedding: existing.date === date ? existing.embedding : undefined,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      _syncStatus: existing._syncStatus === 'pending-create' ? 'pending-create' : 'pending-update',
    };
    await putMemo(memo);
    this.refreshEmbedding(memo);
    syncInBackground();
    return { ok: true, memo };
  }

  /** ゴミ箱への移動は同期時にサーバーが行う */
  async deleteMemo(id: string): Promise<Result> {
    await markMemoDeleted(await getCanonicalMemoId(id));
    syncInBackground();
    return { ok: true };
  }

  /** 保持期限（30日）を過ぎたものは表示しない（サーバー側でも同期時に削除される） */
  async getTrashedMemos(): Promise<TrashedMemo[]> {
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86_400_000;
    return (await getAllTrashedMemos())
      .filter((m) => new Date(m.deletedAt).getTime() >= cutoff)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  private async trashAction(body: Record<string, string>, failure: string): Promise<Result> {
    if (!navigator.onLine) return { ok: false, error: 'オフライン中は操作できません' };
    try {
      const resp = await fetch('/api/memos/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { ok: false, error: (await resp.json().catch(() => ({})))?.error || failure };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || failure };
    }
  }

  async restoreMemo(originalId: string): Promise<Result> {
    const result = await this.trashAction({ originalId, action: 'restore' }, '復元に失敗しました。');
    if (result.ok) await performSync().catch(console.error);
    return result;
  }

  async permanentlyDeleteMemo(id: string): Promise<Result> {
    const result = await this.trashAction({ id, action: 'permanent-delete' }, '完全削除に失敗しました。');
    if (result.ok) await deleteTrashedMemo(id);
    return result;
  }
}

export const memoService = new MemoService();
