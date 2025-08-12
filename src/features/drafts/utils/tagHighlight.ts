import { FilterTerm } from '../types/filterTypes';
import type { Filter } from '../stores/filters';
import type { Category } from '../stores/categories';

// タグがフィルタ条件でハイライトされるべきかを判定
export const shouldHighlightTag = (
  tagId: string, 
  filterQuery: string, 
  memoTags: string[], 
  filters: Filter[] = [], 
  categories: Category[] = []
): boolean => {
  if (!filterQuery) return false;
  
  // フィルタIDまたはカテゴリIDでフィルタリング
  const filter = filters.find(f => f.id === filterQuery);
  const category = categories.find(c => c.id === filterQuery);
  
  if (filter) {
    return isTagInFilterExpression(tagId, filter.orTerms);
  }
  
  if (category) {
    return isTagInFilterExpression(tagId, category.orTerms);
  }
  
  // 従来のクエリ文字列形式の場合
  return filterQuery.includes(tagId);
};

// タグがフィルタ表現に含まれているかチェック
function isTagInFilterExpression(tagId: string, orTerms: FilterTerm[]): boolean {
  return orTerms.some(term => 
    term.include.includes(tagId) || term.exclude.includes(tagId)
  );
}
