import React, { useState } from 'react';
import './EditMemoForm.css';

interface EditMemoFormProps {
  memo: any;
  onSubmit: (e: React.FormEvent) => void;
}

const EditMemoForm: React.FC<EditMemoFormProps> = ({ memo, onSubmit }) => {
  const [title, setTitle] = useState(memo.title || "");
  const [body, setBody] = useState(memo.body || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">タイトル:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="body">内容:</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <button type="submit">保存</button>
    </form>
  );
};

export default EditMemoForm;