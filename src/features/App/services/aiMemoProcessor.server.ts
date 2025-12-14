// AI processor for extracting structured data (title, tags, date) from memo content
// Returns an object like: { title?: string, tags?: string[], date?: string | null }
// This is a shared service used across the application, not specific to memos.

import { GoogleGenAI } from "@google/genai";
import { buildMemoExtractionInstruction } from "./aiPromptBuilder.server";

import type { Tag } from "~/features/memos/types/tags";

export type AiResult = { title?: string; tags?: string[]; date?: string | null };

// accept optional tags so caller can provide current tag list/descriptions
export async function aiMemoProcessor(content: string, tags?: Tag[]): Promise<AiResult> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set; skipping AI processing');
    return {};
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Build instruction using helper so we can include current time and tag list with descriptions
  const promptInstruction = buildMemoExtractionInstruction(tags);

  // Optionally log the full system instruction for debugging. Enable by setting DEBUG_AI_LOG=true in the environment.
  console.debug('[aiMemoProcessor] systemInstruction:', promptInstruction);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      // pass the user's content directly so the model input is exactly the memo text
      contents: content,
      config: {
        systemInstruction: `You are a JSON extractor. ${promptInstruction} The user's memo content will be provided as the input text. Return ONLY a JSON object with keys title, tags, date when possible.`,
        temperature: 0.1,
      },
    } as any);

    // Debug: log raw response object (may contain large data)
    try {
      console.debug('[aiMemoProcessor] raw response object:', JSON.stringify(response));
    } catch (e) {
      console.debug('[aiMemoProcessor] raw response (non-serializable) --', response);
    }

    // Preferred simple property available in examples: response.text
    let text = '';
    if (response && typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else {
      // fallback: try to inspect common response shapes
      try {
        if (Array.isArray((response as any).output)) {
          text = (response as any).output
            .map((o: any) => (o.content || []).map((c: any) => c.text || '').join(''))
            .join('\n');
        } else if (Array.isArray((response as any).candidates)) {
          text = (response as any).candidates.map((c: any) => c.output?.[0]?.content?.[0]?.text || c?.text || '').join('\n');
        } else {
          text = JSON.stringify(response);
        }
      } catch (e) {
        text = JSON.stringify(response);
      }
    }

  // Debug: log extracted text before JSON parse
  console.debug('[aiMemoProcessor] extracted response text:', text);

    // Attempt to extract JSON object from response text
    // Remove common code-fence wrappers (```json ... ```)
    let cleaned = text.trim();
    const mdMatch = cleaned.match(/^```\w*\n([\s\S]*?)\n```$/);
    if (mdMatch && mdMatch[1]) {
      cleaned = mdMatch[1].trim();
    }

    // If still not pure JSON, try to extract the substring from first '{' to last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const jsonText = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

    console.debug('[aiMemoProcessor] jsonText to parse:', jsonText);

    try {
      const parsed = JSON.parse(jsonText);
      const result: AiResult = {};
      if (parsed.title) result.title = String(parsed.title);
      if (Array.isArray(parsed.tags)) result.tags = parsed.tags.map(String);
      if (parsed.date !== undefined) result.date = parsed.date === null ? null : String(parsed.date);
      return result;
    } catch (e) {
      console.warn('Failed to parse Gemini JSON response', e);
      return {};
    }
  } catch (e) {
    console.error('aiMemoProcessor error', e);
    return {};
  }
}
