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
  const [editMode, setEditMode] = useState(false);
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
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [autoApplySuggestions, setAutoApplySuggestions] = useState(true); // デフォルト自動適用
  const [aiSuggestion, setAiSuggestion] = useState<{
    title: string;
    body: string;
    tags: string[];
    date: string;
  } | null>(null);
  const [history, setHistory] = useState<Array<{
    title: string;
    body: string;
    tags: string[];
    date: string;
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ title, body, tags: selectedTags, date });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTitle(prevState.title);
      setBody(prevState.body);
      setSelectedTags(prevState.tags);
      setDate(prevState.date);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTitle(nextState.title);
      setBody(nextState.body);
      setSelectedTags(nextState.tags);
      setDate(nextState.date);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleAiSuggest = async () => {
    if (!quickEditContent.trim()) return;
    
    setIsAiProcessing(true);
    try {
      // TODO: AI APIを呼ぶ
      // 仮の実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const suggestion = {
        title: title || "AIが提案するタイトル",
        body: quickEditContent,
        tags: [...selectedTags, "AI提案"],
        date: date || new Date().toLocaleDateString('ja-JP')
      };
      
      if (autoApplySuggestions) {
        // 即時適用（履歴に積んで反映）
        saveToHistory();
        setTitle(suggestion.title);
        setBody(suggestion.body);
        setSelectedTags(suggestion.tags);
        setDate(suggestion.date);
        setQuickEditContent("");
        setAiSuggestion(null);
      } else {
        // プレビュー表示
        setAiSuggestion(suggestion);
      }
    } catch (error) {
      console.error("AI提案エラー:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!aiSuggestion) return;
    
    saveToHistory();
    setTitle(aiSuggestion.title);
    setBody(aiSuggestion.body);
    setSelectedTags(aiSuggestion.tags);
    setDate(aiSuggestion.date);
    setAiSuggestion(null);
    setQuickEditContent("");
  };

  const handleRejectSuggestion = () => {
    setAiSuggestion(null);
  };

  return (
    <div className="edit-memo-container full-screen">
      <div className="top-actions sticky">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <button 
          type="button" 
          className="mode-toggle-button"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? '📖 閲覧モード' : '✏️ 詳細編集'}
        </button>
      </div>
      {error && <div className="error-message">エラー: {error}</div>}
      
      {!editMode ? (
        /* 閲覧モード */
        <div className="view-mode">
          <div className="memo-display">
            <h1 className="memo-title">{title || '(タイトルなし)'}</h1>
            {date && <div className="memo-date">{date}</div>}
            {selectedTags.length > 0 && (
              <div className="memo-tags">
                {selectedTags.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="memo-body">
              {body.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>

          <div className="quick-edit">
            <div className="quick-edit-header">
              <div className="header-top">
                <h3>✨ 気が向いたら編集できます</h3>
                <div className="history-controls">
                  <button className="btn-undo" onClick={handleUndo} disabled={historyIndex <= 0} title="元に戻す">
                    ↶
                  </button>
                  <button className="btn-redo" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="やり直す">
                    ↷
                  </button>
                </div>
              </div>
              <p className="quick-edit-description">
                何か変更したいことがあれば、ここに書くとAIがお手伝いします
              </p>
            </div>
            
            {aiSuggestion ? (
              /* AI提案プレビュー */
              <div className="ai-suggestion-preview">
                <div className="suggestion-header">
                  <span className="suggestion-label">🤖 AIの提案</span>
                </div>
                <div className="suggestion-content">
                  <div className="suggestion-field">
                    <label>タイトル:</label>
                    <input 
                      type="text" 
                      value={aiSuggestion.title}
                      onChange={(e) => setAiSuggestion({...aiSuggestion, title: e.target.value})}
                    />
                  </div>
                  <div className="suggestion-field">
                    <label>日付:</label>
                    <input 
                      type="text" 
                      value={aiSuggestion.date}
                      onChange={(e) => setAiSuggestion({...aiSuggestion, date: e.target.value})}
                    />
                  </div>
                  <div className="suggestion-field">
                    <label>タグ:</label>
                    <div className="suggestion-tags">
                      {aiSuggestion.tags.map((tag, idx) => (
                        <span key={idx} className="tag-badge">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="suggestion-field">
                    <label>内容:</label>
                    <textarea 
                      value={aiSuggestion.body}
                      onChange={(e) => setAiSuggestion({...aiSuggestion, body: e.target.value})}
                      rows={6}
                    />
                  </div>
                </div>
                <div className="suggestion-buttons actions-fixed">
                  <button className="btn-apply" onClick={(e) => { e.preventDefault(); handleApplySuggestion(); }}>
                    ✓ この内容を適用
                  </button>
                  <button className="btn-reject" onClick={(e) => { e.preventDefault(); handleRejectSuggestion(); }}>
                    ✗ キャンセル
                  </button>
                </div>
              </div>
            ) : (
              /* クイック編集入力 */
              <>
                <textarea
                  className="quick-body"
                  placeholder="変更したい内容があれば、ここに書けます"
                  value={quickEditContent}
                  onChange={(e) => setQuickEditContent(e.target.value)}
                  rows={8}
                  disabled={isAiProcessing}
                />
                <button 
                  className="btn-ai-suggest"
                  onClick={handleAiSuggest}
                  disabled={!quickEditContent.trim() || isAiProcessing}
                >
                  {isAiProcessing ? '🤖 AI処理中...' : '🤖 AIに提案してもらう'}
                </button>
              </>
            )}
            {!aiSuggestion && (
              <div className="actions">
                <button className="save-primary" onClick={(e) => { 
                  e.preventDefault(); 
                  onSubmit(title, body, selectedTags, date);
                }}>
                  💾 保存
                </button>
                <button className="delete-secondary" onClick={(e) => { 
                  e.preventDefault(); 
                  handleDeleteClick(); 
                }}>
                  🗑️ 削除
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 編集モード */
        <form className="edit-memo-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">タイトル</label>
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
            <label htmlFor="date">日付・キーワード</label>
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
            <label>タグ</label>
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
            <label htmlFor="body">内容</label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={15}
              placeholder="内容"
              aria-label="内容"
            />
          </div>
          
          <div className="form-actions">
            <button type="submit" className="save-primary">
              💾 保存
            </button>
            <button type="button" className="delete-secondary" onClick={handleDeleteClick}>
              🗑️ 削除
            </button>
          </div>
        </form>
      )}

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