import { Memo } from '../types/memo';
import { computeCosineSimilarity, filterBySimilarity } from './similarityUtils';

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
    console.debug(`[evaluateSemanticDateSimilarity] memo id=${(memo as any).id ?? 'unknown'} has no embedding - skipping semantic check`);
    return true; // Pass through if no embedding stored (non-blocking)
  }

  if (!hasQueryEmbedding) {
    console.debug("[evaluateSemanticDateSimilarity] no query embedding provided - skipping semantic check");
    return true;
  }

  try {
    const similarity = computeCosineSimilarity(queryEmbedding, memoEmbedding);
    // Log detailed similarity info for debugging
    try {
      const id = (memo as any).id ?? 'unknown';
      const title = (memo as any).title ? String((memo as any).title).slice(0, 80) : '';
      console.debug(`[evaluateSemanticDateSimilarity] memo id=${id} title="${title}" similarity=${similarity.toFixed(4)} threshold=${similarityThreshold}`);
    } catch (logErr) {
      console.debug('[evaluateSemanticDateSimilarity] similarity:', similarity, 'threshold:', similarityThreshold);
    }

    return similarity >= similarityThreshold;
  } catch (err) {
    console.error("[evaluateSemanticDateSimilarity] error computing similarity:", err);
    return true; // Pass through on error (non-blocking)
  }
}
