/**
 * Compute cosine similarity between two vectors.
 * Formula: (A · B) / (||A|| * ||B||)
 */
export function computeCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same length");
  }

  // Dot product
  let dotProduct = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
  }

  // Magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vectorA.length; i++) {
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find the most similar vector to a query vector from a list of candidate vectors.
 * Returns { index, similarity } of the best match.
 */
export function findMostSimilar(queryVector: number[], candidateVectors: number[][]): { index: number; similarity: number } | null {
  if (candidateVectors.length === 0) {
    return null;
  }

  let bestIndex = 0;
  let bestSimilarity = -Infinity;

  for (let i = 0; i < candidateVectors.length; i++) {
    const similarity = computeCosineSimilarity(queryVector, candidateVectors[i]);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { index: bestIndex, similarity: bestSimilarity };
}

/**
 * Filter vectors by similarity threshold.
 * Returns array of { index, similarity } for vectors above the threshold.
 */
export function filterBySimilarity(
  queryVector: number[],
  candidateVectors: number[][],
  threshold: number = 0.7
): Array<{ index: number; similarity: number }> {
  return candidateVectors
    .map((vector, index) => ({
      index,
      similarity: computeCosineSimilarity(queryVector, vector),
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}
