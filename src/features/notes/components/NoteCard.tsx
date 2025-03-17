import React from 'react';
import { Note } from '../types/Note';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <div className="border rounded p-4 space-y-2">
      <h3 className="font-bold">{note.title}</h3>
      <p className="text-gray-600">{note.content}</p>
      <div className="flex justify-between text-sm text-gray-500">
        <span>{new Date(note.updatedAt).toLocaleString()}</span>
        <button
          onClick={() => onDelete(note.id)}
          className="text-red-500 hover:text-red-600"
        >
          削除
        </button>
      </div>
    </div>
  );
}