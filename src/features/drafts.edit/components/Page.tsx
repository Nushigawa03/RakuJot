import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import EditMemoForm from './EditMemoForm';

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

  const handleSubmit = async (title: string, body: string, tags: string[], date: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/memos/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: memo.id,
          title,
          body,
          tags,
          date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "メモの更新に失敗しました。");
      }
      // 保存成功時も画面を閉じずに継続編集可能
    } catch (err) {
      setError("ネットワークエラーが発生しました。");
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/memos`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: memo.id }),
      });
      navigate("/drafts");
    } catch (err) {
      setError("削除中にエラーが発生しました。");
    }
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