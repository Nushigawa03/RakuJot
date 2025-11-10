export interface Memo {
    id: string;
    title: string;
    date?: string;
    tags: string[];
    body?: string;
    embedding?: number[] | any; // Embedding vector stored as JSON in DB
    createdAt: string;
    updatedAt?: string;
}
  
  export interface MemoListProps {
    filterQuery: string; // タグベースのフィルタ条件
    dateQuery?: string; // 日付フィルタ条件（YYYY-MM-DD形式、date>=, date<=, date:..形式など）
    queryEmbedding?: number[]; // Query embedding for semantic similarity matching
    filterTags?: import('../types/searchTag').SearchTag[];
  }