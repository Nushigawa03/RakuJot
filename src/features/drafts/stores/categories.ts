export interface Category {
    id: string;
    name: string;
    tagIds: string[]; // タグIDの配列
  }
  
  export const categories: Category[] = [
    { id: 'important_idea', name: '重要なアイデア', tagIds: ['important', 'idea'] },
  ];