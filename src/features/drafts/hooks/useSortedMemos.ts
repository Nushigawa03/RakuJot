import { Memo } from '../types/memo';

const parseDate = (date?: string): number => {
  if (!date || date === 'unknown') return 0;

  if (date.includes('spring')) {
    return new Date(date.replace('spring', '03-01')).getTime();
  } else if (date.includes('summer')) {
    return new Date(date.replace('summer', '06-01')).getTime();
  } else if (date.includes('autumn')) {
    return new Date(date.replace('autumn', '09-01')).getTime();
  } else if (date.includes('winter')) {
    return new Date(date.replace('winter', '12-01')).getTime();
  }

  return new Date(date).getTime();
};

export const useSortedMemos = (
  memos: Memo[],
  sortKey: 'date' | 'title',
  sortOrder: 'asc' | 'desc'
): Memo[] => {
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