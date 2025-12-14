import { Memo } from '../types/memo';
import { SearchTag } from '../types/searchTag';
import { FilterTerm } from '../types/filterTypes';
import { evaluateExpression } from '../utils/tagExpressionUtils';
import { evaluateDateQuery, type DateQueryEvalConfig } from '../utils/dateQueryEvaluator';
import { useEffect, useState } from 'react';
import type { Filter } from '../types/filters';
import type { Category } from '../types/categories';
import tagExpressionService from '../services/tagExpressionService';

export const useFilteredMemos = (memos: Memo[], filterQuery: string, dateQuery?: string, queryEmbedding?: number[], filterTags?: SearchTag[]): Memo[] => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { filters: f, categories: c } = await tagExpressionService.load();
        setFilters(f);
        setCategories(c);
      } catch (error) {
        console.error('フィルタ・カテゴリの読み込みエラー:', error);
      }
    };

    loadData();
  }, []);

  if (!Array.isArray(memos)) {
    return [];
  }

  // First apply tag-based filter
  let result = memos;
  if (filterQuery) {
    result = memos.filter((memo) => {
      const memoTags = memo.tags || [];

      // まず TagExpression サービス経由で判定
      const matched = tagExpressionService.isMemoMatchingByExpressionId(memoTags, filterQuery, filters, categories);
      if (matched) return true;

      // 従来のクエリ文字列形式もサポート（後方互換性）
      return evaluateLegacyQuery(memo, filterQuery);
    });
  }

  // Also apply tag chips (filterTags) as AND: include all positive tags, exclude all exclude-tags
  if (filterTags && filterTags.length > 0) {
    result = result.filter((memo) => {
      const memoTags = memo.tags || [];
      for (const t of filterTags) {
        // ignore temporary tags (not matched to existing tag ids)
        if (!t.id || t.id.startsWith('temp_')) continue;
        if (t.isExclude) {
          if (memoTags.includes(t.id)) return false;
        } else {
          if (!memoTags.includes(t.id)) return false;
        }
      }
      return true;
    });
  }

  // Then apply date-based filter
  if (dateQuery) {
    const config: DateQueryEvalConfig = {
      queryEmbedding,
      semanticThreshold: 0.9,
      useSemanticFallback: false,
    };
    result = result.filter((memo) => evaluateDateQuery(memo, dateQuery, config));
  }

  return result;
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