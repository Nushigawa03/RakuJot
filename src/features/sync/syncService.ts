/**
 * 同期サービス
 * ローカル IndexedDB ↔ クラウド PostgreSQL 間の双方向同期
 *
 * 戦略:
 * - オフライン時: ローカルDBに pending-* で書き込み
 * - オンライン復帰時: pending changes をサーバーに送信 → サーバーの全データで上書き
 * - 競合解決: Last-Write-Wins (updatedAt ベース)
 */

import {
  getPendingMemos,
  getPendingTags,
  getPendingTagExpressions,
  bulkReplaceMemos,
  bulkReplaceTags,
  bulkReplaceTagExpressions,
  bulkReplaceTrashedMemos,
  getLastSyncAt,
  setLastSyncAt,
  type LocalMemo,
  type LocalTag,
  type LocalTagExpression,
  type LocalTrashedMemo,
} from './localDb';

// ─── 同期状態 ────────────────────────────────────────
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

type SyncListener = (state: SyncState) => void;

let currentState: SyncState = navigator.onLine ? 'idle' : 'offline';
const listeners = new Set<SyncListener>();

const setState = (newState: SyncState) => {
  currentState = newState;
  listeners.forEach((fn) => fn(newState));
};

export const getSyncState = (): SyncState => currentState;

export const subscribeSyncState = (fn: SyncListener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// ─── ネットワーク監視 ────────────────────────────────
let initialized = false;

export const initSyncListeners = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    setState('idle');
    // オンライン復帰時に自動同期
    performSync().catch(console.error);
  });

  window.addEventListener('offline', () => {
    setState('offline');
  });
};

// ─── 同期ロック ──────────────────────────────────────
let syncing = false;

// ─── メイン同期処理 ──────────────────────────────────
export const performSync = async (): Promise<void> => {
  if (!navigator.onLine) {
    setState('offline');
    return;
  }

  if (syncing) return; // 二重実行防止
  syncing = true;

  setState('syncing');

  try {
    // 1. ローカルの pending changes を収集
    const [pendingMemos, pendingTags, pendingTagExpressions] = await Promise.all([
      getPendingMemos(),
      getPendingTags(),
      getPendingTagExpressions(),
    ]);

    const lastSyncAt = await getLastSyncAt();

    // 2. サーバーに同期リクエスト送信
    const resp = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastSyncAt,
        pendingChanges: {
          memos: pendingMemos,
          tags: pendingTags,
          tagExpressions: pendingTagExpressions,
          trashedMemos: [], // トラッシュはサーバーが管理
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Sync failed: ${resp.status}`);
    }

    const result = await resp.json();

    // 3. サーバーの全データでローカルを上書き
    if (result.serverData) {
      const { memos, tags, tagExpressions, trashedMemos } = result.serverData;

      await Promise.all([
        bulkReplaceMemos(
          (memos || []).map((m: any): LocalMemo => ({
            id: m.id,
            title: m.title,
            date: m.date,
            tags: Array.isArray(m.tags) ? m.tags.map((t: any) => typeof t === 'string' ? t : t.id) : [],
            body: m.body,
            embedding: m.embedding,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            _syncStatus: 'synced',
          }))
        ),
        bulkReplaceTags(
          (tags || []).map((t: any): LocalTag => ({
            id: t.id,
            name: t.name,
            description: t.description,
            _syncStatus: 'synced',
          }))
        ),
        bulkReplaceTagExpressions(
          (tagExpressions || []).map((te: any): LocalTagExpression => ({
            id: te.id,
            orTerms: te.orTerms,
            name: te.name,
            color: te.color,
            icon: te.icon,
            createdAt: te.createdAt,
            updatedAt: te.updatedAt,
            _syncStatus: 'synced',
          }))
        ),
        bulkReplaceTrashedMemos(
          (trashedMemos || []).map((tm: any): LocalTrashedMemo => ({
            id: tm.id,
            originalId: tm.originalId,
            title: tm.title,
            date: tm.date,
            tagNames: tm.tagNames || [],
            body: tm.body,
            embedding: tm.embedding,
            createdAt: tm.createdAt,
            updatedAt: tm.updatedAt,
            deletedAt: tm.deletedAt,
            _syncStatus: 'synced',
          }))
        ),
      ]);

      // 4. 最終同期日時を更新
      await setLastSyncAt(result.syncedAt);
    }

    setState('idle');
  } catch (error) {
    console.error('Sync error:', error);
    setState('error');
  } finally {
    syncing = false;
  }
};

/**
 * 初期同期（アプリ起動時）
 */
export const initialSync = async (): Promise<void> => {
  initSyncListeners();
  if (navigator.onLine) {
    await performSync();
  } else {
    setState('offline');
  }
};
