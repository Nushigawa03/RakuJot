import React, { useState, useCallback } from 'react';
import useCreateQuickMemo from '../hooks/useCreateQuickMemo';
import './QuickMemoInput.css';

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
          window.dispatchEvent(new CustomEvent('memoSaved', { detail: result.payload }));
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {error && <div style={{ color: '#dc2626', fontSize: 12 }}>⚠ {error}</div>}
        <button className="save" onClick={handleSave} disabled={isSaving || !title.trim()}>
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};

export default QuickMemoInput;