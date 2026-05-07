import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import EditMemoForm from './EditMemoForm';
import { memoService } from '../../memos/services/memoService';

interface Tag {
  id: string;
  name: string;
}

interface PageProps {
  memo: any;
  availableTags: Tag[];
}

const Page: React.FC<PageProps> = ({ memo: initialMemo, availableTags: initialTags }) => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [memo, setMemo] = useState(initialMemo);
  const [availableTags, setAvailableTags] = useState(initialTags);

  // バックグラウンド同期完了時にローカルDBからメモを再取得
  useEffect(() => {
    const handleSyncComplete = async () => {
      try {
        const { getMemo: localGetMemo, getAllTags: localGetAllTags } = await import(
          '~/features/sync/localDb'
        );
        const freshMemo = await localGetMemo(memo.id);
        const allTags = await localGetAllTags();

        if (freshMemo) {
          const tagIdToObj = new Map(allTags.map(t => [t.id, { id: t.id, name: t.name }]));
          const memoTags = (freshMemo.tags || []).map((tagId: string) =>
            tagIdToObj.get(tagId) || { id: tagId, name: tagId }
          );
          setMemo({
            id: freshMemo.id,
            title: freshMemo.title || '',
            date: freshMemo.date || '',
            tags: memoTags,
            body: freshMemo.body || '',
            embedding: freshMemo.embedding,
            createdAt: freshMemo.createdAt,
            updatedAt: freshMemo.updatedAt,
          });
          setAvailableTags(allTags.map((t) => ({ id: t.id, name: t.name })));
        }
      } catch (e) {
        console.error('[EditPage] syncComplete refresh failed:', e);
      }
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    return () => window.removeEventListener('syncComplete', handleSyncComplete);
  }, [memo.id]);

  const handleSubmit = async (title: string, body: string, tags: string[], date: string): Promise<boolean> => {
    setError(null);
    const res = await memoService.updateMemo(memo.id, { title, body, tags, date });
    if (!res.ok) {
      setError(res.error || 'メモの更新に失敗しました。');
      return false;
    }
    return true;
  };

  const handleDelete = async () => {
    const res = await memoService.deleteMemo(memo.id);
    if (!res.ok) {
      setError(res.error || '削除中にエラーが発生しました。');
      return;
    }
    navigate('/app');
  };

  return (
    <EditMemoForm 
      memo={memo}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      error={error}
      availableTags={availableTags}
    />
  );
};

export default Page;