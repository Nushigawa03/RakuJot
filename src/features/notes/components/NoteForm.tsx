import React, { useState } from 'react';
import { noteApi } from '../api/noteApi';
import type { Note } from '../types/Note';

interface NoteFormProps {
  onSave?: (note: Note) => void;
}

export function NoteForm({ onSave }: NoteFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newNote = await noteApi.createNote({ title, content });
    setTitle('');
    setContent('');
    onSave?.(newNote);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモの内容"
          className="w-full p-2 border rounded"
          rows={4}
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        保存
      </button>
    </form>
  );
}