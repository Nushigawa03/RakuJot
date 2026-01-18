import { GoogleGenAI } from "@google/genai";

// Centralized GenAI client for all AI calls.
// Exports thin wrappers so other modules don't instantiate clients directly.

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("[genaiClient] No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.");
}
const genAI = new GoogleGenAI({ apiKey });

// Models to use in fallback order
const MODEL_PRIMARY = 'gemini-2.5-flash-lite';
const MODEL_SECONDARY = 'gemini-2.0-flash-lite';
const MODEL_TERTIARY = 'gemma-2-27b-it';

const FALLBACK_CHAIN = [MODEL_PRIMARY, MODEL_SECONDARY, MODEL_TERTIARY];

// Default models used when caller doesn't specify `model` in params.
// Note: These defaults are used if no specific model is passed.
// However, the fallback logic below overrides the model if the primary fails.
const DEFAULT_GENERATE_MODEL = process.env.DEFAULT_GENERATE_MODEL || MODEL_PRIMARY;
const DEFAULT_EMBED_MODEL = process.env.DEFAULT_EMBED_MODEL || 'text-embedding-004';

/**
 * 429 Quota Exceeded error handling wrapper.
 * Retries with the next model in the chain if the error code is 429.
 */
async function callWithFallback<T>(
  operation: (model: string) => Promise<T>,
  initialModel: string = DEFAULT_GENERATE_MODEL
): Promise<T> {
  // If the initial model is not in our fallback chain (e.g. custom model passed),
  // we just try it once and don't do fallback (or arguably we could fall back to our chain?).
  // For now, let's assume if it matches one of our known models or is the default, we use the chain starting from there.

  let startIndex = FALLBACK_CHAIN.indexOf(initialModel);
  if (startIndex === -1) {
    // If unknown model, try it once. If it fails, maybe we shouldn't fallback to completely different models implicitly.
    // But per user request "Gemini 2.5 -> 2.0 -> Gemma", let's assume this applies to general generation calls.
    // If the user explicitly requested a specific model that isn't in our chain, we might want to respect that?
    // Let's stick to the requested behavior: if it falls, try the chain.
    // But wait, if I ask for "gemini-pro-vision", falling back to "gemma" might not work if I need vision.
    // For this specific task, the user said "Gemini 2.5 Flash-LiTe -> ...".
    // Let's assume we start the chain.
    startIndex = 0;
  }

  let lastError: any;

  for (let i = startIndex; i < FALLBACK_CHAIN.length; i++) {
    const model = FALLBACK_CHAIN[i];
    try {
      console.debug(`[genaiClient] Trying model: ${model}`);
      return await operation(model);
    } catch (error: any) {
      lastError = error;
      // Check for 429 (Quota Exceeded) or 503 (Service Unavailable - sometimes good to retry)
      // The user specifically mentioned "You exceeded your current quota" which is 429.
      const isQuotaExceeded = error?.message?.includes('429') || error?.status === 429 || error?.code === 429 || error?.message?.includes('Quota exceeded');

      if (isQuotaExceeded) {
        console.warn(`[genaiClient] Model ${model} failed with 429. Falling back...`);
        continue;
      }

      // If it's not a quota error, rethrow immediately (e.g. invalid argument)
      throw error;
    }
  }

  throw lastError;
}

export async function generateContent(params: any) {
  const requestedModel = params?.model || DEFAULT_GENERATE_MODEL;

  return callWithFallback(async (model) => {
    const final = { ...params, model };
    // Use the existing client method which accepts the model in the params
    return genAI.models.generateContent(final as any);
  }, requestedModel);
}

export async function embedContent(params: any) {
  // For embeddings, usually we stick to one model because dimensions must match.
  // Swapping embedding models on the fly is dangerous if the vector DB expects a specific dimension/latent space.
  // The user request specifically mentioned the generation models "Gemini ... -> Gemma ...".
  // I will NOT apply fallback to embeddings unless explicitly asked, as it breaks vector search compatibility.
  // But I will keep the code clean.
  const final = { ...params, model: params?.model || DEFAULT_EMBED_MODEL };
  return genAI.models.embedContent(final as any);
}
