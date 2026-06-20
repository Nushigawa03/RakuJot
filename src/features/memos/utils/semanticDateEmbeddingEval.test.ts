import { describe, expect, it } from 'vitest';
import { DEFAULT_SEMANTIC_DATE_THRESHOLD } from './dateQueryEvaluator';
import { computeCosineSimilarity } from './similarityUtils';

type FeatureExtractionPipeline = (input: string | string[], options?: Record<string, unknown>) => Promise<{
  data?: Float32Array | number[];
  dims?: number[];
  tolist?: () => number[] | number[][];
}>;

const RUN_EVAL = process.env.RUN_EMBEDDING_EVAL === 'true';
const MODEL_ID = process.env.VITE_BROWSER_EMBED_MODEL_ID || '';
const MODEL_REMOTE_HOST = process.env.VITE_BROWSER_EMBED_MODEL_HOST || '';
const MODEL_REMOTE_PATH_TEMPLATE = process.env.VITE_BROWSER_EMBED_MODEL_PATH_TEMPLATE || '{model}/';
const MODEL_DTYPE = process.env.VITE_BROWSER_EMBED_MODEL_DTYPE || 'q8';
const MODEL_ONNX_FILE = process.env.VITE_BROWSER_EMBED_MODEL_ONNX_FILE || '';

const remapModelFileUrl = (input: string | URL): string | URL => {
  if (!MODEL_ONNX_FILE) return input;

  const url = typeof input === 'string' ? input : input.toString();
  if (!url.endsWith('/onnx/model_quantized.onnx')) return input;

  return url.replace(/\/onnx\/model_quantized\.onnx$/, `/onnx/${MODEL_ONNX_FILE}`);
};

const toUrlString = (input: string | URL): string =>
  typeof input === 'string' ? input : input.toString();

const isHuggingFaceUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return host === 'huggingface.co' || host === 'hf.co' || host.endsWith('.huggingface.co');
  } catch {
    return false;
  }
};

const shouldLogModelFetch = (url: string): boolean =>
  url.includes(`/${MODEL_ID}/`) ||
  url.includes('/config.json') ||
  url.includes('/tokenizer') ||
  url.includes('/onnx/');

const inspectTransformersCache = async (url: string): Promise<boolean | 'unavailable'> => {
  if (typeof caches === 'undefined') return 'unavailable';

  try {
    const cache = await caches.open('transformers-cache');
    return Boolean(await cache.match(url));
  } catch (error) {
    console.warn('[semanticDateEmbeddingEval] unable to inspect transformers-cache', {
      url,
      error,
    });
    return 'unavailable';
  }
};

const prefixText = (text: string, kind: 'query' | 'document'): string => {
  const trimmed = text.trim();
  return kind === 'query' ? `検索クエリ: ${trimmed}` : `検索文書: ${trimmed}`;
};

const normalizeVector = (vector: number[]): number[] => {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const magnitude = Math.sqrt(sum);
  return magnitude ? vector.map((value) => value / magnitude) : vector;
};

const readFirstVector = (output: Awaited<ReturnType<FeatureExtractionPipeline>>): number[] => {
  if (typeof output?.tolist === 'function') {
    const list = output.tolist();
    if (Array.isArray(list[0])) return (list as number[][])[0] ?? [];
    return list as number[];
  }

  if (output?.data && output?.dims?.length) {
    const data = Array.from(output.data);
    const width = output.dims[output.dims.length - 1];
    if (typeof width === 'number' && width > 0) return data.slice(0, width);
  }

  return [];
};

const embed = async (
  extractor: FeatureExtractionPipeline,
  text: string,
  kind: 'query' | 'document'
): Promise<number[]> => {
  const output = await extractor(prefixText(text, kind), {
    pooling: 'mean',
    normalize: true,
  });

  return normalizeVector(readFirstVector(output));
};

const describeEmbeddingEval = RUN_EVAL ? describe : describe.skip;

