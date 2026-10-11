import { useCallback, useEffect, useRef, useState } from 'react';

export interface MemoData {
  title: string;
  body: string;
  date: string;
  tags: string[]; // タグ名
}

const AUTOSAVE_DELAY = 1500;
const same = (a?: MemoData, b?: MemoData) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 編集フォームの状態・自動保存・取り消し履歴。
 * 入力が止まって 1.5 秒後に履歴へ積んで保存し、画面を離れるときは即座に保存する。
 */
export function useMemoForm(initial: MemoData, save: (data: MemoData) => Promise<boolean>) {
  const [data, setData] = useState(initial);
  const [history, setHistory] = useState<MemoData[]>([initial]);
  const [index, setIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const latest = useRef(data);
  const lastSubmitted = useRef(initial);
  const saveRef = useRef(save);
  latest.current = data;
  saveRef.current = save;

  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // 保存は順番に1つずつ行う（古い内容が新しい内容を上書きしないように）
  const flush = useCallback((snapshot = latest.current): Promise<boolean> => {
    const run = async () => {
      if (same(snapshot, lastSubmitted.current)) return true;
      setIsSaving(true);
      try {
        const ok = await saveRef.current(snapshot).catch(() => false);
        if (ok) {
          lastSubmitted.current = snapshot;
          setLastSaved(new Date());
        }
        return ok;
      } finally {
        setIsSaving(false);
      }
    };
    const result = queue.current.then(run);
    queue.current = result;
    return result;
  }, []);

  // 自動保存と履歴の記録
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!same(data, history[index])) {
        setHistory((h) => [...h.slice(0, index + 1), data]);
        setIndex((i) => i + 1);
      }
      void flush(data);
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [data, history, index, flush]);

  // 保存済み表示は3秒で消す
  useEffect(() => {
    if (!lastSaved) return;
    const timer = setTimeout(() => setLastSaved(null), 3000);
    return () => clearTimeout(timer);
  }, [lastSaved]);

  // タブを閉じる・隠す・画面遷移するときは即保存
  useEffect(() => {
    const flushNow = () => void flush();
    const onVisibility = () => document.visibilityState === 'hidden' && flushNow();
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', onVisibility);
      flushNow();
    };
  }, [flush]);

  const update = (patch: Partial<MemoData>) => setData((d) => ({ ...d, ...patch }));

  const goTo = (i: number) => {
    setData(history[i]);
    setIndex(i);
  };

  return {
    data,
    update,
    isSaving,
    lastSaved,
    canUndo: index > 0 || !same(data, history[index]),
    canRedo: index < history.length - 1,
    canDiscard: index > 0 || !same(data, history[0]),
    /** 未記録の変更があればまずそれを取り消し、なければ1つ前の履歴へ */
    undo: () => (same(data, history[index]) ? index > 0 && goTo(index - 1) : setData(history[index])),
    redo: () => index < history.length - 1 && goTo(index + 1),
    discard: () => goTo(0),
    /** AI の提案などをすぐ保存して履歴に積む */
    applyNow: async (next: MemoData) => {
      if (!(await flush(next))) return false;
      setData(next);
      setHistory((h) => [...h.slice(0, index + 1), next]);
      setIndex((i) => i + 1);
      return true;
    },
  };
}
