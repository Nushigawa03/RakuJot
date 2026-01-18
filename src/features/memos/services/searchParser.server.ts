/**
 * searchParser.server.ts
 * 
 * 検索クエリの解析処理を担当するサーバー側ロジック。
 * GenAI呼び出しとヒューリスティック解析のフォールバックを提供。
 */

import { generateContent } from "~/features/App/services/genaiClient";

// ========================================
// Types
// ========================================

export interface ParsedSearchResult {
    source: 'genai' | 'heuristic';
    start: string | null;
    end: string | null;
    tag: string | null;
}

// ========================================
// Utility Functions
// ========================================

function pad2(n: number): string {
    return n.toString().padStart(2, "0");
}

function lastDayOf(year: number, monthZeroBased: number): number {
    return new Date(year, monthZeroBased + 1, 0).getDate();
}

// ========================================
// Heuristic Parser
// ========================================

/**
 * 日本語の日付キーワードとタグを抽出するヒューリスティック解析
 */
function heuristicParse(text: string): Omit<ParsedSearchResult, 'source'> {
    const s = (text || "").trim();
    const now = new Date();
    const cy = now.getFullYear();

    const result: { start: string | null; end: string | null; tag: string | null } = {
        start: null,
        end: null,
        tag: null
    };

    // 相対日付キーワードの処理
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
    } else if (/今日/.test(s)) {
        const dt = now;
        const d = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
        result.start = d;
        result.end = d;
    } else if (/昨日/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - 1);
        const d = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
        result.start = d;
        result.end = d;
    } else if (/明日/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + 1);
        const d = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
        result.start = d;
        result.end = d;
    }

    // タグ抽出: 日付キーワードを除去し、残りをタグ候補として抽出
    const cleaned = s.replace(
        /(先々月|先月|来月|去年|今年|来年|今日|昨日|明日|\d{4}年|\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月|春|夏|秋|冬|の|のための|のため|の記録)/g,
        ""
    ).trim();

    if (cleaned) {
        const parts = cleaned.split(/\s+|の/).filter(Boolean);
        if (parts.length > 0) {
            result.tag = parts[parts.length - 1];
        }
    }

    return result;
}

// ========================================
// AI Parser
// ========================================

/**
 * GenAIを使用して検索クエリを解析
 */
async function aiParse(text: string): Promise<Omit<ParsedSearchResult, 'source'> | null> {
    const prompt = `次の日本語の検索語句を解析して、開始日(start)、終了日(end)（可能ならISO YYYY-MM-DD形式）、および関連するタグ候補(tag)をJSONで返してください。もし日付やタグが特定できない場合はnullを返してください。出力は厳密にJSONのみで行ってください。入力テキスト:\n"""${text}"""`;

    try {
        const res = await generateContent({ contents: prompt });
        // @ts-ignore - library typing may differ
        const output = (res?.text ?? res?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").toString();

        // JSONを抽出
        const jsonMatch = output.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                start: parsed.start ?? null,
                end: parsed.end ?? null,
                tag: parsed.tag ?? null
            };
        }
    } catch (e) {
        console.warn('[searchParser] AI parse failed:', e);
    }

    return null;
}

// ========================================
// Main Export
// ========================================

/**
 * 検索クエリを解析し、日付範囲とタグ候補を抽出する
 * GenAIを試行し、失敗時はヒューリスティック解析にフォールバック
 */
export async function parseSearchQuery(text: string): Promise<ParsedSearchResult> {
    // APIキーがない場合は直接ヒューリスティックを使用
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

    if (!apiKey) {
        return { source: "heuristic", ...heuristicParse(text) };
    }

    // AI解析を試行
    const aiResult = await aiParse(text);
    if (aiResult) {
        return { source: "genai", ...aiResult };
    }

    // フォールバック
    return { source: "heuristic", ...heuristicParse(text) };
}
