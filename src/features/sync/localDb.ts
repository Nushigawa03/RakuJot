/**
 * IndexedDB ローカルデータベース（ユーザーごとに rakujot-{userId} / rakujot-anonymous）。
 * 書き込みのたびに subscribeLocalDb の購読者へ通知し、UI はそれを合図に再読込する。
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TagExpressionTerm } from '../memos/types/tagExpressions';
import type { TrashedMemo } from '../memos/types/trashedMemo';

export type SyncStatus = 'synced' | 'pending-create' | 'pending-update' | 'pending-delete';

export interface LocalMemo {
  id: string;
  title: string;
  date?: string;
  tags: string[]; // tag ID の配列
  body?: string;
  embedding?: number[] | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
}

export interface LocalTag {
  id: string;
  name: string;
  description?: string;
  _syncStatus: SyncStatus;
}

export interface LocalTagExpression {
  id: string;
  orTerms: TagExpressionTerm[];
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _syncStatus: SyncStatus;
}

type LocalTrashedMemo = TrashedMemo;

interface RakuJotDB extends DBSchema {
  memos: { key: string; value: LocalMemo; indexes: { 'by-sync-status': SyncStatus } };
  tags: { key: string; value: LocalTag; indexes: { 'by-sync-status': SyncStatus } };
  tagExpressions: { key: string; value: LocalTagExpression; indexes: { 'by-sync-status': SyncStatus } };
  trashedMemos: { key: string; value: LocalTrashedMemo };
  syncMeta: { key: string; value: { key: string; value: string } };
}

type SyncedStore = 'memos' | 'tags' | 'tagExpressions';
const ALL_STORES = ['memos', 'tags', 'tagExpressions', 'trashedMemos', 'syncMeta'] as const;
const ANONYMOUS = 'anonymous';
const LAST_USER_ID_KEY = 'rakujot:last-user-id';
const MEMO_ID_ALIASES_KEY = 'memoIdAliases';

// ─── 変更通知 ─────────────────────────────────────────
const listeners = new Set<() => void>();
let notifyScheduled = false;

export const subscribeLocalDb = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emitChange = () => {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    listeners.forEach((fn) => fn());
  });
};

// ─── ユーザー管理 ────────────────────────────────────
const storage = {
  get: () => { try { return localStorage.getItem(LAST_USER_ID_KEY); } catch { return null; } },
  set: (id: string | null) => {
    try { id ? localStorage.setItem(LAST_USER_ID_KEY, id) : localStorage.removeItem(LAST_USER_ID_KEY); } catch { /* private mode */ }
  },
};

let currentUserId = (typeof localStorage !== 'undefined' && storage.get()) || ANONYMOUS;
const dbInstances = new Map<string, IDBPDatabase<RakuJotDB>>();

export const setCurrentUserId = (userId: string | null): void => {
  const next = userId || ANONYMOUS;
  if (userId) storage.set(userId);
  if (currentUserId !== next) {
    currentUserId = next;
    emitChange();
  }
};

export const forgetStoredUserId = (): void => storage.set(null);

const dbName = (userId: string) => `rakujot-${userId}`;

const openUserDb = (userId: string) =>
  openDB<RakuJotDB>(dbName(userId), 1, {
    upgrade(db) {
      db.createObjectStore('memos', { keyPath: 'id' }).createIndex('by-sync-status', '_syncStatus');
      db.createObjectStore('tags', { keyPath: 'id' }).createIndex('by-sync-status', '_syncStatus');
      db.createObjectStore('tagExpressions', { keyPath: 'id' }).createIndex('by-sync-status', '_syncStatus');
      db.createObjectStore('trashedMemos', { keyPath: 'id' });
      db.createObjectStore('syncMeta', { keyPath: 'key' });
    },
  });

const getDbFor = async (userId: string) => {
  let db = dbInstances.get(userId);
  if (!db) {
    db = await openUserDb(userId);
    dbInstances.set(userId, db);
  }
  return db;
};

const getDb = () => getDbFor(currentUserId);

const closeDb = (userId: string) => {
  dbInstances.get(userId)?.close();
  dbInstances.delete(userId);
};

// ─── 汎用ヘルパー ─────────────────────────────────────
const getActive = async <S extends SyncedStore>(store: S) =>
  (await (await getDb()).getAll(store)).filter((r) => r._syncStatus !== 'pending-delete') as RakuJotDB[S]['value'][];

const getPending = async <S extends SyncedStore>(store: S) =>
  (await (await getDb()).getAll(store)).filter((r) => r._syncStatus !== 'synced') as RakuJotDB[S]['value'][];

const put = async <S extends (typeof ALL_STORES)[number]>(store: S, value: RakuJotDB[S]['value']) => {
  await (await getDb()).put(store, value as never);
  emitChange();
};

