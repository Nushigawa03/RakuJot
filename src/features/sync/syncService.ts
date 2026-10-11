/**
 * ローカル IndexedDB ↔ サーバー間の双方向同期。
 * pending な変更を送信し、返ってきたサーバーの全データでローカルを置き換える（未同期分は保護）。
 * 未ログイン時は同期せずローカルのみで動作する。
 */
import {
  getPendingMemos, getPendingTags, getPendingTagExpressions, getAllTags,
  bulkReplaceMemos, bulkReplaceTags, bulkReplaceTagExpressions, bulkReplaceTrashedMemos,
  getLastSyncAt, setLastSyncAt, setCurrentUserId, forgetStoredUserId, deleteUserDb,
  replaceMemoId, migrateAnonymousToUser, type LocalMemo,
} from './localDb';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'unauthenticated';

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine;

let state: SyncState = isOnline() ? 'idle' : 'offline';
const listeners = new Set<(s: SyncState) => void>();
const setState = (next: SyncState) => {
  state = next;
  listeners.forEach((fn) => fn(next));
};

export const getSyncState = () => state;
export const subscribeSyncState = (fn: (s: SyncState) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// ─── 認証状態 ────────────────────────────────────────
let loggedInUserId: string | null = null;

// 同時に呼ばれても匿名データの移行は1回だけ行う
let loginPromise: { userId: string; done: Promise<void> } | null = null;

export const setLoggedIn = (userId: string) => {
  if (loginPromise?.userId !== userId) {
    loggedInUserId = userId;
    setCurrentUserId(userId);
    loginPromise = {
      userId,
      done: migrateAnonymousToUser(userId)
        .catch((error) => console.error('Anonymous data migration failed:', error))
        .then(() => setState(isOnline() ? 'idle' : 'offline')),
    };
  }
  return loginPromise.done;
};

export const setLoggedOut = async () => {
  const prev = loggedInUserId;
  loggedInUserId = null;
  loginPromise = null;
  if (prev) await deleteUserDb(prev);
  setCurrentUserId(null);
  forgetStoredUserId();
  setState('unauthenticated');
};

const ensureLoggedIn = async () => {
  if (loggedInUserId) return true;
  try {
    const res = await fetch('/api/auth/me');
    const userId = res.ok ? (await res.json()).user?.id : null;
    // オンラインで未ログインと確認できたときだけ匿名 DB に戻す（オフライン起動では前回ユーザーの DB を使う）
    if (userId) await setLoggedIn(userId);
    else if (res.ok) setCurrentUserId(null);
    return Boolean(userId);
  } catch {
    return false;
  }
};

let listening = false;
const listenNetwork = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // オフライン起動後の復帰でも performSync がログイン状態を確認して同期する
  window.addEventListener('online', () => performSync().catch(console.error));
  window.addEventListener('offline', () => setState('offline'));
};

// ─── サーバーデータ → ローカル形式 ────────────────────
const toLocalMemo = (m: any): LocalMemo => ({
  id: m.id,
  title: m.title,
  date: m.date ?? undefined,
  tags: (m.tags || []).map((t: any) => (typeof t === 'string' ? t : t.id)),
  body: m.body ?? undefined,
  embedding: m.embedding,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
  _syncStatus: 'synced',
});

const applyServerData = async (data: any, idMapping: Array<{ localId: string; serverId: string }>) => {
  const memos: LocalMemo[] = (data.memos || []).map(toLocalMemo);
  await Promise.all([
    bulkReplaceMemos(memos, idMapping),
    bulkReplaceTags((data.tags || []).map((t: any) => ({ ...t, _syncStatus: 'synced' }))),
    bulkReplaceTagExpressions((data.tagExpressions || []).map((te: any) => ({ ...te, _syncStatus: 'synced' }))),
    bulkReplaceTrashedMemos(data.trashedMemos || []),
  ]);
  const byId = new Map(memos.map((m) => [m.id, m]));
  for (const { localId, serverId } of idMapping) {
    const serverMemo = byId.get(serverId);
    if (serverMemo) await replaceMemoId(localId, serverMemo);
  }
};

// ─── メイン同期処理 ──────────────────────────────────
let syncing: Promise<void> | null = null;
let queued = false;

export const performSync = async (): Promise<void> => {
  listenNetwork();
  if (!isOnline()) return setState('offline');
  if (!(await ensureLoggedIn())) return setState('unauthenticated');
  if (syncing) {
    queued = true;
    return syncing;
  }

  setState('syncing');
  syncing = (async () => {
    try {
      const [memos, tags, tagExpressions, lastSyncAt, allTags] = await Promise.all([
        getPendingMemos(), getPendingTags(), getPendingTagExpressions(), getLastSyncAt(), getAllTags(),
      ]);
      // サーバーの ensureTags はタグ名を期待する
      const tagName = new Map(allTags.map((t) => [t.id, t.name]));
      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSyncAt,
          pendingChanges: {
            memos: memos.map((m) => ({ ...m, tags: m.tags.map((id) => tagName.get(id) || id) })),
            tags,
            tagExpressions,
          },
        }),
      });

      if (resp.status === 401) {
        loggedInUserId = null;
        loginPromise = null;
        return setState('unauthenticated');
      }
      if (!resp.ok) throw new Error(`Sync failed: ${resp.status}`);

      const result = await resp.json();
      // 一部失敗してもサーバーの最新状態は反映する（失敗した変更はサーバー版に戻る）
      await applyServerData(result.serverData || {}, result.idMapping || []);
      await setLastSyncAt(result.syncedAt);
      if (result.errors?.length) {
        console.warn('Sync partially failed:', result.errors);
        setState('error');
      } else {
        setState('idle');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setState('error');
    } finally {
      syncing = null;
      if (queued) {
        queued = false;
        setTimeout(() => performSync().catch(console.error), 500);
      }
    }
  })();
  return syncing;
};

/** 変更後にバックグラウンド同期を走らせる（オフラインなら何もしない） */
export const syncInBackground = () => {
  if (isOnline()) performSync().catch(console.error);
};
