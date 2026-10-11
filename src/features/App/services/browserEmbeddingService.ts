/**
 * 端末内の埋め込みモデル（Transformers.js / ONNX）。モデルファイルは VITE_BROWSER_EMBED_MODEL_HOST から取得し、
 * ブラウザの Cache Storage（transformers-cache）にキャッシュされる。SSR では vite.config のスタブに差し替わる。
 */
type EmbedKind = "query" | "document" | "semantic";
type Extractor = (input: string, options?: Record<string, unknown>) => Promise<{ tolist?: () => number[] | number[][] }>;

const env = import.meta.env;
const MODEL_ID = (env.VITE_BROWSER_EMBED_MODEL_ID || "").trim();
const MODEL_HOST = (env.VITE_BROWSER_EMBED_MODEL_HOST || "").trim();
const MODEL_PATH_TEMPLATE = (env.VITE_BROWSER_EMBED_MODEL_PATH_TEMPLATE || "{model}/").trim();
const MODEL_DTYPE = (env.VITE_BROWSER_EMBED_MODEL_DTYPE || "q8").trim();
const MODEL_ONNX_FILE = (env.VITE_BROWSER_EMBED_MODEL_ONNX_FILE || "").trim();

// Ruri v3 の検索用プレフィックス
const PREFIX: Record<EmbedKind, string> = { query: "検索クエリ: ", document: "検索文書: ", semantic: "" };

let extractorPromise: Promise<Extractor> | null = null;

const getExtractor = () =>
  (extractorPromise ??= (async () => {
    if (!MODEL_ID || !MODEL_HOST) {
      throw new Error("Browser embedding model is not configured. Set VITE_BROWSER_EMBED_MODEL_ID and VITE_BROWSER_EMBED_MODEL_HOST.");
    }
    const { env: tfEnv, pipeline } = await import("@huggingface/transformers");
    tfEnv.remoteHost = MODEL_HOST;
    tfEnv.remotePathTemplate = MODEL_PATH_TEMPLATE;
    // ONNX ファイル名を変えて配置している場合に差し替える
    if (MODEL_ONNX_FILE) {
      const fetchFile = tfEnv.fetch;
      tfEnv.fetch = (input, init) =>
        fetchFile(String(input).replace(/\/onnx\/model_quantized\.onnx$/, `/onnx/${MODEL_ONNX_FILE}`), init);
    }
    return (await pipeline("feature-extraction", MODEL_ID, {
      device: "webgpu" in navigator ? "webgpu" : "wasm",
      dtype: MODEL_DTYPE as any,
    })) as unknown as Extractor;
  })());

/** 正規化済みの埋め込みベクトルを返す（モデル未設定・失敗時は null） */
export async function computeBrowserEmbedding(text: string, kind: EmbedKind = "semantic"): Promise<number[] | null> {
  const input = text.trim();
  if (typeof window === "undefined" || !input) return null;
  try {
    const extractor = await getExtractor();
    const output = await extractor(PREFIX[kind] + input, { pooling: "mean", normalize: true });
    const list = output.tolist?.();
    const vector = (Array.isArray(list?.[0]) ? list![0] : list) as number[] | undefined;
    if (!vector?.length) return null;
    const magnitude = Math.hypot(...vector);
    return magnitude ? vector.map((v) => v / magnitude) : vector;
  } catch (error) {
    console.warn("[browserEmbeddingService] failed to compute embedding:", error);
    extractorPromise = null;
    return null;
  }
}
