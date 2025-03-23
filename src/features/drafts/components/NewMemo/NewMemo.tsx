import React, { useState, useEffect, useRef } from 'react';
import './NewMemo.css';
import { Memo } from '../../types/memo';

interface NewMemoProps {
  onSave: (memo: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>) => void; // 必要なプロパティのみ
  onCancel: () => void;
}

const NewMemo: React.FC<NewMemoProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTagAdd = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (title.trim()) {
      const newMemo: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        tags,
        date,
        body,
      };
      onSave(newMemo);
    } else {
      alert('タイトルは必須です。');
    }
  };

  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // 高さをリセット
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // 内容に応じた高さを設定
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="new-memo">
      <h2>新規メモ作成</h2>
      <input
        type="text"
        placeholder="タイトルを入力"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        placeholder="日付を入力 (例: 2025-03-23)"
        value={date || ''}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button onClick={() => handleTagRemove(tag)}>×</button>
          </span>
        ))}
        <input
          type="text"
          placeholder="タグを追加"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              handleTagAdd(e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
      <textarea
        ref={textareaRef}
        placeholder="本文を入力"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onInput={handleTextareaResize} // テキストエリアの高さを調整
      />
      <div className="actions">
        <button onClick={handleSave}>保存</button>
        <button onClick={onCancel}>キャンセル (escキー)</button>
      </div>
    </div>
  );
};

export default NewMemo;