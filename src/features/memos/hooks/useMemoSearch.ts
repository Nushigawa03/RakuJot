import { Memo } from '../types/memo';
import { SearchTag } from '../types/searchTag';
import { TagExpressionTerm } from '../types/tagExpressions';
import { evaluateExpression } from '../utils/tagExpressionUtils';
import { evaluateDateQuery, type DateQueryEvalConfig } from '../utils/dateQueryEvaluator';
import { useEffect, useState } from 'react';
import type { TagExpression } from '../types/tagExpressions';
import tagExpressionService from '../services/tagExpressionService';
import { extractTagIds } from '../utils/tagUtils';
import { sortMemosByFuzzyScore } from '../utils/searchScoringUtils';

export const useMemoSearch = (memos: Memo[], filterQuery: string, dateQuery?: string, textQuery?: string, tagQuery?: SearchTag[]): Memo[] => {
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

  // Active Date Queries
  const activeDateQueries: string[] = dateQuery ? [dateQuery] : [];

  // Effective Text Query
  // If filterQuery corresponds to a TagExpression ID, it's NOT a text query, it's an expression.
  // If no textQuery provided but filterQuery is NOT an expression, treat filterQuery as legacy text filter.
  const isExpression = filterQuery && expressions.some(e => e.id === filterQuery);
  const effectiveTextQuery = isExpression ? '' : (textQuery || filterQuery || '');

  let result = memos;

  // 1. Tag Expression Filter (if filterQuery is an Expression ID)
  if (isExpression) {
    result = result.filter((memo) => {
      return tagExpressionService.isMemoMatchingByExpressionId(memo.tags || [], filterQuery, expressions);
    });
  }


  // 3. Tag Chips Filter (AND)
  if (tagQuery && tagQuery.length > 0) {
    result = result.filter((memo) => {
      const memoTagIds = extractTagIds(memo.tags as any);
      for (const t of tagQuery) {
        if (!t.id || t.id.startsWith('temp_')) continue;
        if (t.isExclude) {
          if (memoTagIds.includes(t.id)) return false;
        } else {
          if (!memoTagIds.includes(t.id)) return false;
        }
      }
      return true;
    });
  }

  // 4. Date Filter (AND)
  if (activeDateQueries.length > 0) {
    const config: DateQueryEvalConfig = {
      useSemanticFallback: false,
    };
    for (const dq of activeDateQueries) {
      if (!dq) continue;
      result = result.filter((memo) => evaluateDateQuery(memo, dq, config));
    }
  }

  // 5. Text/Body/Fuzzy Search & Scoring (After filtering by Tags and Dates)
  result = sortMemosByFuzzyScore(result, effectiveTextQuery);

  // Highlighting Logic
  const positiveFilterTagIds: string[] = (tagQuery || [])
    .filter(t => t && t.id && !t.id.startsWith('temp_') && !t.isExclude)
    .map(t => t.id as string);

  const extractPositiveTokens = (q: string): string[] => {
    if (!q) return [];
    const parts = q.split(' ').filter(p => p.trim() !== '');
    const tokens: string[] = [];
    for (const part of parts) {
      if (part === 'AND' || part === 'OR' || part === 'NOT' || part.startsWith('-')) continue;
      tokens.push(part);
    }
    return tokens;
  };

  const queryPositiveTokens = effectiveTextQuery ? extractPositiveTokens(effectiveTextQuery) : [];

  // Expression IDs highlighting
  const expressionDefinedPositiveIds: string[] = [];
  if (isExpression) {
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

    for (const id of positiveFilterTagIds) {
      if (memoTagIds.includes(id)) highlightsSet.add(id);
    }
    for (const id of expressionDefinedPositiveIds) {
      if (memoTagIds.includes(id)) highlightsSet.add(id);
    }
    for (const token of queryPositiveTokens) {
      if (memoTagIds.includes(token)) highlightsSet.add(token);
    }

    const matchedTagIds = Array.from(highlightsSet);
    return { ...memo, matchedTagIds } as Memo;
  });

  return final;
};