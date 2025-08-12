import { mockTags } from '../models/mock/mockData';
import type { Tag } from '../stores/tags';

export const getTagNameById = (id: string): string => {
  // モックタグから検索
  const tag = mockTags.find((tag: Tag) => tag.id === id);
  if (tag) {
    return tag.name;
  }
  
  return id; // 見つからない場合はIDをそのまま返す
};