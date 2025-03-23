import { Memo } from '../types/memo';

export const useFilteredMemos = (memos: Memo[], filterQuery: string): Memo[] => {
  return memos.filter((memo) => {
    if (!filterQuery) return true;

    const queryParts = filterQuery.split(' ');
    let include = false;
    let exclude = false;

    queryParts.forEach((part, index) => {
      if (part.startsWith('-') || part.startsWith('NOT')) {
        const tag = part.replace(/^(NOT|-)/, '');
        if (memo.tags.includes(tag)) exclude = true; // NOT検索
      } else if (part === 'OR') {
        const nextTag = queryParts[index + 1];
        if (nextTag && memo.tags.includes(nextTag)) include = true;
      } else if (part === 'AND') {
        // ANDは明示的に無視（デフォルトでAND検索）
      } else {
        if (!include) include = memo.tags.includes(part); // AND検索
      }
    });

    return include && !exclude;
  });
};