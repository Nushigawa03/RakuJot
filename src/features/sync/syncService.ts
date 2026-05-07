/**
 * 同期サービス
 * ローカル IndexedDB ↔ クラウド PostgreSQL 間の双方向同期
 *
 * 戦略:
 * - オフライン時: ローカルDBに pending-* で書き込み
 * - オンライン復帰時: pending changes をサーバーに送信 → サーバーの全データで上書き
 * - 競合解決: Last-Write-Wins (updatedAt ベース)
 * - 未ログイン時: 同期をスキップ（ローカルのみで動作）
 */

import {
  getPendingMemos,
  getPendingTags,
  getPendingTagExpressions,
  getAllTags,
  bulkReplaceMemos,
  bulkReplaceTags,
  bulkReplaceTagExpressions,
  bulkReplaceTrashedMemos,
  getLastSyncAt,
  setLastSyncAt,
  setCurrentUserId,
  getCurrentUserId,
  deleteUserDb,
  migrateAnonymousToUser,
  clearAnonymousData,
  type LocalMemo,
  type LocalTag,
  type LocalTagExpression,
  type LocalTrashedMemo,
} from './localDb';

// ─── 同期状態 ────────────────────────────────────────
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'unauthenticated';

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

// ─── 認証状態 ────────────────────────────────────────
let loggedInUserId: string | null = null;

/**
 * ログイン状態の設定
 * ログイン後に呼び出して、ユーザーDBを使う
 */
export const setLoggedIn = async (userId: string): Promise<void> => {
  loggedInUserId = userId;
  setCurrentUserId(userId);

  // 匿名DBからデータを移行
  const migrated = await migrateAnonymousToUser(userId);
  if (migrated) {
    console.log('[sync] Migrated anonymous data to user DB');
  }

  // DBがユーザーのものに切り替わったので状態リセット
  setState(navigator.onLine ? 'idle' : 'offline');
};

/**
 * ログアウト状態の設定
 * ユーザーDBを削除して匿名DBに戻す
 */
export const setLoggedOut = async (): Promise<void> => {
  const prevUserId = loggedInUserId;
  loggedInUserId = null;

  // ユーザーDBを削除
  if (prevUserId) {
    await deleteUserDb(prevUserId);
  }

  // 匿名DBに切り替え
  setCurrentUserId(null);
  setState('unauthenticated');
};

export const isLoggedIn = (): boolean => loggedInUserId !== null;

// ─── ネットワーク監視 ────────────────────────────────
let initialized = false;

export const initSyncListeners = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    if (loggedInUserId) {
      setState('idle');
      // オンライン復帰時に自動同期
      performSync().catch(console.error);
    } else {
      // 未ログインでもofflineからは脱出
      setState('unauthenticated');
    }
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

  // 未ログイン時は同期をスキップ
  if (!loggedInUserId) {
    setState('unauthenticated');
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

    // pendingMemos のタグIDをタグ名に変換（サーバーの ensureTags は名前を期待する）
    const allTags = await getAllTags();
    const tagIdToName = new Map(allTags.map(t => [t.id, t.name]));

    const memosForSync = pendingMemos.map(m => ({
      ...m,
      tags: (m.tags || []).map(tagId => tagIdToName.get(tagId) || tagId),
    }));

    // 2. サーバーに同期リクエスト送信
    const resp = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastSyncAt,
        pendingChanges: {
          memos: memosForSync,
          tags: pendingTags,
          tagExpressions: pendingTagExpressions,
          trashedMemos: [], // トラッシュはサーバーが管理
        },
      }),
    });

    // 401 = セッション切れ
    if (resp.status === 401) {
      loggedInUserId = null;
      setState('unauthenticated');
      return;
    }

    if (!resp.ok) {
      throw new Error(`Sync failed: ${resp.status}`);
    }

    const result = await resp.json();

    // 3. サーバーの全データでローカルを上書き（pending保護あり）
    if (result.serverData) {
      const { memos, tags, tagExpressions, trashedMemos } = result.serverData;

      // idMapping を使ってローカルのtempIDメモを事前に削除
      // これにより bulkReplaceMemos でpending保護されるのは新規作成のみ
      const idMapping: Array<{ localId: string; serverId: string }> = result.idMapping || [];
      if (idMapping.length > 0) {
        const { deleteMemo: localDeleteById } = await import('./localDb');
        for (const mapping of idMapping) {
          await localDeleteById(mapping.localId);
        }
      }

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

      // 5. IDマッピングがあれば UI に通知（MemoList がリフレッシュできるように）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('syncComplete', { detail: { idMapping } })
        );
      }
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
 * 必ず認証確認後に呼ぶこと
 */
export const initialSync = async (): Promise<void> => {
  initSyncListeners();

  if (!loggedInUserId) {
    setState(navigator.onLine ? 'unauthenticated' : 'offline');
    return;
  }

  if (navigator.onLine) {
    await performSync();
  } else {
    setState('offline');
  }
};
