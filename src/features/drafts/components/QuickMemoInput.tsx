import React, { useState } from 'react';
import './QuickMemoInput.css';

const QuickMemoInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (title.trim()) {
      setIsSaving(true);
      try {
        const response = await fetch('/api/memos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            tags: [],
            date: new Date().toISOString(),
            body: undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'メモの保存に失敗しました。');
          return;
        }

        setTitle('');
      } catch (error) {
        console.error('メモの保存中にエラーが発生しました:', error);
        alert('メモの保存中にエラーが発生しました。');
      } finally {
        setIsSaving(false);
      }
    } else {
      alert('メモ内容を入力してください。');
    }
  };

  return (
    <div className="quick-memo-input">
      <textarea
        placeholder="ここにクイックメモを入力..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSaving}
      />
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? '保存中...' : '保存'}
      </button>
    </div>
  );
};

export default QuickMemoInput;