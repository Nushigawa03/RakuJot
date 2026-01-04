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

const Page: React.FC<PageProps> = ({ memo, availableTags }) => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

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