export interface Memo {
  id: string;
  title: string;
  date?: string;
  tags: string[];
  _syncStatus?: 'synced' | 'pending-create' | 'pending-update' | 'pending-delete';
  // precomputed tag ids that matched the current filter/query (used for UI highlighting)
  matchedTagIds?: string[];
  body?: string;
  embedding?: number[] | any; // Embedding vector stored as JSON in DB
  createdAt: string;
  updatedAt?: string;
}

export interface MemoListProps {
  filterQuery: string; // タグベースのフィルタ条件
  dateQuery?: string; // 日付フィルタ条件（YYYY-MM-DD形式、date>=, date<=, date:..形式など）
  queryEmbedding?: number[]; // Query embedding for semantic similarity matching
  textQuery?: string; // Text search query
  tagQuery?: import('../types/searchTag').SearchTag[];
}