const remove = async (store: (typeof ALL_STORES)[number], id: string) => {
  await (await getDb()).delete(store, id);
  emitChange();
};

/** 同期済みデータで置き換えつつ、keep が真を返す未同期レコードは残す */
const replaceKeepingPending = async <S extends SyncedStore>(
  store: S,
  records: RakuJotDB[S]['value'][],
  keep: (pending: RakuJotDB[S]['value']) => boolean,
  transform: (record: RakuJotDB[S]['value'], existing: Map<string, RakuJotDB[S]['value']>) => RakuJotDB[S]['value'] = (r) => r,
) => {
  const tx = (await getDb()).transaction(store, 'readwrite');
  const existing = (await tx.store.getAll()) as RakuJotDB[S]['value'][];
  const existingById = new Map(existing.map((r) => [r.id, r]));
  await tx.store.clear();
  for (const record of records) await tx.store.put(transform(record, existingById) as never);
  for (const pending of existing) {
    if (pending._syncStatus !== 'synced' && keep(pending)) await tx.store.put(pending as never);
  }
  await tx.done;
  emitChange();
};

const isNewer = (a: string, b: string) => {
  const [ta, tb] = [new Date(a).getTime(), new Date(b).getTime()];
  return Number.isFinite(ta) && Number.isFinite(tb) ? ta > tb : a > b;
};

const hasEmbedding = (m: LocalMemo) => Array.isArray(m.embedding) && m.embedding.length > 0;

// ─── Memo ────────────────────────────────────────────
export const getAllMemos = () => getActive('memos');
export const getPendingMemos = () => getPending('memos');
export const getMemo = async (id: string) => (await getDb()).get('memos', id);
export const putMemo = (memo: LocalMemo) => put('memos', memo);

export const markMemoDeleted = async (id: string) => {
  const memo = await getMemo(id);
  if (memo) await putMemo({ ...memo, _syncStatus: 'pending-delete' });
};

/** pending-create のメモがサーバーで採番されたとき、ローカル ID を正式 ID に置き換える */
export const replaceMemoId = async (localId: string, serverMemo: LocalMemo) => {
  const tx = (await getDb()).transaction('memos', 'readwrite');
  const local = await tx.store.get(localId);
  const existingServer = (await tx.store.get(serverMemo.id)) || serverMemo;
  await tx.store.delete(localId);

  if (local?._syncStatus === 'pending-delete') {
    await tx.store.put({ ...existingServer, _syncStatus: 'pending-delete' });
  } else if (local && isNewer(local.updatedAt, serverMemo.updatedAt)) {
    await tx.store.put({
      ...local,
      id: serverMemo.id,
      createdAt: serverMemo.createdAt || local.createdAt,
      _syncStatus: 'pending-update',
    });
  } else {
    await tx.store.put(existingServer);
  }
  await tx.done;
  await rememberMemoIdAlias(localId, serverMemo.id);
  emitChange();
};

/**
 * サーバーの全メモでローカルを置き換える。未同期の変更は保護する:
 * - サーバーにない pending → まだ未同期なので残す（pending-delete は反映済みなので捨てる）
 * - サーバーより新しい pending → 同期中の再編集なので残す
 * サーバー側に埋め込みがなく、日付が変わっていなければローカルの埋め込みを引き継ぐ。
 */
export const bulkReplaceMemos = async (
  memos: LocalMemo[],
  idMapping: Array<{ localId: string; serverId: string }> = [],
) => {
  const serverById = new Map(memos.map((m) => [m.id, m]));
  const mapped = new Map(idMapping.map((m) => [m.localId, m.serverId]));
  await replaceKeepingPending(
    'memos',
    memos,
    (pending) => {
      const server = serverById.get(mapped.get(pending.id) || pending.id);
      if (pending._syncStatus === 'pending-delete') return Boolean(server);
      return !server || isNewer(pending.updatedAt, server.updatedAt);
    },
    (memo, existing) => {
      const local = existing.get(memo.id);
      return !hasEmbedding(memo) && local && hasEmbedding(local) && local.date === memo.date
        ? { ...memo, embedding: local.embedding }
        : memo;
    },
  );
};

// ─── Tag / TagExpression / Trash ─────────────────────
export const getAllTags = () => getActive('tags');
export const getPendingTags = () => getPending('tags');
export const putTag = (tag: LocalTag) => put('tags', tag);

export const markTagDeleted = async (id: string) => {
  const tag = await (await getDb()).get('tags', id);
  if (!tag) return;
  if (tag._syncStatus === 'pending-create') await remove('tags', id);
  else await putTag({ ...tag, _syncStatus: 'pending-delete' });
};

