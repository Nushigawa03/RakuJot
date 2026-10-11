import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeLocalDb, getAllTags, getAllTagExpressions } from '../../sync/localDb';
import { memoService } from '../services/memoService';

/** IndexedDB を読み、ローカル DB が変わるたびに読み直す */
function useLiveQuery<T>(query: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    let alive = true;
    const run = () => query().then((v) => alive && setValue(v)).catch(console.error);
    run();
    const unsubscribe = subscribeLocalDb(run);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [query]);
  return value;
}

const readMemos = () => memoService.getMemos();
const readTrash = () => memoService.getTrashedMemos();

export const useMemos = () => useLiveQuery(readMemos, []);
export const useTags = () => useLiveQuery(getAllTags, []);
export const useExpressions = () => useLiveQuery(getAllTagExpressions, []);
export const useTrashedMemos = () => useLiveQuery(readTrash, null);

/** タグ ID → タグ名（未知の ID はそのまま表示） */
export function useTagNameOf() {
  const tags = useTags();
  const names = useMemo(() => new Map(tags.map((t) => [t.id, t.name])), [tags]);
  return useCallback((id: string) => names.get(id) ?? id, [names]);
}

/** 曖昧な日付表現を端末内モデルで埋め込む（意味的な日付検索用） */
export function useQueryEmbedding(text: string): number[] | undefined {
  const [embedding, setEmbedding] = useState<number[]>();
  useEffect(() => {
    setEmbedding(undefined);
    if (text.trim().length < 2) return;
    let alive = true;
    import('../../App/services/browserEmbeddingService')
      .then(({ computeBrowserEmbedding }) => computeBrowserEmbedding(text, 'query'))
      .then((v) => alive && v && setEmbedding(v))
      .catch((error) => console.warn('Failed to compute query embedding:', error));
    return () => { alive = false; };
  }, [text]);
  return embedding;
}
