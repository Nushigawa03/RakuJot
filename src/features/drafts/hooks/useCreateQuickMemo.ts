import { useCallback, useState } from 'react';

type MemoPayload = { title: string; body: string; tags: string[]; date?: string };

import { memoService } from '../services/memoService';

export function useCreateQuickMemo() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const save = useCallback(async (content: string): Promise<{ ok: boolean; payload?: MemoPayload; memo?: any; error?: string }> => {
    if (!content.trim()) return { ok: false, error: '空のメモです' };
    setIsSaving(true);
    setError(null);
    try {
      const res = await memoService.createMemoWithAiSuggestions(content, { tagLimit: 10 });
      if (!res.ok) {
        const msg = res.error || '保存に失敗しました。';
        setError(msg);
        return { ok: false, error: msg };
      }
      return { ok: true, payload: res.payload, memo: res.memo };
    } catch (e: any) {
      const msg = e?.message || '保存中にエラーが発生しました';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { save, isSaving, error } as const;
}

export default useCreateQuickMemo;
