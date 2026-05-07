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

  // バックグラウンド同期完了時にタグ一覧だけ更新
  // メモ内容はユーザーが編集中なので上書きしない
  // ただし、もしこのメモが新規作成で tempID だった場合、サーバーからの正規IDに置き換える
  useEffect(() => {
    const handleSyncComplete = async (event: any) => {
      try {
        const { getAllTags: localGetAllTags } = await import(
          '~/features/sync/localDb'
        );
        const allTags = await localGetAllTags();
        setAvailableTags(allTags.map((t) => ({ id: t.id, name: t.name })));

        // 新規作成したメモのIDがサーバーによって発行された正規のIDに変わった場合
        if (event.detail && Array.isArray(event.detail.idMapping)) {
          const mapping = event.detail.idMapping.find((m: any) => m.localId === memo.id);
          if (mapping) {
            console.log(`[EditPage] Updating memo ID from ${mapping.localId} to ${mapping.serverId}`);
            setMemo((prev: any) => ({ ...prev, id: mapping.serverId }));
            // URLもこっそり書き換える
            navigate(`/app/edit/${mapping.serverId}`, { replace: true });
          }
        }
      } catch (e) {
        console.error('[EditPage] syncComplete tag refresh failed:', e);
      }
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    return () => window.removeEventListener('syncComplete', handleSyncComplete);
  }, [memo.id, navigate]);

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