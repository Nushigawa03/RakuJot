type EmbedKind = "query" | "document" | "semantic";

export async function computeBrowserEmbedding(
  _text: string,
  _kind: EmbedKind = "semantic"
): Promise<number[] | null> {
  return null;
}

export const browserEmbeddingModelId = "";
