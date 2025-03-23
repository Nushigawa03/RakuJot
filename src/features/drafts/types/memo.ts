export interface Memo {
    id: string;
    title: string;
    date?: string;
    tags: string[];
  }
  
  export interface MemoListProps {
    filterQuery: string; // フィルタ条件
  }