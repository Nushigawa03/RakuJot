import React, { useState, useEffect, useRef } from 'react';
import './EditMemoForm.css';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useNavigate } from '@remix-run/react';

interface Tag {
  id: string;
  name: string;
}

interface EditMemoFormProps {
  memo: {
    id: string;
    title: string;
    body: string;
    date?: string;
    tags?: Tag[];
  };
  onSubmit: (title: string, body: string, tags: string[], date: string) => Promise<void>;
  onDelete: () => Promise<void>;
  error: string | null;
  availableTags: Tag[];
}

const EditMemoForm: React.FC<EditMemoFormProps> = ({ 
  memo, 
  onSubmit, 
  onDelete, 
  error,
  availableTags 
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(memo.title || "");
  const [body, setBody] = useState(memo.body || "");
  const [date, setDate] = useState(memo.date || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    memo.tags?.map(t => t.name) || []
  );
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quickEditContent, setQuickEditContent] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(title, body, selectedTags, date);
  };

  const handleAddTag = (tagName: string) => {
    if (tagName.trim() && !selectedTags.includes(tagName.trim())) {
      setSelectedTags([...selectedTags, tagName.trim()]);
      setTagInput("");
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const filteredSuggestions = availableTags
    .filter(tag => 
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.includes(tag.name)
    )
    .slice(0, 5);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteModalOpen(false);
    await onDelete();
  };

  return (
    <div className="edit-memo-container full-screen">
      <div className="top-actions sticky">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
      </div>
      {error && <div className="error-message">エラー: {error}</div>}
      
      <form className="edit-memo-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="タイトル"
            aria-label="タイトル"
          />
        </div>

        <div className="form-group">
          <input
            id="date"
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="日付やキーワード（空欄でもOK）"
            aria-label="日付"
          />
        </div>

        <div className="form-group">
          <div className="tags-container" aria-label="タグ">
            {selectedTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="tag-chip">
                {tag}
                <button
                  type="button"
                  className="tag-remove-button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <div className="tag-input-wrapper">
              <input
                ref={tagInputRef}
                id="tags"
                type="text"
                className="tag-input"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => tagInput.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="タグを追加"
                aria-label="タグ入力"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="tag-suggestions">
                  {filteredSuggestions.map((tag) => (
                    <div
                      key={tag.id}
                      className="tag-suggestion"
                      onClick={() => handleAddTag(tag.name)}
                    >
                      {tag.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="内容"
            aria-label="内容"
          />
        </div>
        
        {/* 上部のフォーム用アクションは非固定。下部に固定ボタンを用意 */}
      </form>

      <div className="quick-edit">
        <textarea
          className="quick-body"
          placeholder="クイック編集: ここに内容を貼り付けて保存ボタンを押すと、タイトル・タグ・日付をAIが提案します。"
          value={quickEditContent}
          onChange={(e) => setQuickEditContent(e.target.value)}
          rows={5}
        />
        <div className="actions">
          <button className="save" onClick={(e) => { e.preventDefault(); onSubmit(title, body, selectedTags, date); }}>
            保存
          </button>
          <button className="delete" onClick={(e) => { e.preventDefault(); handleDeleteClick(); }}>
            削除
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        memoTitle={title}
      />
    </div>
  );
};

export default EditMemoForm;