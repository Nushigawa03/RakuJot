import React, { useState, useEffect } from 'react';
import { Button } from '~/components';
import useCreateQuickMemo from '../../hooks/useCreateQuickMemo';
import './FullScreenMemoInput.css';

const FullScreenMemoInput: React.FC = () => {
  const [content, setContent] = useState('');
  const { save, isSaving, error } = useCreateQuickMemo();

  const handleSave = async () => {
    console.log('[FullScreenMemoInput] handleSave called');
    if (!content.trim()) {
      alert('メモを入力してください。');
      return;
    }
    try {
      const result = await save(content);
      if (result.ok) {
        setContent('');
        try {
          // dispatch created memo (with id) when available
          window.dispatchEvent(new CustomEvent('memoSaved', { detail: result.memo ?? result.payload }));
        } catch {}
      } else {
        alert(result.error || '保存に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('保存中にエラーが発生しました');
    }
  };

  return (
    <div className="full-screen-memo-input">
      <div className="inputs">
        <textarea className="content" placeholder="メモを入力..." value={content} onChange={e => setContent(e.target.value)} />
      </div>
      <div className="actions">
        <Button variant="primary" full onClick={handleSave} disabled={isSaving || !content.trim()}>
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
};

export default FullScreenMemoInput;
