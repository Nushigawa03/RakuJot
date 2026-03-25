/**
 * IndexedDB ローカルデータベース
 * idb ライブラリを使った軽量ラッパー
 * オフライン時のデータ保持と同期状態管理を担う
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ─── 同期ステータス ───────────────────────────────────
export type SyncStatus =
  | 'synced'
  | 'pending-create'
  | 'pending-update'
  | 'pending-delete';

// ─── ローカル用の型定義 ──────────────────────────────
export interface LocalMemo {
  id: string;
  title: string;
  date?: string;
  tags: string[];        // tag ID の配列
  body?: string;
  embedding?: any;
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
  orTerms: any[];          // TagExpressionTerm[]
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _syncStatus: SyncStatus;
}

export interface LocalTrashedMemo {
  id: string;
  originalId: string;
  title: string;
  date?: string | null;
  tagNames: string[];
  body?: string | null;
  embedding?: any;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  _syncStatus: SyncStatus;
}

export interface SyncMeta {
  key: string;           // 例: 'lastSyncAt'
  value: string;
}

// ─── IndexedDB スキーマ ──────────────────────────────
interface RakuJotDB extends DBSchema {
  memos: {
    key: string;
    value: LocalMemo;
    indexes: { 'by-sync-status': SyncStatus };
  };
  tags: {
    key: string;
    value: LocalTag;
    indexes: { 'by-sync-status': SyncStatus };
  };
  tagExpressions: {
    key: string;
    value: LocalTagExpression;
    indexes: { 'by-sync-status': SyncStatus };
  };
  trashedMemos: {
    key: string;
    value: LocalTrashedMemo;
    indexes: { 'by-sync-status': SyncStatus };
  };
  syncMeta: {
    key: string;
    value: SyncMeta;
  };
}

const DB_NAME = 'rakujot-local';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<RakuJotDB> | null = null;

/**
 * データベース接続を取得（シングルトン）
 */
export const getDb = async (): Promise<IDBPDatabase<RakuJotDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RakuJotDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // memos
      const memoStore = db.createObjectStore('memos', { keyPath: 'id' });
      memoStore.createIndex('by-sync-status', '_syncStatus');

      // tags
      const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
      tagStore.createIndex('by-sync-status', '_syncStatus');

      // tagExpressions
      const teStore = db.createObjectStore('tagExpressions', { keyPath: 'id' });
      teStore.createIndex('by-sync-status', '_syncStatus');

      // trashedMemos
      const trashStore = db.createObjectStore('trashedMemos', { keyPath: 'id' });
      trashStore.createIndex('by-sync-status', '_syncStatus');

      // syncMeta
      db.createObjectStore('syncMeta', { keyPath: 'key' });
    },
  });

  return dbInstance;
};

// ─── テスト用ヘルパー ────────────────────────────────
/** テスト時にDB接続をリセット */
export const _resetDbInstance = () => {
  dbInstance = null;
};

// ─── Memo CRUD ───────────────────────────────────────
export const getAllMemos = async (): Promise<LocalMemo[]> => {
  const db = await getDb();
  const all = await db.getAll('memos');
  // pending-delete のものは除外して返す
  return all.filter((m) => m._syncStatus !== 'pending-delete');
};

export const getMemo = async (id: string): Promise<LocalMemo | undefined> => {
  const db = await getDb();
  return db.get('memos', id);
};

export const putMemo = async (memo: LocalMemo): Promise<void> => {
  const db = await getDb();
  await db.put('memos', memo);
};

export const deleteMemo = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('memos', id);
};

export const markMemoDeleted = async (id: string): Promise<void> => {
  const db = await getDb();
  const memo = await db.get('memos', id);
  if (memo) {
    // 未同期の新規作成なら物理削除
    if (memo._syncStatus === 'pending-create') {
      await db.delete('memos', id);
    } else {
      memo._syncStatus = 'pending-delete';
      await db.put('memos', memo);
    }
  }
};

