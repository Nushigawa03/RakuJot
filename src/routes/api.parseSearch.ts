import type { ActionFunction } from "react-router";
import { GoogleGenAI } from "@google/genai";

// Simple heuristic parser (server-side) for Japanese date + tag extraction.
function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function lastDayOf(y: number, mZeroBased: number) {
  return new Date(y, mZeroBased + 1, 0).getDate();
}

function heuristicParse(text: string) {
  const s = (text || "").trim();
  const now = new Date();
  const cy = now.getFullYear();

  const result: { start?: string | null; end?: string | null; tag?: string | null } = { start: null, end: null, tag: null };

  // Try relative keywords
  if (/先月/.test(s)) {
    const dt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    result.start = `${y}-${pad2(m)}-01`;
    result.end = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}`;
  } else if (/先々月/.test(s)) {
    const dt = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    result.start = `${y}-${pad2(m)}-01`;
    result.end = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}`;
  } else if (/来月/.test(s)) {
    const dt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    result.start = `${y}-${pad2(m)}-01`;
    result.end = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}`;
  } else if (/去年/.test(s)) {
    const y = cy - 1;
    result.start = `${y}-01-01`;
    result.end = `${y}-12-31`;
  } else if (/今年/.test(s)) {
    result.start = `${cy}-01-01`;
    result.end = `${cy}-12-31`;
  }

  // Simple tag extraction: remove known date words and particles, take last token
  const cleaned = s.replace(/(先々月|先月|来月|去年|今年|来年|今日|昨日|明日|\d{4}年|\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月|春|夏|秋|冬|の|のための|のため|の記録)/g, "").trim();
  if (cleaned) {
    // split by spaces or Japanese particle 'の'
    const parts = cleaned.split(/\s+|の/).filter(Boolean);
    if (parts.length > 0) {
      result.tag = parts[parts.length - 1];
    }
  }

  return result;
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const body = await request.json();
  const text = (body?.text || "").toString();

  // Try to use GoogleGenAI if API key exists; otherwise fallback to heuristic
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!text) return Response.json({ error: "text required" }, { status: 400 });

  if (!apiKey) {
    const heuristic = heuristicParse(text);
    return Response.json({ source: "heuristic", ...heuristic });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });
    // Prompt asking for strict JSON output
    const prompt = `次の日本語の検索語句を解析して、開始日(start)、終了日(end)（可能ならISO YYYY-MM-DD形式）、および関連するタグ候補(tag)をJSONで返してください。もし日付やタグが特定できない場合はnullを返してください。出力は厳密にJSONのみで行ってください。入力テキスト:\n"""${text}"""`;

    // best-effort: use models.generate if available
    // Fallback: do heuristic parse if model call fails
    try {
      // @ts-ignore - library typing may differ
      const res = await genAI.models.generate({ model: 'gemini-2.5-flash-lite', input: prompt });
      const output = (res?.output?.[0]?.content ?? res?.candidates?.[0]?.content ?? "").toString();
      // try to extract JSON from output
      const jsonMatch = output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return Response.json({ source: "genai", start: parsed.start ?? null, end: parsed.end ?? null, tag: parsed.tag ?? null });
        } catch (e) {
          // fall through to heuristic
          console.warn('[api.parseSearch] failed to parse JSON from model output', e);
        }
      }
    } catch (genErr) {
      console.warn('[api.parseSearch] genAI call failed, falling back to heuristic', genErr);
    }

    const heuristic = heuristicParse(text);
    return Response.json({ source: "heuristic", ...heuristic });
  } catch (e) {
    console.error('[api.parseSearch] unexpected error', e);
    const heuristic = heuristicParse(text);
    return Response.json({ source: "heuristic", ...heuristic });
  }
};
