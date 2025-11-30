import { Memo } from '../types/memo';

const parseDate = (date?: string): number => {
  if (!date || date === 'unknown') return 0;

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

  return new Date(date).getTime();
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
      comparison = parseDate(b.date) - parseDate(a.date);
    } else if (sortKey === 'title') {
      comparison = a.title.localeCompare(b.title, 'ja');
    }

    return sortOrder === 'asc' ? -comparison : comparison;
  });
};