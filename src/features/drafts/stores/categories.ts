import { FilterBase } from "../types/filterTypes";

export interface Category extends FilterBase {
  color?: string;
  icon?: string;
}

export const categories: Category[] = [
  { 
    id: 'important_idea', 
    name: '重要なアイデア', 
    orTerms: [{ include: ['important', 'idea'], exclude: [] }],
    color: '#ff6b6b'
  },
  { 
    id: 'work_related', 
    name: '仕事関連', 
    orTerms: [
      { include: ['work'], exclude: [] },
      { include: ['todo'], exclude: ['private'] }
    ],
    color: '#4ecdc4'
  },
];