export const bulkReplaceTags = (tags: LocalTag[]) =>
  replaceKeepingPending('tags', tags, (pending) =>
    !tags.some((t) => t.id === pending.id || (pending._syncStatus === 'pending-create' && t.name === pending.name)));

export const getAllTagExpressions = () => getActive('tagExpressions');
export const getPendingTagExpressions = () => getPending('tagExpressions');
export const putTagExpression = (te: LocalTagExpression) => put('tagExpressions', te);
export const getTagExpression = async (id: string) => (await getDb()).get('tagExpressions', id);
export const deleteTagExpression = (id: string) => remove('tagExpressions', id);

export const bulkReplaceTagExpressions = (tes: LocalTagExpression[]) =>
  replaceKeepingPending('tagExpressions', tes, (pending) => !tes.some((t) => t.id === pending.id));

export const getAllTrashedMemos = async () => (await getDb()).getAll('trashedMemos');
export const deleteTrashedMemo = (id: string) => remove('trashedMemos', id);

export const bulkReplaceTrashedMemos = async (items: LocalTrashedMemo[]) => {
  const tx = (await getDb()).transaction('trashedMemos', 'readwrite');
  await tx.store.clear();
  for (const item of items) await tx.store.put(item);
  await tx.done;
  emitChange();
};

// ─── SyncMeta ────────────────────────────────────────
const getMeta = async (key: string) => (await (await getDb()).get('syncMeta', key))?.value ?? null;
const setMeta = async (key: string, value: string) => { await (await getDb()).put('syncMeta', { key, value }); };

export const getLastSyncAt = () => getMeta('lastSyncAt');
export const setLastSyncAt = (iso: string) => setMeta('lastSyncAt', iso);

const getMemoIdAliases = async (): Promise<Record<string, string>> => {
  try {
    const parsed = JSON.parse((await getMeta(MEMO_ID_ALIASES_KEY)) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const rememberMemoIdAlias = async (localId: string, serverId: string) => {
  if (!localId || !serverId || localId === serverId) return;
  const aliases = await getMemoIdAliases();
  aliases[localId] = serverId;
  await setMeta(MEMO_ID_ALIASES_KEY, JSON.stringify(aliases));
};

/** 仮 ID から正式 ID をたどる（同期後も古い URL で開けるように） */
export const getCanonicalMemoId = async (id: string) => {
  const aliases = await getMemoIdAliases();
  const seen = new Set<string>();
  let current = id;
  while (aliases[current] && !seen.has(current)) {
    seen.add(current);
    current = aliases[current];
  }
  return current;
};

// ─── 一括操作 / ユーザー切替 ─────────────────────────
const clearDb = async (db: IDBPDatabase<RakuJotDB>) => {
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  await Promise.all(ALL_STORES.map((s) => tx.objectStore(s).clear()));
  await tx.done;
};

export const clearAllLocalData = async () => {
  await clearDb(await getDb());
  emitChange();
};

/** 匿名 DB の未同期データをユーザー DB に移行する。重複名のタグは既存タグに寄せる */
export const migrateAnonymousToUser = async (userId: string): Promise<boolean> => {
  // 画面側が使っている接続を閉じないよう、移行用に専用の接続を開く
  const anonDb = await openUserDb(ANONYMOUS);
  try {
    const [memos, tags, expressions] = await Promise.all([
      anonDb.getAll('memos'), anonDb.getAll('tags'), anonDb.getAll('tagExpressions'),
    ]);
    if (!memos.length && !tags.length && !expressions.length) return false;

    const userDb = await getDbFor(userId);
    const existingTags = await userDb.getAll('tags');
    const tagIdMap = new Map<string, string>();
    const tx = userDb.transaction(['tags', 'memos', 'tagExpressions'], 'readwrite');
    for (const tag of tags) {
      const dup = existingTags.find((t) => t.name === tag.name);
      if (dup) tagIdMap.set(tag.id, dup.id);
      else await tx.objectStore('tags').put(tag);
    }
    const remap = (ids: string[]) => ids.map((id) => tagIdMap.get(id) || id);
    for (const memo of memos) await tx.objectStore('memos').put({ ...memo, tags: remap(memo.tags) });
    for (const te of expressions) {
      await tx.objectStore('tagExpressions').put({
        ...te,
        orTerms: te.orTerms.map((t) => ({ include: remap(t.include), exclude: remap(t.exclude) })),
      });
    }
    await tx.done;
    await clearDb(anonDb);
    emitChange();
    return true;
  } finally {
    anonDb.close();
  }
};

/** ログアウト時にユーザー DB ごと削除する */
export const deleteUserDb = async (userId: string) => {
  closeDb(userId);
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName(userId));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
};
