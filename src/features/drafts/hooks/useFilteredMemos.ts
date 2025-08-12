import { Memo } from '../types/memo';
import { filters } from '../stores/filters';
import { categories } from '../stores/categories';
import { evaluateFilterExpression, FilterTerm } from '../types/filterTypes';

export const useFilteredMemos = (memos: Memo[], filterQuery: string): Memo[] => {
  if (!filterQuery) {
    return memos;
  }
  if (!Array.isArray(memos)) {
    return [];
  }
  
  return memos.filter((memo) => {
    const memoTags = memo.tags || [];
    
    // フィルタIDまたはカテゴリIDでフィルタリング
    const filter = filters.find(f => f.id === filterQuery);
    const category = categories.find(c => c.id === filterQuery);
    
    if (filter) {
      return evaluateFilterExpression(memoTags, filter.orTerms);
    }
    
    if (category) {
      return evaluateFilterExpression(memoTags, category.orTerms);
    }
    
    // 従来のクエリ文字列形式もサポート（後方互換性）
    return evaluateLegacyQuery(memo, filterQuery);
  });
};

// 従来のクエリ文字列形式の評価（後方互換性のため）
function evaluateLegacyQuery(memo: Memo, filterQuery: string): boolean {
  const queryParts = filterQuery.split(' ').filter(part => part.trim() !== '');
  const memoTags = memo.tags || [];
  
  if (queryParts.length === 0) return true;

  // NOT条件（除外タグ）を先に処理
  const excludeTags: string[] = [];
  
  for (let i = 0; i < queryParts.length; i++) {
    if (queryParts[i] === 'NOT' && i + 1 < queryParts.length) {
      excludeTags.push(queryParts[i + 1]);
      queryParts[i] = '';
      queryParts[i + 1] = '';
    } else if (queryParts[i].startsWith('-')) {
      excludeTags.push(queryParts[i].substring(1));
      queryParts[i] = '';
    }
  }
  
  if (excludeTags.some(tag => memoTags.includes(tag))) {
    return false;
  }

  const remainingParts = queryParts.filter(part => part !== '');
  if (remainingParts.length === 0) return true;
  
  // OR条件を処理
  const orGroups: string[][] = [[]];
  let currentGroup = 0;

  for (let i = 0; i < remainingParts.length; i++) {
    const part = remainingParts[i];
    
    if (part === 'OR') {
      currentGroup++;
      orGroups[currentGroup] = [];
    } else if (part === 'AND') {
      continue;
    } else {
      if (!orGroups[currentGroup]) {
        orGroups[currentGroup] = [];
      }
      orGroups[currentGroup].push(part);
    }
  }

  return orGroups.some(group => {
    if (group.length === 0) return false;
    return group.every(tag => memoTags.includes(tag));
  });
}