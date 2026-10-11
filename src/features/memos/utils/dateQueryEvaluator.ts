import type { Memo } from '../types/memo';
import { computeCosineSimilarity } from './similarityUtils';
import { parseFuzzyDate } from './dateUtils';

export interface DateQueryEvalConfig {
  queryEmbedding?: number[]; // 元の曖昧な日付表現の埋め込み
  semanticThreshold?: number;
  useSemanticFallback?: boolean;
}

export const DEFAULT_SEMANTIC_DATE_THRESHOLD = 0.835;

// 「2024-03-01」「2024年3月」のような明示的な日付クエリには意味検索を使わない
const PLAIN_DATE = [/^\d{4}-\d{2}(-\d{2})?$/, /^\d{4}\/\d{2}\/\d{2}$/, /^\d{4}年(\d{1,2}月(\d{1,2}日)?)?$/, /^\d{4}$/];
const isPlainDateQuery = (q: string) => PLAIN_DATE.some((r) => r.test(q.trim().replace(/^date:/, '').trim()));

function parseRange(dateQuery: string): { from?: string; to?: string } | null {
  const range = dateQuery.match(/^date:(.+?)\.\.(.+)$/);
  if (range) return { from: range[1].trim(), to: range[2].trim() };
  const gte = dateQuery.match(/^date>=(.+)$/);
  if (gte) return { from: gte[1].trim() };
  const lte = dateQuery.match(/^date<=(.+)$/);
  return lte ? { to: lte[1].trim() } : null;
}

function semanticDateMatches(memo: Memo, queryEmbedding: number[], threshold = 0.7): boolean {
  const embedding = memo.embedding;
  if (!Array.isArray(embedding) || !embedding.length || embedding.length !== queryEmbedding.length) return false;
  return computeCosineSimilarity(queryEmbedding, embedding) >= threshold;
}

/**
 * 日付クエリ（date:S..E / date>=S / date<=E）でメモを判定する。
 * メモの日付が具体的な区間として解釈できればそれで判定し、
 * 解釈できない自由記述の日付だけ埋め込みの類似度で判定する。
 */
export function evaluateDateQuery(memo: Memo, dateQuery: string, config?: DateQueryEvalConfig): boolean {
  const memoDate = memo.date?.trim();
  const start = memoDate ? parseFuzzyDate(memoDate, false) : null;
  const end = memoDate ? parseFuzzyDate(memoDate, true) : null;
  const range = parseRange(dateQuery);

  if (range && start && end) {
    return (!range.from || end >= range.from) && (!range.to || start <= range.to);
  }

  const canUseSemantic = config?.useSemanticFallback !== false && config?.queryEmbedding && memoDate && !isPlainDateQuery(dateQuery);
  return canUseSemantic ? semanticDateMatches(memo, config!.queryEmbedding!, config!.semanticThreshold) : false;
}
