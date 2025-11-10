import { Memo } from '../types/memo';
import { evaluateSemanticDateSimilarity } from './semanticDateUtils';

/**
 * Configuration for date query evaluation.
 */
export interface DateQueryEvalConfig {
  queryEmbedding?: number[]; // Embedding of the original date query text
  semanticThreshold?: number; // Minimum similarity score (0-1), default 0.7
  useSemanticFallback?: boolean; // Use semantic matching if exact date fails, default true
}

/**
 * Evaluates a date query against a memo using both exact date matching and optional semantic similarity.
 * Supports three exact date formats:
 *  - date:START..END (range)
 *  - date>=START (start date only)
 *  - date<=END (end date only)
 * 
 * If semantic config is provided, falls back to semantic similarity matching.
 * Dates should be in YYYY-MM-DD format for string comparison.
 */
export function evaluateDateQuery(
  memo: Memo,
  dateQuery: string,
  config?: DateQueryEvalConfig
): boolean {
  const memoDate = memo.date?.trim();
  // If the user provided a plain/normal date string (e.g. "2024-03-01", "2024/03/01", "2024年3月1日",
  // or short forms like "2024-03"), we should NOT run semantic matching — treat this as an explicit date query.
  const isPlainDateQuery = (q: string) => {
    if (!q) return false;
    // normalized simple checks (ISO, slashed, year-month, Japanese full-date)
    const patterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{4}-\d{2}$/,
      /^\d{4}年\d{1,2}月\d{1,2}日$/,
      /^\d{4}年\d{1,2}月$/,
      /^\d{4}年$/,
      /^\d{4}$/,
    ];

    const trimmed = q.trim();
    // If the dateQuery contains the 'date:' prefix, extract the RHS for inspection
    const datePrefixMatch = trimmed.match(/^date:(.+)$/);
    const inspect = datePrefixMatch ? datePrefixMatch[1].trim() : trimmed;

    return patterns.some((r) => r.test(inspect));
  };

  // Format 1: "date:START..END" (range)
  const rangeMatch = dateQuery.match(/^date:(.+?)\.\.(.+)$/);
  if (rangeMatch) {
    const start = rangeMatch[1].trim();
    const end = rangeMatch[2].trim();
    if (memoDate && memoDate >= start && memoDate <= end) {
      return true;
    }
    // Fall back to semantic if exact date doesn't match (unless the user supplied a plain date string)
    if (
      config?.useSemanticFallback !== false &&
      config?.queryEmbedding &&
      memoDate &&
      !isPlainDateQuery(dateQuery)
    ) {
      return evaluateSemanticDateSimilarity(memo, config.queryEmbedding, config.semanticThreshold);
    }
    return false;
  }

  // Format 2: "date>=YYYY-MM-DD" (start only)
  const gteMatch = dateQuery.match(/^date>=(.+)$/);
  if (gteMatch) {
    const start = gteMatch[1].trim();
    if (memoDate && memoDate >= start) {
      return true;
    }
    // Fall back to semantic if exact date doesn't match (unless the user supplied a plain date string)
    if (
      config?.useSemanticFallback !== false &&
      config?.queryEmbedding &&
      memoDate &&
      !isPlainDateQuery(dateQuery)
    ) {
      return evaluateSemanticDateSimilarity(memo, config.queryEmbedding, config.semanticThreshold);
    }
    return false;
  }

  // Format 3: "date<=YYYY-MM-DD" (end only)
  const lteMatch = dateQuery.match(/^date<=(.+)$/);
  if (lteMatch) {
    const end = lteMatch[1].trim();
    if (memoDate && memoDate <= end) {
      return true;
    }
    // Fall back to semantic if exact date doesn't match (unless the user supplied a plain date string)
    if (
      config?.useSemanticFallback !== false &&
      config?.queryEmbedding &&
      memoDate &&
      !isPlainDateQuery(dateQuery)
    ) {
      return evaluateSemanticDateSimilarity(memo, config.queryEmbedding, config.semanticThreshold);
    }
    return false;
  }

  // If no exact format matched, try semantic matching as fallback (but skip if the query is a plain date)
  if (config?.queryEmbedding && !isPlainDateQuery(dateQuery)) {
    return evaluateSemanticDateSimilarity(memo, config.queryEmbedding, config.semanticThreshold);
  }

  return false;
}
