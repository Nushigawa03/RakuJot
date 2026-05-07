/**
 * clientSearchParser.ts
 * 
 * クライアント側ヒューリスティック検索パーサー。
 * オフライン対応・高速動作のため、サーバーAPIを呼ばずに
 * 日付キーワード・タグを抽出する。
 * 
 * サーバー側のheuristicParseと同等のロジックだが、
 * クライアントで即座に実行可能。
 */

export interface ClientParsedResult {
  start: string | null;
  end: string | null;
  tag: string | null;
  residualQuery: string;  // 日付・タグを除去した残りのテキスト
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function lastDayOf(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

/**
 * 日本語の日付キーワードとタグをクライアント側でパースする。
 * 「先々月」を「先月」より先に評価し、和暦年月日もサポート。
 */
export function clientParseSearch(text: string, availableTagNames: string[]): ClientParsedResult {
  const s = (text || '').trim();
  const now = new Date();
  const cy = now.getFullYear();

  const result: ClientParsedResult = {
    start: null,
    end: null,
    tag: null,
    residualQuery: s,
  };

  if (!s) return result;

  // ─── 日付キーワード抽出（順序重要: 長いパターンを先に評価） ─────

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
      // ISO日付: 2024-03-15
      else {
        const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          result.start = isoMatch[1];
          result.end = isoMatch[1];
        }
        // 相対日付（順序重要: 先々月を先月より先に）
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
  }

  // ─── 残りのテキストからタグを抽出 ─────────────────────

  // 日付キーワードを除去して残りを取得
  let cleaned = s.replace(
    /(一昨年|先々月|先月|来月|去年|今年|来年|今日|昨日|明日|\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|\d{4}年|\d{4}-\d{2}-\d{2}|春|夏|秋|冬)/g,
    ''
  );
  // 助詞等の除去
  cleaned = cleaned
    .replace(/^[\s・]*(の|のための|のため|の記録|に関する|について)+[\s・]*/g, '')
    .replace(/[\s・]*(の|のための|のため|の記録|に関する|について)+[\s・]*$/g, '')
    .trim();

  if (cleaned) {
    // 利用可能なタグ名と照合（case-insensitive）
    const parts = cleaned.split(/\s+|の/).filter(Boolean);
    for (const part of parts) {
      const found = availableTagNames.find(
        t => t.toLowerCase() === part.toLowerCase()
      );
      if (found) {
        result.tag = found;
        // タグ部分を残りクエリから除去
        const escapedTag = found.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(escapedTag, 'gi'), '').trim();
        break;
      }
    }
    // タグマッチしなかった場合、部分一致も試みる
    if (!result.tag) {
      for (const part of parts) {
        const found = availableTagNames.find(
          t => t.toLowerCase().includes(part.toLowerCase())
        );
        if (found) {
          result.tag = found;
          cleaned = cleaned.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
          break;
        }
      }
    }
  }

  // 助詞の再除去
  cleaned = cleaned
    .replace(/^[\s・]*(の|のための|のため|の記録|に関する|について)+[\s・]*/g, '')
    .replace(/[\s・]*(の|のための|のため|の記録|に関する|について)+[\s・]*$/g, '')
    .trim();

  result.residualQuery = cleaned;

  return result;
}
