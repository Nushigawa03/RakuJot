// メモ本文から構造化データ（タイトル・タグ・日付・本文）を AI で抽出する
import { generateContent } from "./genaiClient";
import { buildMemoEditInstruction, buildMemoExtractionInstruction } from "./aiPromptBuilder.server";
import type { Tag } from "~/features/memos/types/tags";

export type AiResult = { title?: string; body?: string; tags?: string[]; date?: string | null };

/** モデルの応答テキストから JSON オブジェクトを取り出す（```json フェンスや前後の文章を許容） */
const parseJsonResponse = (text: string): Record<string, unknown> | null => {
  const cleaned = text.trim().replace(/^```\w*\n([\s\S]*?)\n```$/, "$1");
  const [first, last] = [cleaned.indexOf("{"), cleaned.lastIndexOf("}")];
  try {
    return JSON.parse(first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned);
  } catch {
    return null;
  }
};

async function runJsonPrompt(systemInstruction: string, contents: string, preferredApiKey?: string): Promise<AiResult> {
  const apiKey = preferredApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY or GOOGLE_API_KEY not set; skipping AI processing");
    return {};
  }
  try {
    const response = await generateContent({ apiKey: preferredApiKey, contents, config: { systemInstruction, temperature: 0.1 } });
    const parsed = parseJsonResponse(response.text ?? "");
    if (!parsed) {
      console.warn("Failed to parse Gemini JSON response");
      return {};
    }
    const result: AiResult = {};
    if (parsed.title) result.title = String(parsed.title);
    if (parsed.body) result.body = String(parsed.body);
    if (Array.isArray(parsed.tags)) result.tags = parsed.tags.map(String);
    if (parsed.date !== undefined) result.date = parsed.date === null ? null : String(parsed.date);
    return result;
  } catch (e) {
    console.error("AI processing error", e);
    return {};
  }
}

/** 新規メモの本文からタイトル・タグ・日付を推定する */
export const aiMemoProcessor = (content: string, tags?: Tag[], preferredApiKey?: string) =>
  runJsonPrompt(
    `You are a JSON extractor. ${buildMemoExtractionInstruction(tags)} The user's memo content will be provided as the input text. Return ONLY a JSON object with keys title, tags, date when possible.`,
    content,
    preferredApiKey,
  );

/** 既存メモに編集指示（例: 「明後日に変更」）を適用する */
export const aiMemoEditor = (original: string, instruction: string, tags?: Tag[], preferredApiKey?: string) =>
  runJsonPrompt(
    `You are a JSON editor. ${buildMemoEditInstruction(tags)} The input text will contain ORIGINAL and INSTRUCTION sections. Return ONLY a JSON object with keys title, body, tags, date.`,
    `ORIGINAL:\n${original}\n\nINSTRUCTION:\n${instruction}`,
    preferredApiKey,
  );
