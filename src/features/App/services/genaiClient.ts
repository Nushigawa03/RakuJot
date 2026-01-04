import { GoogleGenAI } from "@google/genai";

// Centralized GenAI client for all AI calls.
// Exports thin wrappers so other modules don't instantiate clients directly.

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("[genaiClient] No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.");
}
const genAI = new GoogleGenAI({ apiKey });

// Default models used when caller doesn't specify `model` in params.
const DEFAULT_GENERATE_MODEL = process.env.DEFAULT_GENERATE_MODEL || 'gemini-2.5-flash-lite';
const DEFAULT_EMBED_MODEL = process.env.DEFAULT_EMBED_MODEL || 'text-embedding-004';

export async function generateContent(params: any) {
  const final = { ...params, model: params?.model || DEFAULT_GENERATE_MODEL };
  return genAI.models.generateContent(final as any);
}

export async function embedContent(params: any) {
  const final = { ...params, model: params?.model || DEFAULT_EMBED_MODEL };
  return genAI.models.embedContent(final as any);
}
