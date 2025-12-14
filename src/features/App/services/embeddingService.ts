import { GoogleGenAI } from "@google/genai";

/**
 * Embedding service - centralized place to handle all embedding-related API calls.
 * Manages Google Gemini embeddings for text content across the application.
 * 
 * This is a shared service used by multiple features, not specific to memos.
 */

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("[embeddingService] No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.");
}
const genAI = new GoogleGenAI({ apiKey });

/**
 * Compute embedding vector for given text content.
 * @param text The text to embed
 * @returns Embedding vector as number[] or null if computation fails
 */
export async function computeEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!text || !text.trim()) {
      return null;
    }

    const response = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: [{ role: "user", parts: [{ text: text.trim() }] }],
    });

    if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
      return response.embeddings[0].values;
    }
    return null;
  } catch (err: any) {
    // Log detailed error information for debugging
    if (err?.error?.status === "RESOURCE_EXHAUSTED") {
      console.warn("[embeddingService.computeEmbedding] API quota exceeded. Falling back to exact date matching only.");
    } else if (err?.error?.status === "PERMISSION_DENIED") {
      console.error("[embeddingService.computeEmbedding] Permission denied. Check API key and project configuration.");
    } else {
      console.error("[embeddingService.computeEmbedding] error:", err);
    }
    // Always return null on error - exact date matching will still work
    return null;
  }
}

/**
 * Compute embedding for a memo combining title, date, and body.
 * @param memo Object with title, date, and body fields
 * @returns Embedding vector or null
 */
export async function computeMemoEmbedding(memo: {
  title: string;
  date?: string;
  body?: string;
}): Promise<number[] | null> {
  const text = [memo.title, memo.date || "", memo.body || ""]
    .filter((s) => s && s.trim())
    .join(" ");

  return computeEmbedding(text);
}

/**
 * Compute embeddings for multiple texts in batch.
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors (parallel to input array)
 */
export async function computeEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];

  for (const text of texts) {
    const embedding = await computeEmbedding(text);
    results.push(embedding);
  }

  return results;
}
