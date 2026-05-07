import { Memo } from '../types/memo';

const parseDate = (date?: string): number => {
  if (!date || date === 'unknown') return -Infinity;

  // 英語季節表現
  if (date.includes('spring')) {
    return new Date(date.replace('spring', '03-01')).getTime();
  } else if (date.includes('summer')) {
    return new Date(date.replace('summer', '06-01')).getTime();
  } else if (date.includes('autumn')) {
    return new Date(date.replace('autumn', '09-01')).getTime();
  } else if (date.includes('winter')) {
    return new Date(date.replace('winter', '12-01')).getTime();
  }

  // 和暦季節表現（例: 2024年夏, 2024年春, 2024年秋, 2024年冬）
  const jpSeasonMatch = date.match(/(\d{4})年(春|夏|秋|冬)/);
  if (jpSeasonMatch) {
    const year = jpSeasonMatch[1];
    const season = jpSeasonMatch[2];
    let month = '01';
    switch (season) {
      case '春': month = '03'; break;
      case '夏': month = '06'; break;
      case '秋': month = '09'; break;
      case '冬': month = '12'; break;
    }
    return new Date(`${year}-${month}-01`).getTime();
  }

  // 和暦年月日: 2024年3月15日
  const ymdMatch = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return new Date(`${y}-${m}-${d}`).getTime();
  }

  // 和暦年月: 2024年3月
  const ymMatch = date.match(/(\d{4})年(\d{1,2})月/);
  if (ymMatch) {
    const y = ymMatch[1];
    const m = ymMatch[2].padStart(2, '0');
    return new Date(`${y}-${m}-01`).getTime();
  }

  // 和暦年のみ: 2024年
  const yMatch = date.match(/(\d{4})年/);
  if (yMatch) {
    return new Date(`${yMatch[1]}-01-01`).getTime();
  }

  const parsed = new Date(date).getTime();
  return isNaN(parsed) ? -Infinity : parsed;
};

export const useSortedMemos = (
  memos: Memo[],
  sortKey: 'date' | 'title',
  sortOrder: 'asc' | 'desc'
): Memo[] => {
  if (!Array.isArray(memos) || memos.length === 0) {
    return [];
  }

  return [...memos].sort((a, b) => {
    let comparison = 0;

    if (sortKey === 'date') {
      // 昇順基準: a - b
      comparison = parseDate(a.date) - parseDate(b.date);
    } else if (sortKey === 'title') {
      // 昇順基準: a.localeCompare(b)
      comparison = (a.title || '').localeCompare(b.title || '', 'ja');
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
};