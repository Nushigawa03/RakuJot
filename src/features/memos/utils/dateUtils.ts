// 日付パース・日付クエリ生成のユーティリティ（日付は YYYY-MM-DD 文字列で扱う）
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
const lastDayOf = (y: number, m: number) => new Date(y, m, 0).getDate(); // m は 1 始まり

export const formatDate = (d: Date) => ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
export const todayString = () => formatDate(new Date());

const RELATIVE_YEAR: Record<string, number> = { 一昨年: -2, 去年: -1, 今年: 0, 来年: 1 };
const RELATIVE_MONTH: Record<string, number> = { 先々月: -2, 先月: -1, 来月: 1 };
const RELATIVE_DAY: Record<string, number> = { 昨日: -1, 今日: 0, 明日: 1 };
const SEASON: Record<string, [start: number, end: number]> = { 春: [3, 5], 夏: [6, 8], 秋: [9, 11], 冬: [12, 14] };

const yearRange = (y: number, preferEnd: boolean) => (preferEnd ? ymd(y, 12, 31) : ymd(y, 1, 1));
const monthRange = (y: number, m: number, preferEnd: boolean) => (preferEnd ? ymd(y, m, lastDayOf(y, m)) : ymd(y, m, 1));

/**
 * 「2024年3月」「去年の夏」「先月」「昨日」のような曖昧な日付表現を、
 * 区間の開始日（preferEnd=false）または終了日（preferEnd=true）に変換する。
 */
export function parseFuzzyDate(input: string, preferEnd: boolean): string | null {
  const cy = new Date().getFullYear();
  const s = (input || '')
    .trim()
    .replace(/(?:くらい|ぐらい|ごろ|頃|あたり|らへん|前後)$/, '')
    .replace(/^(一昨年|去年|今年|来年)の?(春|夏|秋|冬)$/, (_m, year, season) => `${cy + RELATIVE_YEAR[year]}年${season}`);
  if (!s) return null;

  const jp = s.match(/^(\d{4})年(?:\s*(\d{1,2})月(?:\s*(\d{1,2})日?)?)?$/);
  if (jp) {
    const [y, m, d] = [Number(jp[1]), Number(jp[2]), Number(jp[3])];
    if (m && d) return ymd(y, m, d);
    return m ? monthRange(y, m, preferEnd) : yearRange(y, preferEnd);
  }

  const season = s.match(/^(?:(\d{4})年)?\s*(春|夏|秋|冬)$/);
  if (season) {
    const y = season[1] ? Number(season[1]) : cy;
    const [startMonth, endMonth] = SEASON[season[2]];
    if (!preferEnd) return ymd(y, startMonth, 1);
    const end = new Date(y, endMonth, 0); // 冬は翌年2月末
    return formatDate(end);
  }

  if (s in RELATIVE_YEAR) return yearRange(cy + RELATIVE_YEAR[s], preferEnd);
  const now = new Date();
  if (s in RELATIVE_MONTH) {
    const dt = new Date(now.getFullYear(), now.getMonth() + RELATIVE_MONTH[s], 1);
    return monthRange(dt.getFullYear(), dt.getMonth() + 1, preferEnd);
  }
  if (s in RELATIVE_DAY) return formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + RELATIVE_DAY[s]));

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slash) return ymd(Number(slash[1]), Number(slash[2]), Number(slash[3]));

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

/** 開始・終了の入力から `date:S..E` / `date>=S` / `date<=E` 形式のクエリを作る（逆順なら入れ替え） */
export function buildDateQuery(startRaw: string, endRaw: string) {
  let start = parseFuzzyDate(startRaw, false) || '';
  let end = parseFuzzyDate(endRaw, true) || '';
  if (start && end && start > end) [start, end] = [end, start];
  const query = start && end ? `date:${start}..${end}` : start ? `date>=${start}` : end ? `date<=${end}` : '';
  return { start, end, query };
}

/** 並び替え用キー（不明な日付は空文字 = 最も古い扱い） */
export const memoDateSortKey = (date?: string) =>
  parseFuzzyDate(
    (date || '').replace(/^(\d{4})-(spring|summer|autumn|winter)$/, (_m, y, s) =>
      `${y}年${({ spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as Record<string, string>)[s]}`),
    false,
  ) || '';
