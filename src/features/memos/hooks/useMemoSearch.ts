import { Memo } from '../types/memo';
import { SearchTag } from '../types/searchTag';
import { TagExpressionTerm } from '../types/tagExpressions';
import { evaluateExpression } from '../utils/tagExpressionUtils';
import { evaluateDateQuery, type DateQueryEvalConfig } from '../utils/dateQueryEvaluator';
import { useEffect, useState } from 'react';
import type { TagExpression } from '../types/tagExpressions';
import tagExpressionService from '../services/tagExpressionService';
import { extractTagIds } from '../utils/tagUtils';
import { computeCosineSimilarity } from '../utils/similarityUtils';

export const useMemoSearch = (memos: Memo[], filterQuery: string, dateQuery?: string, queryEmbedding?: number[], textQuery?: string, tagQuery?: SearchTag[]): Memo[] => {
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

  // 2. Text/Body/Fuzzy Search
  if (effectiveTextQuery) {
    result = result.filter((memo) => {
      // Lexical check (Tags, Title, Body)
      const lexicalMatch = evaluateTextQuery(memo, effectiveTextQuery, true); // true = allow body search

      // Semantic check
      let semanticMatch = false;
      if (queryEmbedding && queryEmbedding.length > 0 && memo.embedding && memo.embedding.length > 0) {
        try {
          const sim = computeCosineSimilarity(queryEmbedding, memo.embedding);
          if (sim >= 0.75) semanticMatch = true;
        } catch (e) {
          // ignore error
        }
      }

      return lexicalMatch || semanticMatch;
    });
  } else if (queryEmbedding && !isExpression) {
    // check semantic only if no text query but embedding exists 
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

// 拡張されたクエリ評価（タグ + 本文/タイトル）
function evaluateTextQuery(memo: Memo, filterQuery: string, searchBody: boolean = false): boolean {
  const queryParts = filterQuery.split(' ').filter(part => part.trim() !== '');
  const memoTags = memo.tags || [];

  if (queryParts.length === 0) return true;

  // NOT条件（除外タグ/除外ワード）
  const excludeParts: string[] = [];
  for (let i = 0; i < queryParts.length; i++) {
    if (queryParts[i] === 'NOT' && i + 1 < queryParts.length) {
      excludeParts.push(queryParts[i + 1]);
      queryParts[i] = '';
      queryParts[i + 1] = '';
    } else if (queryParts[i].startsWith('-')) {
      excludeParts.push(queryParts[i].substring(1));
      queryParts[i] = '';
    }
  }

  // Check excludes
  if (excludeParts.length > 0) {
    const hasExcludeMatch = excludeParts.some(part => {
      if (memoTags.includes(part)) return true;
      if (searchBody) {
        if (memo.title?.toLowerCase().includes(part.toLowerCase())) return true;
        if (memo.body?.toLowerCase().includes(part.toLowerCase())) return true;
      }
      return false;
    });
    if (hasExcludeMatch) return false;
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

  // Evaluate Groups (OR) -> Each Group (AND)
  return orGroups.some(group => {
    if (group.length === 0) return false;
    return group.every(part => {
      if (memoTags.includes(part)) return true;
      if (searchBody) {
        if (memo.title?.toLowerCase().includes(part.toLowerCase())) return true;
        if (memo.body?.toLowerCase().includes(part.toLowerCase())) return true;
      }
      return false;
    });
  });
}