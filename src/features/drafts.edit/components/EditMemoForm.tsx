import React, { useState } from 'react';
import './EditMemoForm.css';

interface EditMemoFormProps {
  memo: {
    id: string;
    title: string;
    body: string;
  };
  onSubmit: (title: string, body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  error: string | null;
}

const EditMemoForm: React.FC<EditMemoFormProps> = ({ memo, onSubmit, onDelete, error }) => {
  const [title, setTitle] = useState(memo.title || "");
  const [body, setBody] = useState(memo.body || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(title, body);
  };

  return (
    <div className="edit-memo-container">
      <h1 className="edit-memo-header">メモを編集</h1>
      {error && <div className="error-message">エラー: {error}</div>}
      
      <form className="edit-memo-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">タイトル:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="body">内容:</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="save-button">保存</button>
          <button type="button" className="delete-button" onClick={onDelete}>
            削除
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditMemoForm;