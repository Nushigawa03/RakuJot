import { Memo } from '../types/memo';
import { FilterTerm } from '../types/filterTypes';
import { evaluateFilterExpression } from '../utils/filterUtils';
import { useEffect, useState } from 'react';
import type { Filter } from '../types/filters';
import type { Category } from '../types/categories';

export const useFilteredMemos = (memos: Memo[], filterQuery: string): Memo[] => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/tagExpressions');
        if (response.ok) {
          const data = await response.json();
          // name の有無でフィルタ（匿名）とカテゴリ（名前付き）を振り分け
          const filtersData = data.filter((d: any) => !d.name);
          const categoriesData = data.filter((d: any) => !!d.name);
          setFilters(filtersData);
          setCategories(categoriesData);
        } else {
          console.error('APIからのデータ取得に失敗しました');
        }
      } catch (error) {
        console.error('フィルタ・カテゴリの読み込みエラー:', error);
      }
    };

    loadData();
  }, []);

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