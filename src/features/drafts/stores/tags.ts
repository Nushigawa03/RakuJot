export interface Tag {
    id: string; // タグの内部ID
    name: string; // タグ名
    description?: string; // タグの説明（任意）
  }
  
  export const tags: Tag[] = [
    { id: 'work', name: '仕事', description: '仕事に関連するメモ' },
    { id: 'important', name: '重要', description: '重要なメモ' },
    { id: 'idea', name: 'アイデア', description: 'アイデアに関するメモ' },
    { id: 'private', name: 'プライベート', description: 'プライベートなメモ' },
    { id: 'todo', name: 'TODO', description: 'やるべきこと' },
  ];