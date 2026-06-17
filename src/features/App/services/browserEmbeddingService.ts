type EmbedKind = "query" | "document" | "semantic";

type FeatureExtractionPipeline = (input: string | string[], options?: Record<string, unknown>) => Promise<{
  data?: Float32Array | number[];
  dims?: number[];
  tolist?: () => number[] | number[][];
}>;

const MODEL_ID = (import.meta.env.VITE_BROWSER_EMBED_MODEL_ID || "").trim();
const MODEL_REMOTE_HOST = (import.meta.env.VITE_BROWSER_EMBED_MODEL_HOST || "").trim();
const MODEL_REMOTE_PATH_TEMPLATE = (
  import.meta.env.VITE_BROWSER_EMBED_MODEL_PATH_TEMPLATE || "{model}/"
).trim();

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

const prefixText = (text: string, kind: EmbedKind): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (kind === "query") return `検索クエリ: ${trimmed}`;
  if (kind === "document") return `検索文書: ${trimmed}`;
  return trimmed;
};

const normalizeVector = (vector: number[]): number[] => {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }

  const magnitude = Math.sqrt(sum);
  if (!magnitude) return vector;

  return vector.map((value) => value / magnitude);
};

const readFirstVector = (output: Awaited<ReturnType<FeatureExtractionPipeline>>): number[] | null => {
  if (typeof output?.tolist === "function") {
    const list = output.tolist();
    if (Array.isArray(list[0])) {
      return (list as number[][])[0] ?? null;
    }
    return list as number[];
  }

  if (output?.data && output?.dims?.length) {
    const data = Array.from(output.data);
    const dims = output.dims;
    const width = dims[dims.length - 1];
    if (typeof width === "number" && width > 0) {
      return data.slice(0, width);
    }
  }

  return null;
};

const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
  if (!extractorPromise) {
    if (!MODEL_ID || !MODEL_REMOTE_HOST) {
      throw new Error(
        "Browser embedding model is not configured. Set VITE_BROWSER_EMBED_MODEL_ID and VITE_BROWSER_EMBED_MODEL_HOST."
      );
    }

    console.log("[browserEmbeddingService] loading embedding model", {
      model: MODEL_ID,
      remoteHost: MODEL_REMOTE_HOST,
      remotePathTemplate: MODEL_REMOTE_PATH_TEMPLATE,
    });
    extractorPromise = import("@huggingface/transformers").then(({ env, pipeline }) => {
      env.remoteHost = MODEL_REMOTE_HOST;
      env.remotePathTemplate = MODEL_REMOTE_PATH_TEMPLATE;

      return pipeline("feature-extraction", MODEL_ID, {
        device: "webgpu" in navigator ? "webgpu" : "wasm",
        dtype: "q8",
      }) as Promise<FeatureExtractionPipeline>;
    }).then((extractor) => {
      console.log("[browserEmbeddingService] embedding model ready", {
        model: MODEL_ID,
        remoteHost: MODEL_REMOTE_HOST,
      });
      return extractor;
    });
  }

  return extractorPromise;
};

export async function computeBrowserEmbedding(
  text: string,
  kind: EmbedKind = "semantic"
): Promise<number[] | null> {
  if (typeof window === "undefined") {
    console.log("[browserEmbeddingService] skipped: window is undefined");
    return null;
  }

  const prefixedText = prefixText(text, kind);
  if (!prefixedText) {
    console.log("[browserEmbeddingService] skipped: empty input", { kind });
    return null;
  }

  try {
    const extractor = await getExtractor();
    const startedAt = performance.now();
    const output = await extractor(prefixedText, {
      pooling: "mean",
      normalize: true,
    });

    const vector = readFirstVector(output);
    console.log("[browserEmbeddingService] embedding result", {
      model: MODEL_ID,
      kind,
      inputLength: text.trim().length,
      vectorLength: vector?.length ?? 0,
      elapsedMs: Math.round(performance.now() - startedAt),
      preview: text.trim().slice(0, 80),
    });
    return vector ? normalizeVector(vector) : null;
  } catch (error) {
    console.warn("[browserEmbeddingService] failed to compute embedding:", error);
    extractorPromise = null;
    return null;
  }
}

export const browserEmbeddingModelId = MODEL_ID;
