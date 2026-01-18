import React, { useState, useEffect, useRef } from 'react';
import './InlineMemoInput.css';
import { Button, DatePickerInput, Textarea } from '~/components';
import { Memo } from '../../types/memo';
import { searchService } from '../../services/searchService';
import { memoService } from '../../../memos/services/memoService';

interface InlineMemoInputProps {
  onSave: (memo: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

const InlineMemoInput: React.FC<InlineMemoInputProps> = ({ onSave, onCancel, autoFocus }) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [body, setBody] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [availableTags, setAvailableTags] = useState<Array<{ id?: string; name: string }>>([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleTagAdd = (tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleTagRemove = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!title.trim()) { alert('タイトルは必須です。'); return; }
    const newMemo: { title: string; tags: string[]; date?: string; body: string } = { title, tags, date, body };
    setIsSaving(true);
    let createdMemo: any = null;
    try {
      const res = await memoService.createMemo(newMemo as any);
      if (!res.ok) {
        alert(res.error || 'メモの保存に失敗しました。');
        setIsSaving(false);
        return;
      }
      createdMemo = res.memo ?? null;
    } catch (err) {
      console.error('メモの保存中にエラーが発生しました:', err);
      alert('メモの保存中にエラーが発生しました。');
      setIsSaving(false);
      return;
    }
    // 保存成功時の処理
    setIsSaving(false);
    setLastSaved(new Date());
    setTagInput('');
    onSave(createdMemo ?? newMemo);
  };

  // fetch available tags for suggestions
  useEffect(() => {
    let mounted = true;
    searchService.fetchTags().then((t) => {
      if (!mounted) return;
      if (Array.isArray(t)) setAvailableTags(t.map((x: any) => ({ id: x.id, name: x.name })));
    }).catch(() => { });
    return () => { mounted = false; };
  }, []);

  const filteredSuggestions = availableTags
    .filter(tag => tag.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag.name))
    .slice(0, 6);

  const handleAddTagFromInput = (value?: string) => {
    const v = (value ?? tagInput).trim();
    if (!v) return;
    handleTagAdd(v);
    setTagInput('');
    setShowSuggestions(false);
  };

  // history/undo/redo intentionally removed for inline input

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (autoFocus && titleInputRef.current) {
      // focus and move caret to end
      titleInputRef.current.focus();
      const len = titleInputRef.current.value.length;
      try { titleInputRef.current.setSelectionRange(len, len); } catch (e) { }
    }
  }, [autoFocus]);

  return (
    <div className="inline-memo-input">
      <h2>新規メモ作成</h2>
      <input ref={titleInputRef} type="text" placeholder="タイトルを入力" value={title} onChange={(e) => setTitle(e.target.value)} />
      <DatePickerInput label="日付" value={date ?? null} onChange={(v) => setDate(v || undefined)} placeholder="日付やキーワード（空欄でもOK）" />
      <div className="tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button onClick={() => handleTagRemove(tag)}>×</button>
          </span>
        ))}
        <div className="tag-input-wrapper">
          <input
            type="text"
            placeholder="タグを追加"
            value={tagInput}
            onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddTagFromInput(); }
              if (e.key === 'Escape') { setShowSuggestions(false); }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => setShowSuggestions(tagInput.length > 0)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="tag-suggestions">
              {filteredSuggestions.map((t) => (
                <div key={t.name} className="tag-suggestion" onMouseDown={() => handleAddTagFromInput(t.name)}>
                  {t.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Textarea placeholder="本文を入力" value={body} onChange={setBody} autoResize={true} showLines={true} />
      <div className="actions">
        <div className="action-buttons">
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>保存</Button>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>キャンセル (escキー)</Button>
        </div>
      </div>
    </div>
  );
};

export default InlineMemoInput;
