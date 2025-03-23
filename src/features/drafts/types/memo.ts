export interface Memo {
    id: string;
    title: string;
    date?: string;
    tags: string[];
    body?: string;
    createdAt: string;
    updatedAt?: string;
}
  
  export interface MemoListProps {
    filterQuery: string; // フィルタ条件
  }