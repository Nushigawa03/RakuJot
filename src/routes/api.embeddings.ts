import type { ActionFunction } from "react-router";
import { computeEmbeddingsBatch } from "~/features/App/services/embeddingService";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const data = await request.json();
    const texts = Array.isArray(data?.texts) ? data.texts : [];

    if (texts.length === 0) {
      return Response.json({ error: "texts array is required and must not be empty" }, { status: 400 });
    }

    console.debug("[api.embeddings] received texts count:", texts.length);

    // Use the centralized embedding service
    const embeddings = await computeEmbeddingsBatch(texts);

    console.debug("[api.embeddings] generated embeddings:", embeddings.length);

    return Response.json({
      texts,
      embeddings,
      count: texts.length,
    });
  } catch (e: any) {
    // Provide detailed error information for debugging
    if (e?.error?.status === "RESOURCE_EXHAUSTED") {
      console.warn("[api.embeddings] API quota exceeded. Returning empty embeddings to allow fallback to exact date matching.");
      // Return empty embeddings array to signal client-side fallback
      return Response.json({ 
        error: "API quota exceeded", 
        embeddings: [],
        fallback: true 
      }, { status: 429 });
    } else if (e?.error?.status === "PERMISSION_DENIED") {
      console.error("[api.embeddings] Permission denied. Check API key configuration.");
      return Response.json({ error: "Permission denied - check API key" }, { status: 403 });
    }
    
    console.error("[api.embeddings] error:", e);
    return Response.json({ error: "Embedding generation failed" }, { status: 500 });
  }
};
