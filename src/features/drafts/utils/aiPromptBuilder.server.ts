import type { Tag } from "../types/tags";

/**
 * Build a systemInstruction string for the AI that includes current time and available tags.
 * The memo text will be provided separately as the model input (contents).
 *
 * This builder:
 * - Embeds current server ISO time and local (Asia/Tokyo) representation.
 * - Emits a trimmed list of tags (name: description).
 * - Provides explicit rules for parsing relative dates (今日/明日/来週/日付形式) and weekday references (先週の金曜日など).
 * - Gives multiple JSON examples (input -> expected JSON) to teach the extractor.
 */
export function buildMemoExtractionInstruction(tags?: Tag[]): string {
  const now = new Date();
  const iso = now.toISOString();
  let local = '';
  try {
    local = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  } catch {
    local = now.toString();
  }

  // helpers
  const toDateJST = (d: Date) => {
    try {
      return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD
    } catch {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  };
  const weekdayNamesJP = ['日', '月', '火', '水', '木', '金', '土'];

  // calculate helper dates
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // helper to compute date for "今週/先週/来週 の X曜日"
  const getDateForWeekday = (base: Date, targetDow: number, weekOffset = 0) => {
    // Compute the date for targetDow (0=Sun..6=Sat) in the week relative to `base`.
    // weekOffset: 0 = this week, -1 = previous week, +1 = next week, etc.
    // Approach: find startOfWeek (Sunday) for the base date, then add targetDow and weekOffset*7 days.
    const baseCopy = new Date(base);
    const baseDow = baseCopy.getDay(); // 0..6
    const startOfWeek = new Date(baseCopy);
    startOfWeek.setHours(0, 0, 0, 0);
    // move back to Sunday of the current week
    startOfWeek.setDate(baseCopy.getDate() - baseDow + weekOffset * 7);
    const result = new Date(startOfWeek);
    result.setDate(startOfWeek.getDate() + targetDow);
    return result;
  };

  // Example: last week's Friday
  const lastWeekFriday = getDateForWeekday(now, 5, -1); // 5 == Friday

  // next week's Monday and Friday (for range examples)
  const nextWeekMonday = getDateForWeekday(now, 1, 1);
  const nextWeekFriday = getDateForWeekday(now, 5, 1);

  // current weekday string
  const currentWeekday = weekdayNamesJP[now.getDay()];

  let sb = '';
  sb += `Current server time (ISO): ${iso}. Local (Asia/Tokyo): ${local}. Today is ${currentWeekday}曜日.\n\n`;

  sb += 'Available tags (name: description):\n';
  if (!tags || tags.length === 0) {
    sb += '  (no predefined tags)\n';
  } else {
    for (const t of tags) {
      const desc = t.description ? `: ${t.description}` : '';
      sb += `  - ${t.name}${desc}\n`;
    }
  }

  sb += '\nParsing rules:\n';
  sb += '  - Detect explicit dates (YYYY-MM-DD / YYYY/MM/DD / YYYY年MM月DD日) and return date as YYYY-MM-DD in Japan time (Asia/Tokyo).\n';
  sb += '  - Recognize relative Japanese terms and convert to exact YYYY-MM-DD using server date/time and Japan timezone provided above:\n';
  sb += `      "今日" -> ${toDateJST(now)} (same date),\n`;
  sb += `      "明日" -> ${toDateJST(tomorrow)} (next day),\n`;
  sb += `      "来週" or "来週のXX" -> ${toDateJST(nextWeek)} (add 7 days as base). \n`;
  sb += '  - Weekday references:\n';
  sb += '      - "今週のX曜日": that weekday in the current week (use Asia/Tokyo week where week starts Sunday).\n';
  sb += '      - "先週のX曜日": the weekday in the previous week (compute target weekday in current week then subtract 7 days).\n';
  sb += '      - "来週のX曜日": the weekday in the next week (compute then add 7 days).\n';
  sb += `      Example: "先週の金曜日" -> ${toDateJST(lastWeekFriday)} (compute using server date)\n`;
  sb += '  - IMPORTANT: For vague PERIOD expressions (examples: "去年の夏", "来年の春", "来月"), DO NOT convert them into a precise YYYY-MM-DD or an explicit range.\n';
  sb += '      - ABSOLUTELY NEVER convert vague/seasonal expressions (like "去年の夏", "来年の春", "夏ごろ", "春前後") into a YYYY-MM-DD or any specific date.\n';
  sb += '      - If the input contains words like "夏", "春", "秋", "冬", "ごろ", "くらい", "前後", "頃", or similar, you MUST NOT output a YYYY-MM-DD.\n';
  sb += '      - Instead, preserve vague qualifiers (くらい／ごろ／前後). Normalize any resolvable part (year/month) but keep the ambiguity marker in the string. Treat colloquial variants without the particle "の" as equivalent (e.g. "去年春" == "去年の春").\n';
  sb += '      - If you are unsure, prefer to keep the original vague expression (e.g. "2024年夏", "2025年春頃") in the date field.\n';
  sb += `          "去年の夏" -> "${new Date().getFullYear() - 1}年夏"\n`;
  sb += `          "来年の春" -> "${new Date().getFullYear() + 1}年春"\n`;
  sb += `          "来年の春くらい" -> "${new Date().getFullYear() + 1}年春頃"\n`;
  sb += `          "去年の夏前後" -> "${new Date().getFullYear() - 1}年夏前後"\n`;
  sb += '          "来月" -> "YYYY-MM" (e.g. "2025-12")\n';
  sb += '      - DO NOT convert these to precise YYYY-MM-DD or to date_from/date_to. Only set date_from/date_to for explicit numeric ranges or clear multi-day ranges (e.g. "11/10-11/14", "来週の平日").\n';
  sb += '  - If a time like "19:00" or "午後7時" appears, prefer returning date-only (YYYY-MM-DD). If time is crucial, the system may ignore it unless explicitly requested.\n';
  sb += '  - Use Asia/Tokyo rules for relative date interpretation.\n\n';

  sb += 'Tag matching rules:\n';
  sb += '  - Match available tag names case-insensitively and ignore surrounding whitespace.\n';
  sb += '  - If memo contains keywords strongly associated with a tag (e.g. "会議","プレゼン" -> 仕事), choose that tag.\n';
  sb += '  - If no available tag matches, return an empty array. Do not invent new tag names.\n\n';

  sb += 'Output format rules (VERY IMPORTANT):\n';
  sb += '  - Return ONLY valid JSON (no markdown, no backticks, no surrounding text).\n';
  sb += '  - JSON keys: title (string), tags (string[]), date (YYYY-MM-DD in Japan time or null).\n';
  sb += '  - If the memo implies a date RANGE (e.g. "来週の平日", "11/10-11/14"), set `date` to the earliest date (YYYY-MM-DD) AND also return `date_from` and `date_to` (both YYYY-MM-DD) to represent the range. If no range, `date_from`/`date_to` may be omitted or null.\n';
  sb += '  - Always include keys. Example: { "title": "...", "tags": [], "date": null }\n\n';

  sb += 'Examples (model input is the user memo; below are expected JSON outputs):\n';
  sb += '\nExample: weekday-relative\n';
  sb += '  Memo: "先週の金曜日に飲み会"\n';
  sb += `  Expected JSON: { "title": "先週の金曜日に飲み会", "tags": [], "date": "${toDateJST(lastWeekFriday)}" }\n\n`;

  sb += '\nExample 1\n';
  sb += '  Memo: "明日プレゼン資料作成。"\n';
  sb += `  Expected JSON: { "title": "明日プレゼン資料作成", "tags": ["仕事"], "date": "${toDateJST(tomorrow)}" }\n\n`;

  sb += '\nExample (range)\n';
  sb += '  Memo: "来週の平日に会議を設定する"\n';
  sb += `  Expected JSON: { "title": "来週の平日に会議を設定する", "tags": ["仕事"], "date": "${toDateJST(nextWeekMonday)}", "date_from": "${toDateJST(nextWeekMonday)}", "date_to": "${toDateJST(nextWeekFriday)}" }\n\n`;

  sb += 'Example 2\n';
  sb += '  Memo: "買い物: 卵、牛乳。"\n';
  sb += '  Expected JSON: { "title": "買い物: 卵、牛乳。", "tags": [], "date": null }\n\n';

  sb += 'Example 3 (explicit date)\n';
  sb += '  Memo: "2025-12-01 に歯医者予約"\n';
  sb += `  Expected JSON: { "title": "歯医者予約", "tags": [], "date": "2025-12-01" }\n\n`;

  sb += '\nInstruction summary: Given the user memo (provided separately as model input), extract a short title, an array of existing tags (use available tags when appropriate), and a single date in YYYY-MM-DD (Japan time) if present. Convert relative Japanese date words and weekday references (e.g. "先週の金曜日") into exact YYYY-MM-DD using the Current server time above and Asia/Tokyo rules. Return ONLY the exact JSON object—no commentary, no markdown, no extra characters.\n';

  return sb;
}