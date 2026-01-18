// 日付パースやフィルタ適用のユーティリティ
export function parseFuzzyDate(input: string, preferEnd: boolean): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  const now = new Date();
  const cy = now.getFullYear();
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const lastDayOf = (y: number, mZeroBased: number) => new Date(y, mZeroBased + 1, 0).getDate();

  const ymd = s.match(/^\d{4}年(?:\s*(\d{1,2})月(?:\s*(\d{1,2})日?)?)?$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = ymd[2] ? parseInt(ymd[2], 10) : null;
    const d = ymd[3] ? parseInt(ymd[3], 10) : null;
    if (m && d) return `${y}-${pad2(m)}-${pad2(d)}`;
    if (m) {
      if (preferEnd) {
        const last = lastDayOf(y, m - 1);
        return `${y}-${pad2(m)}-${pad2(last)}`;
      }
      return `${y}-${pad2(m)}-01`;
    }
    return preferEnd ? `${y}-12-31` : `${y}-01-01`;
  }

  const season = s.match(/^(?:(\d{4})年)?\s*(春|夏|秋|冬)$/);
  if (season) {
    const y = season[1] ? parseInt(season[1], 10) : cy;
    const seas = season[2];
    if (seas === '春') return preferEnd ? `${y}-05-31` : `${y}-03-01`;
    if (seas === '夏') return preferEnd ? `${y}-08-31` : `${y}-06-01`;
    if (seas === '秋') return preferEnd ? `${y}-11-30` : `${y}-09-01`;
    if (seas === '冬') {
      if (preferEnd) {
        const y2 = y + 1;
        const last = lastDayOf(y2, 1);
        return `${y2}-02-${pad2(last)}`;
      }
      return `${y}-12-01`;
    }
  }

  if (/^去年$/.test(s)) {
    const y = cy - 1;
    return preferEnd ? `${y}-12-31` : `${y}-01-01`;
  }
  if (/^一昨年$/.test(s)) {
    const y = cy - 2;
    return preferEnd ? `${y}-12-31` : `${y}-01-01`;
  }
  if (/^今年$/.test(s)) {
    return preferEnd ? `${cy}-12-31` : `${cy}-01-01`;
  }
  if (/^来年$/.test(s)) {
    const y = cy + 1;
    return preferEnd ? `${y}-12-31` : `${y}-01-01`;
  }
  if (/^(先々月|先月|来月)$/.test(s)) {
    let offset = 0;
    if (s === '先月') offset = -1;
    if (s === '先々月') offset = -2;
    if (s === '来月') offset = 1;
    const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    return preferEnd ? `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}` : `${y}-${pad2(m)}-01`;
  }
  if (/^今日$/.test(s)) {
    const dt = now;
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }
  if (/^昨日$/.test(s)) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - 1);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }
  if (/^明日$/.test(s)) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + 1);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }
  try {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  } catch { }
  return null;
}

export function buildDateQuery(startRaw: string, endRaw: string) {
  let start = parseFuzzyDate(startRaw, false) || '';
  let end = parseFuzzyDate(endRaw, true) || '';
  if (start && end) {
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() > e.getTime()) {
        const tmp = start;
        start = end;
        end = tmp;
      }
    } catch { }
  }
  let query = '';
  if (start && end) query = `date:${start}..${end}`;
  else if (start) query = `date>=${start}`;
  else if (end) query = `date<=${end}`;
  return { start, end, query };
}
