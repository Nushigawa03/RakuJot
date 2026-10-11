import { useSyncExternalStore } from 'react';
import type { SearchTag } from './types/searchTag';
import type { Tag } from './types/tags';
import { parseSmartQuery } from './utils/search';

/**
 * 検索条件の共有ストア（検索バー・サイドバー・フィルタ表示・メモ一覧が同じ状態を見る）。
 * startDate / endDate は詳細検索の入力値、dateQuery は適用済みの日付条件。
 */
export interface SearchState {
  expressionId: string;
  dateQuery: string;
  semanticDateQuery: string;
  textQuery: string;
  tags: SearchTag[];
  startDate: string | null;
  endDate: string | null;
  /** 検索を実行するたびに増える（スマホでメモ一覧を表示する合図） */
  revision: number;
}

const INITIAL: SearchState = {
  expressionId: '', dateQuery: '', semanticDateQuery: '', textQuery: '', tags: [], startDate: null, endDate: null, revision: 0,
};

let state = INITIAL;
const listeners = new Set<() => void>();

export const getSearchState = () => state;

const set = (patch: Partial<SearchState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useSearch = () => useSyncExternalStore(subscribe, getSearchState, () => INITIAL);

const shown = () => ({ revision: state.revision + 1 });

export const searchActions = {
  /** 検索バーの入力を解析して適用し、テキスト部分（日付・タグを除いた残り）を返す */
  submit(query: string, availableTags: Tag[]): string {
    const { tags, startDate, endDate } = state;
    const result = parseSmartQuery(query, availableTags, { tags, startDate, endDate });
    // 全体検索するのでサイドバーの分類は解除する
    set({ ...result, expressionId: '', ...shown() });
    return result.textQuery;
  },
  setDates: (startDate: string | null, endDate: string | null) => set({ startDate, endDate }),
  addTag(tag: SearchTag) {
    if (state.tags.some((t) => t.id === tag.id && t.isExclude === tag.isExclude)) return;
    set({ tags: [...state.tags, tag], ...shown() });
  },
  removeTag: (tag: SearchTag) =>
    set({ tags: state.tags.filter((t) => !(t.id === tag.id && t.isExclude === tag.isExclude)) }),
  clearDate: () => set({ dateQuery: '', semanticDateQuery: '', startDate: null, endDate: null }),
  /** 同じ分類をもう一度選ぶと解除 */
  toggleExpression: (id: string) => set({ expressionId: state.expressionId === id ? '' : id }),
  clear: () => set({ ...INITIAL, expressionId: state.expressionId, revision: state.revision }),
};
