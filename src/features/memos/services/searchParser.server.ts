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
 * 注意: パターンの順序が重要（先々月 → 先月の順で評価すること）
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

    // 和暦年月日: 2024年3月15日
    const ymdMatch = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10);
        const d = parseInt(ymdMatch[3], 10);
        const dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
        result.start = dateStr;
        result.end = dateStr;
    }
    // 和暦年月: 2024年3月
    else {
        const ymMatch = s.match(/(\d{4})年(\d{1,2})月/);
        if (ymMatch) {
            const y = parseInt(ymMatch[1], 10);
            const m = parseInt(ymMatch[2], 10);
            result.start = `${y}-${pad2(m)}-01`;
            result.end = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}`;
        }
        // 和暦年のみ: 2024年
        else {
            const yMatch = s.match(/(\d{4})年/);
            if (yMatch) {
                const y = parseInt(yMatch[1], 10);
                result.start = `${y}-01-01`;
                result.end = `${y}-12-31`;
            }
            // 相対日付キーワード（順序重要: 先々月を先月より先に評価）
            else if (/一昨年/.test(s)) {
                const y = cy - 2;
                result.start = `${y}-01-01`;
                result.end = `${y}-12-31`;
            } else if (/先々月/.test(s)) {
                const dt = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                const y = dt.getFullYear();
                const m = dt.getMonth() + 1;
                result.start = `${y}-${pad2(m)}-01`;
                result.end = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}`;
            } else if (/先月/.test(s)) {
                const dt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
            } else if (/来年/.test(s)) {
                const y = cy + 1;
                result.start = `${y}-01-01`;
                result.end = `${y}-12-31`;
            } else if (/今年/.test(s)) {
                result.start = `${cy}-01-01`;
                result.end = `${cy}-12-31`;
            } else if (/今日/.test(s)) {
                const d = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
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
            // 季節表現
            else {
                const seasonMatch = s.match(/(?:(\d{4})年)?\s*(春|夏|秋|冬)/);
                if (seasonMatch) {
                    const y = seasonMatch[1] ? parseInt(seasonMatch[1], 10) : cy;
                    const season = seasonMatch[2];
                    if (season === '春') { result.start = `${y}-03-01`; result.end = `${y}-05-31`; }
                    else if (season === '夏') { result.start = `${y}-06-01`; result.end = `${y}-08-31`; }
                    else if (season === '秋') { result.start = `${y}-09-01`; result.end = `${y}-11-30`; }
                    else if (season === '冬') { result.start = `${y}-12-01`; result.end = `${y + 1}-02-${pad2(lastDayOf(y + 1, 1))}`; }
                }
            }
        }
    }

    // タグ抽出: 日付キーワードを除去し、残りをタグ候補として抽出
    const cleaned = s.replace(
        /(一昨年|先々月|先月|来月|去年|今年|来年|今日|昨日|明日|\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|\d{4}年|\d{4}-\d{2}-\d{2}|春|夏|秋|冬|の|のための|のため|の記録)/g,
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

            const extractString = (val: any) => {
                if (Array.isArray(val)) return val.length > 0 ? String(val[0]) : null;
                return val ? String(val) : null;
            };

            return {
                start: extractString(parsed.start),
                end: extractString(parsed.end),
                tag: extractString(parsed.tag)
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
 * 検索クエリを解析し、日付範囲とタグ候補を抽出する。
 * まずヒューリスティック解析を試み、結果が得られない場合のみGenAIにフォールバック。
 */
export async function parseSearchQuery(text: string): Promise<ParsedSearchResult> {
    console.debug('[searchParser] parsing:', text);

    // 1. まずヒューリスティック解析を試行（高速・確実）
    const heuristicResult = heuristicParse(text);
    if (heuristicResult.start || heuristicResult.end || heuristicResult.tag) {
        return { source: "heuristic", ...heuristicResult };
    }

    // 2. ヒューリスティックで解決できない場合のみAI解析（曖昧なクエリ用）
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    if (apiKey) {
        const aiResult = await aiParse(text);
        if (aiResult) {
            return { source: "genai", ...aiResult };
        }
    }

    // 3. 両方失敗 → 空結果を返す
    return { source: "heuristic", ...heuristicResult };
}

