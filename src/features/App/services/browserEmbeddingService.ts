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
const MODEL_DTYPE = (import.meta.env.VITE_BROWSER_EMBED_MODEL_DTYPE || "q8").trim();
const MODEL_ONNX_FILE = (import.meta.env.VITE_BROWSER_EMBED_MODEL_ONNX_FILE || "").trim();

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

const remapModelFileUrl = (input: string | URL): string | URL => {
  if (!MODEL_ONNX_FILE) return input;

  const url = typeof input === "string" ? input : input.toString();
  if (!url.endsWith("/onnx/model_quantized.onnx")) return input;

  return url.replace(/\/onnx\/model_quantized\.onnx$/, `/onnx/${MODEL_ONNX_FILE}`);
};

const toUrlString = (input: string | URL): string =>
  typeof input === "string" ? input : input.toString();

const isHuggingFaceUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return host === "huggingface.co" || host === "hf.co" || host.endsWith(".huggingface.co");
  } catch {
    return false;
  }
};

const shouldLogModelFetch = (url: string): boolean =>
  url.includes(`/${MODEL_ID}/`) ||
  url.includes("/config.json") ||
  url.includes("/tokenizer") ||
  url.includes("/onnx/");

const inspectTransformersCache = async (url: string): Promise<boolean | "unavailable"> => {
  if (typeof caches === "undefined") return "unavailable";

  try {
    const cache = await caches.open("transformers-cache");
    return Boolean(await cache.match(url));
  } catch (error) {
    console.warn("[browserEmbeddingService] unable to inspect transformers-cache", {
      url,
      error,
    });
    return "unavailable";
  }
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
      dtype: MODEL_DTYPE,
      onnxFile: MODEL_ONNX_FILE || "model_quantized.onnx",
    });
    extractorPromise = import("@huggingface/transformers").then(({ env, pipeline }) => {
      env.remoteHost = MODEL_REMOTE_HOST;
      env.remotePathTemplate = MODEL_REMOTE_PATH_TEMPLATE;

      const fetchModelFile = env.fetch;
      env.fetch = async (input, init) => {
        const requestedUrl = toUrlString(input);
        const remappedInput = remapModelFileUrl(input);
        const finalUrl = toUrlString(remappedInput);
        const remapped = requestedUrl !== finalUrl;
        const logModelFetch = shouldLogModelFetch(finalUrl);
        const cacheHitBeforeFetch = logModelFetch
          ? await inspectTransformersCache(finalUrl)
          : undefined;

        if (remapped) {
          console.log("[browserEmbeddingService] ONNX fetch remapped by VITE_BROWSER_EMBED_MODEL_ONNX_FILE", {
            requestedUrl,
            finalUrl,
            configuredOnnxFile: MODEL_ONNX_FILE,
            cacheHitBeforeFetch,
          });
        }

        if (isHuggingFaceUrl(finalUrl)) {
          console.error("[browserEmbeddingService] UNEXPECTED Hugging Face fetch attempted", {
            requestedUrl,
            finalUrl,
            model: MODEL_ID,
            remoteHost: MODEL_REMOTE_HOST,
            cacheHitBeforeFetch,
          });
        } else if (logModelFetch) {
          console.log("[browserEmbeddingService] model asset fetch", {
            requestedUrl,
            finalUrl,
            remapped,
            fromConfiguredRemoteHost: finalUrl.startsWith(MODEL_REMOTE_HOST),
            cacheName: "transformers-cache",
            cacheHitBeforeFetch,
          });
        }

        return fetchModelFile(remappedInput, init);
      };

      return pipeline("feature-extraction", MODEL_ID, {
        device: "webgpu" in navigator ? "webgpu" : "wasm",
        dtype: MODEL_DTYPE,
      }) as Promise<FeatureExtractionPipeline>;
    }).then((extractor) => {
      console.log("[browserEmbeddingService] embedding model ready", {
        model: MODEL_ID,
        remoteHost: MODEL_REMOTE_HOST,
        dtype: MODEL_DTYPE,
        onnxFile: MODEL_ONNX_FILE || "model_quantized.onnx",
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