export const getPendingMemos = async (): Promise<LocalMemo[]> => {
  const db = await getDb();
  const all = await db.getAll('memos');
  return all.filter((m) => m._syncStatus !== 'synced');
};

// ─── Tag CRUD ────────────────────────────────────────
export const getAllTags = async (): Promise<LocalTag[]> => {
  const db = await getDb();
  const all = await db.getAll('tags');
  return all.filter((t) => t._syncStatus !== 'pending-delete');
};

export const putTag = async (tag: LocalTag): Promise<void> => {
  const db = await getDb();
  await db.put('tags', tag);
};

export const deleteTag = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('tags', id);
};

export const getPendingTags = async (): Promise<LocalTag[]> => {
  const db = await getDb();
  const all = await db.getAll('tags');
  return all.filter((t) => t._syncStatus !== 'synced');
};

// ─── TagExpression CRUD ──────────────────────────────
export const getAllTagExpressions = async (): Promise<LocalTagExpression[]> => {
  const db = await getDb();
  const all = await db.getAll('tagExpressions');
  return all.filter((te) => te._syncStatus !== 'pending-delete');
};

export const putTagExpression = async (te: LocalTagExpression): Promise<void> => {
  const db = await getDb();
  await db.put('tagExpressions', te);
};

export const deleteTagExpression = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('tagExpressions', id);
};

export const getPendingTagExpressions = async (): Promise<LocalTagExpression[]> => {
  const db = await getDb();
  const all = await db.getAll('tagExpressions');
  return all.filter((te) => te._syncStatus !== 'synced');
};

// ─── TrashedMemo CRUD ────────────────────────────────
export const getAllTrashedMemos = async (): Promise<LocalTrashedMemo[]> => {
  const db = await getDb();
  return db.getAll('trashedMemos');
};

export const putTrashedMemo = async (tm: LocalTrashedMemo): Promise<void> => {
  const db = await getDb();
  await db.put('trashedMemos', tm);
};

export const deleteTrashedMemo = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('trashedMemos', id);
};

// ─── SyncMeta ────────────────────────────────────────
export const getLastSyncAt = async (): Promise<string | null> => {
  const db = await getDb();
  const meta = await db.get('syncMeta', 'lastSyncAt');
  return meta?.value ?? null;
};

export const setLastSyncAt = async (isoString: string): Promise<void> => {
  const db = await getDb();
  await db.put('syncMeta', { key: 'lastSyncAt', value: isoString });
};

// ─── バルク操作 ──────────────────────────────────────
/**
 * サーバーから取得した全データでローカルDBを上書き（初回同期用）
 */
export const bulkReplaceMemos = async (memos: LocalMemo[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('memos', 'readwrite');
  await tx.store.clear();
  for (const memo of memos) {
    await tx.store.put(memo);
  }
  await tx.done;
};

export const bulkReplaceTags = async (tags: LocalTag[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('tags', 'readwrite');
  await tx.store.clear();
  for (const tag of tags) {
    await tx.store.put(tag);
  }
  await tx.done;
};

export const bulkReplaceTagExpressions = async (tes: LocalTagExpression[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('tagExpressions', 'readwrite');
  await tx.store.clear();
  for (const te of tes) {
    await tx.store.put(te);
  }
  await tx.done;
};

export const bulkReplaceTrashedMemos = async (tms: LocalTrashedMemo[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('trashedMemos', 'readwrite');
  await tx.store.clear();
  for (const tm of tms) {
    await tx.store.put(tm);
  }
  await tx.done;
};

/**
 * 全ローカルデータをクリア（ログアウト用）
 */
export const clearAllLocalData = async (): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction(
    ['memos', 'tags', 'tagExpressions', 'trashedMemos', 'syncMeta'],
    'readwrite'
  );
  await tx.objectStore('memos').clear();
  await tx.objectStore('tags').clear();
  await tx.objectStore('tagExpressions').clear();
  await tx.objectStore('trashedMemos').clear();
  await tx.objectStore('syncMeta').clear();
  await tx.done;
};
