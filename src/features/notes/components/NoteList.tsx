import React, { useEffect, useState } from 'react';
import { Note } from '../types/Note';
import { noteApi } from '../api/noteApi';
import { NoteCard } from './NoteCard';
import { NoteForm } from './NoteForm';

export function NoteList() {
    const [notes, setNotes] = useState<Note[]>([]);
  
    const loadNotes = async () => {
      const loadedNotes = await noteApi.getNotes();
      setNotes(loadedNotes);
    };
  
    const handleSave = (newNote: Note) => {
      setNotes(prev => [...prev, newNote]);
    };
  
    useEffect(() => {
      loadNotes();
    }, []);
  
    const handleDelete = async (id: string) => {
      await noteApi.deleteNote(id);
      await loadNotes();
    };
  
    return (
      <div className="space-y-6">
        <NoteForm onSave={handleSave} />
        <div className="space-y-4">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    );
  }