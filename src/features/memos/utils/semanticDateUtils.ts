import { Memo } from '../types/memo';
import { computeCosineSimilarity } from './similarityUtils';

/**
 * Configuration for semantic date evaluation.
 */
export interface SemanticDateEvalConfig {
  queryEmbedding?: number[];
  similarityThreshold?: number; // default 0.7
}

/**
 * Evaluate semantic similarity between a date query text and memo content.
 * This runs in parallel with exact date matching for more flexible date detection.
 * 
 * @param memo The memo to evaluate (should have embedding field populated)
 * @param queryEmbedding The embedding vector of the date query text
 * @param similarityThreshold Minimum similarity score (0-1) to match
 * @returns true if memo passes semantic date similarity check
 */
export function evaluateSemanticDateSimilarity(
  memo: Memo,
  queryEmbedding: number[],
  similarityThreshold: number = 0.7
): boolean {
  // Extract embedding from memo (stored as JSON)
  const memoEmbedding = memo.embedding as any;
  const hasMemoEmbedding = Array.isArray(memoEmbedding) && memoEmbedding.length > 0;
  const hasQueryEmbedding = Array.isArray(queryEmbedding) && queryEmbedding.length > 0;

  if (!hasMemoEmbedding) {
    console.log(`[evaluateSemanticDateSimilarity] memo id=${(memo as any).id ?? 'unknown'} has no embedding - semantic date miss`);
    return false;
  }

  if (!hasQueryEmbedding) {
    console.log("[evaluateSemanticDateSimilarity] no query embedding provided - semantic date miss");
    return false;
  }

  if (memoEmbedding.length !== queryEmbedding.length) {
    console.log("[evaluateSemanticDateSimilarity] embedding dimension mismatch", {
      memoId: (memo as any).id ?? 'unknown',
      memoLength: memoEmbedding.length,
      queryLength: queryEmbedding.length,
    });
    return false;
  }

  try {
    const similarity = computeCosineSimilarity(queryEmbedding, memoEmbedding);
    // Log detailed similarity info for debugging
    try {
      const id = (memo as any).id ?? 'unknown';
      const title = (memo as any).title ? String((memo as any).title).slice(0, 80) : '';
      console.log('[semanticDateEmbedding] USED memo embedding for semantic date match', {
        memoId: id,
        title,
        similarity: Number(similarity.toFixed(4)),
        threshold: similarityThreshold,
        matched: similarity >= similarityThreshold,
        vectorLength: memoEmbedding.length,
      });
    } catch (logErr) {
      console.log('[semanticDateEmbedding] USED memo embedding for semantic date match', {
        similarity,
        threshold: similarityThreshold,
        matched: similarity >= similarityThreshold,
      });
    }

    return similarity >= similarityThreshold;
  } catch (err) {
    console.error("[evaluateSemanticDateSimilarity] error computing similarity:", err);
    return false;
  }
}