describeEmbeddingEval('semantic date embedding evaluation', () => {
  it(
    'separates date-like document values from arbitrary date-field text',
    async () => {
      if (!MODEL_ID || !MODEL_REMOTE_HOST) {
        throw new Error(
          'Set VITE_BROWSER_EMBED_MODEL_ID and VITE_BROWSER_EMBED_MODEL_HOST before running embedding eval.'
        );
      }

      const { env, pipeline } = await import('@huggingface/transformers');
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
          console.log('[semanticDateEmbeddingEval] ONNX fetch remapped by VITE_BROWSER_EMBED_MODEL_ONNX_FILE', {
            requestedUrl,
            finalUrl,
            configuredOnnxFile: MODEL_ONNX_FILE,
            cacheHitBeforeFetch,
          });
        }

        if (isHuggingFaceUrl(finalUrl)) {
          console.error('[semanticDateEmbeddingEval] UNEXPECTED Hugging Face fetch attempted', {
            requestedUrl,
            finalUrl,
            model: MODEL_ID,
            remoteHost: MODEL_REMOTE_HOST,
            cacheHitBeforeFetch,
          });
        } else if (logModelFetch) {
          console.log('[semanticDateEmbeddingEval] model asset fetch', {
            requestedUrl,
            finalUrl,
            remapped,
            fromConfiguredRemoteHost: finalUrl.startsWith(MODEL_REMOTE_HOST),
            cacheName: 'transformers-cache',
            cacheHitBeforeFetch,
          });
        }

        return fetchModelFile(remappedInput, init);
      };

      const extractor = await pipeline('feature-extraction', MODEL_ID, {
        device: 'cpu',
        dtype: MODEL_DTYPE as any,
      }) as FeatureExtractionPipeline;

      const query = '2026-01-01 から 2026-12-31';
      const positiveDocuments = [
        '2026年',
        '2026 spring',
        '2026年の春',
        '2026年度',
        '2026-06ごろ',
      ];
      const weakTemporalDocuments = [
        '2024-spring',
        '去年の夏',
        '春ごろ',
      ];
      const arbitraryDocuments = [
        'ほげほげ',
        '買い物メモ',
        '会議の議事録',
        'ラーメン食べたい',
      ];

      const queryEmbedding = await embed(extractor, query, 'query');
      const score = async (text: string) => ({
        text,
        similarity: computeCosineSimilarity(queryEmbedding, await embed(extractor, text, 'document')),
      });

      const positives = await Promise.all(positiveDocuments.map(score));
      const weakTemporals = await Promise.all(weakTemporalDocuments.map(score));
      const arbitrary = await Promise.all(arbitraryDocuments.map(score));

      const positiveMin = Math.min(...positives.map((item) => item.similarity));
      const arbitraryMax = Math.max(...arbitrary.map((item) => item.similarity));
      const weakTemporalMax = Math.max(...weakTemporals.map((item) => item.similarity));
      const recommendedThreshold = Number(((positiveMin + arbitraryMax) / 2).toFixed(4));

      console.table([
        ...positives.map((item) => ({ group: 'positive', ...item })),
        ...weakTemporals.map((item) => ({ group: 'weakTemporal', ...item })),
        ...arbitrary.map((item) => ({ group: 'arbitrary', ...item })),
      ]);
      console.log('[semanticDateEmbeddingEval] summary', {
        model: MODEL_ID,
        query,
        positiveMin,
        weakTemporalMax,
        arbitraryMax,
        recommendedThreshold,
      });

      expect(positiveMin).toBeGreaterThan(arbitraryMax);
      expect(positiveMin).toBeGreaterThan(DEFAULT_SEMANTIC_DATE_THRESHOLD);
      expect(arbitraryMax).toBeLessThan(DEFAULT_SEMANTIC_DATE_THRESHOLD);
    },
    180_000
  );
});
