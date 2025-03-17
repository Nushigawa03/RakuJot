import { Note } from '../types/Note';

// LocalStorageを使用した簡易的な実装例
export const noteApi = {
  async getNotes(): Promise<Note[]> {
    const notes = localStorage.getItem('notes');
    return notes ? JSON.parse(notes) : [];
  },

  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const notes = await this.getNotes();
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    return newNote;
  },

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(filteredNotes));
  }
};