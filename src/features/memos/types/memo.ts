export interface Memo {
  id: string;
  title: string;
  date?: string;
  tags: string[]; // tag ID の配列
  _syncStatus?: 'synced' | 'pending-create' | 'pending-update' | 'pending-delete';
  body?: string;
  embedding?: number[] | null;
  createdAt: string;
  updatedAt?: string;
}
