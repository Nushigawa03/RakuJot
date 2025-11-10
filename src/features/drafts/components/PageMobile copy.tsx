import React, { useState, useRef } from 'react';
import './FullScreenMemoInput.css';

const FullScreenMemoInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // date is a free-text input shown to user (e.g. "2025-10-21"), but we also provide
  // a hidden native date input to open a calendar picker. We store display text here.
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  });
  const hiddenDateRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      alert('タイトルか本文を入力してください。');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
            body: body.trim() || undefined,
            tags: tags,
            // If the date text can be parsed to a valid Date, send ISO; otherwise send raw text
            date: (() => {
              const parsed = Date.parse(date);
              if (!isNaN(parsed)) return new Date(parsed).toISOString();
              return date || undefined;
            })(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error?.error || '保存に失敗しました。');
        return;
      }

      setTitle('');
      setBody('');
      setTags([]);
      setTagInput('');
      setDate(new Date().toISOString().slice(0, 10));
    } catch (e) {
      console.error(e);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="full-screen-memo-input">
      <div className="inputs">
        <input className="title" placeholder="タイトル (任意)" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="body" placeholder="本文を入力..." value={body} onChange={e => setBody(e.target.value)} />
        <div className="date-with-picker">
          <input
            className="date"
            type="text"
            placeholder="日付を入力 (例: 2025-10-21)"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button
            type="button"
            className="date-picker-btn"
            onClick={() => {
              // trigger native date picker on hidden input
              if (hiddenDateRef.current) {
                try {
                  // showPicker exists on some browsers
                  // @ts-ignore
                  if (typeof hiddenDateRef.current.showPicker === 'function') {
                    // @ts-ignore
                    hiddenDateRef.current.showPicker();
                    return;
                  }
                } catch {}
                hiddenDateRef.current.click();
              }
            }}
          >
            📅
          </button>
          <input
            ref={hiddenDateRef}
            type="date"
            value={date}
            // place the hidden input near the button so the native picker anchors nearby
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              opacity: 0,
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
            }}
            onChange={e => {
              // e.target.value is yyyy-mm-dd
              setDate(e.target.value);
            }}
          />
        </div>
        <div className="tag-input-group">
          <input className="tag-input" placeholder="タグを追加" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddTag()} />
          <button type="button" onClick={handleAddTag}>追加</button>
        </div>
        <div className="tag-list">
          {tags.map(tag => (
            <span key={tag} className="tag" onClick={() => handleRemoveTag(tag)}>
              {tag} ×
            </span>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="save" onClick={handleSave} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</button>
      </div>
    </div>
  );
};

export default FullScreenMemoInput;
