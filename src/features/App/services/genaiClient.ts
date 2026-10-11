import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";

// すべての AI 呼び出しはここを経由する（API キーごとにクライアントを使い回す）
const clients = new Map<string, GoogleGenAI>();

const getClient = (apiKeyOverride?: string) => {
  const apiKey = (apiKeyOverride || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("[genaiClient] No API key available");
  let client = clients.get(apiKey);
  if (!client) clients.set(apiKey, (client = new GoogleGenAI({ apiKey })));
  return client;
};

// 429（クォータ超過）のときは次のモデルで再試行する
const FALLBACK_CHAIN = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemma-2-27b-it"];

const isQuotaExceeded = (error: any) =>
  error?.status === 429 || error?.code === 429 || /429|Quota exceeded/.test(error?.message ?? "");

export async function generateContent({ apiKey, ...params }: Omit<GenerateContentParameters, "model"> & { apiKey?: string; model?: string }) {
  const client = getClient(apiKey);
  const first = params.model || process.env.DEFAULT_GENERATE_MODEL || FALLBACK_CHAIN[0];
  const chain = FALLBACK_CHAIN.includes(first) ? FALLBACK_CHAIN.slice(FALLBACK_CHAIN.indexOf(first)) : [first, ...FALLBACK_CHAIN];
  let lastError: unknown;
  for (const model of chain) {
    try {
      return await client.models.generateContent({ ...params, model });
    } catch (error) {
      if (!isQuotaExceeded(error)) throw error;
      console.warn(`[genaiClient] Model ${model} failed with 429. Falling back...`);
      lastError = error;
    }
  }
  throw lastError;
}
