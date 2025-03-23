import React, { useState } from 'react';
import './QuickMemoInput.css';

interface QuickMemoInputProps {
  onSave: (memo: { title: string; createdAt: string }) => void; // 保存時のコールバック
}

const QuickMemoInput: React.FC<QuickMemoInputProps> = ({ onSave }) => {
  const [title, setTitle] = useState('');

  const handleSave = () => {
    if (title.trim()) {
      const newMemo = {
        title: title.trim(),
        createdAt: new Date().toISOString(),
      };
      onSave(newMemo);
      setTitle('');
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
      />
      <button onClick={handleSave}>保存</button>
    </div>
  );
};

export default QuickMemoInput;