import React, { useState, useCallback } from 'react';
import useCreateQuickMemo from '../../hooks/useCreateQuickMemo';
import './QuickMemoInput.css';
import { Button } from '~/components';

const QuickMemoInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const { save, isSaving, error } = useCreateQuickMemo();

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      alert('メモ内容を入力してください。');
      return;
    }
    try {
      const result = await save(title);
      if (result.ok) {
        setTitle('');
        try {
          // prefer the server-created memo (with id) if available
          window.dispatchEvent(new CustomEvent('memoSaved', { detail: result.memo ?? result.payload }));
        } catch {}
      } else {
        alert(result.error || 'メモの保存に失敗しました。');
      }
    } catch (e) {
      console.error('メモの保存中にエラーが発生しました:', e);
      alert('メモの保存中にエラーが発生しました。');
    }
  }, [title, save]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="quick-memo-input">
      <textarea
        placeholder="メモを入力..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={isSaving}
      />
      <div className="quick-memo-actions">
        {error && <div className="quick-memo-error">⚠ {error}</div>}
        <Button
          variant="primary"
          full
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
        >
          {isSaving ? '保存中...' : '作成'}
        </Button>
      </div>
    </div>
  );
};

export default QuickMemoInput;