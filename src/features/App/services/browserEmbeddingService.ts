type EmbedKind = "query" | "document" | "semantic";

type FeatureExtractionPipeline = (input: string | string[], options?: Record<string, unknown>) => Promise<{
  data?: Float32Array | number[];
  dims?: number[];
  tolist?: () => number[] | number[][];
}>;

const DEFAULT_MODEL_ID = "sirasagi62/ruri-v3-30m-ONNX";
const MODEL_ID = (import.meta.env.VITE_BROWSER_EMBED_MODEL || DEFAULT_MODEL_ID).trim();

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
    extractorPromise = import("@huggingface/transformers").then(({ pipeline }) => (
      pipeline("feature-extraction", MODEL_ID, {
        device: "webgpu" in navigator ? "webgpu" : "wasm",
        dtype: "q8",
      }) as Promise<FeatureExtractionPipeline>
    ));
  }

  return extractorPromise;
};

export async function computeBrowserEmbedding(
  text: string,
  kind: EmbedKind = "semantic"
): Promise<number[] | null> {
  if (typeof window === "undefined") return null;

  const prefixedText = prefixText(text, kind);
  if (!prefixedText) return null;

  try {
    const extractor = await getExtractor();
    const output = await extractor(prefixedText, {
      pooling: "mean",
      normalize: true,
    });

    const vector = readFirstVector(output);
    return vector ? normalizeVector(vector) : null;
  } catch (error) {
    console.warn("[browserEmbeddingService] failed to compute embedding:", error);
    extractorPromise = null;
    return null;
  }
}

export const browserEmbeddingModelId = MODEL_ID;
