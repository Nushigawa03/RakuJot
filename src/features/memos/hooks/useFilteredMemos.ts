import { Memo } from '../types/memo';
import { SearchTag } from '../types/searchTag';
import { TagExpressionTerm } from '../types/tagExpressions';
import { evaluateExpression } from '../utils/tagExpressionUtils';
import { evaluateDateQuery, type DateQueryEvalConfig } from '../utils/dateQueryEvaluator';
import { useEffect, useState } from 'react';
import type { TagExpression } from '../types/tagExpressions';
import tagExpressionService from '../services/tagExpressionService';
import { extractTagIds } from '../utils/tagUtils';

export const useFilteredMemos = (memos: Memo[], filterQuery: string, dateQuery?: string, queryEmbedding?: number[], filterTags?: SearchTag[]): Memo[] => {
  const [expressions, setExpressions] = useState<TagExpression[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const exprs = await tagExpressionService.load();
        setExpressions(exprs);
      } catch (error) {
        console.error('TagExpression の読み込みエラー:', error);
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
      const matched = tagExpressionService.isMemoMatchingByExpressionId(memoTags, filterQuery, expressions);
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

  // Precompute matchedTagIds for each memo to avoid re-evaluating per-tag in UI
  const positiveFilterTagIds: string[] = (filterTags || [])
    .filter(t => t && t.id && !t.id.startsWith('temp_') && !t.isExclude)
    .map(t => t.id as string);

  const highlightedFromQueryCache: { [memoId: string]: string[] } = {};

  const extractPositiveTokensFromLegacyQuery = (q: string): string[] => {
    if (!q) return [];
    const parts = q.split(' ').filter(p => p.trim() !== '');
    const exclude: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'NOT' && i + 1 < parts.length) {
        exclude.push(parts[i + 1]);
        parts[i] = '';
        parts[i + 1] = '';
      } else if (parts[i].startsWith('-')) {
        exclude.push(parts[i].substring(1));
        parts[i] = '';
      }
    }
    const remaining = parts.filter(p => p !== '');
    const tokens: string[] = [];
    for (const part of remaining) {
      if (part === 'AND' || part === 'OR') continue;
      tokens.push(part);
    }
    return tokens;
  };

  const queryPositiveTokens = filterQuery ? extractPositiveTokensFromLegacyQuery(filterQuery) : [];

  // If filterQuery corresponds to a TagExpression id, extract include tag ids from that expression
  const expressionDefinedPositiveIds: string[] = [];
  if (filterQuery) {
    const expr = tagExpressionService.findExpressionById(expressions, filterQuery);
    if (expr && expr.orTerms) {
      for (const term of expr.orTerms) {
        if (term && Array.isArray(term.include)) {
          for (const id of term.include) {
            if (id && !expressionDefinedPositiveIds.includes(id)) expressionDefinedPositiveIds.push(id);
          }
        }
      }
    }
  }

  const final = result.map((memo) => {
    const memoTagIds = extractTagIds(memo.tags as any);
    const highlightsSet = new Set<string>();

    // from filterTags (chips)
    for (const id of positiveFilterTagIds) {
      if (memoTagIds.includes(id)) highlightsSet.add(id);
    }

    // from TagExpression (if any)
    for (const id of expressionDefinedPositiveIds) {
      if (memoTagIds.includes(id)) highlightsSet.add(id);
    }

    // from legacy query tokens
    for (const token of queryPositiveTokens) {
      if (memoTagIds.includes(token)) highlightsSet.add(token);
    }

    const matchedTagIds = Array.from(highlightsSet);

    // return a shallow copy with matchedTagIds set
    return { ...memo, matchedTagIds } as Memo;
  });

  return final;
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