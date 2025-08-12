  import { FilterBase } from "../types/filterTypes";

export interface Filter extends FilterBase {
  // フィルタ固有のプロパティがあれば追加
}

export const filters: Filter[] = [
  {
    id: 'work',
    name: '仕事',
    orTerms: [{ include: ['work'], exclude: [] }]
  },
  {
    id: 'private_or_idea',
    name: 'プライベート OR アイデア',
    orTerms: [
      { include: ['private'], exclude: [] },
      { include: ['idea'], exclude: [] }
    ]
  },
  {
    id: 'idea_not_todo',
    name: 'アイデア NOT TODO',
    orTerms: [{ include: ['idea'], exclude: ['todo'] }]
  },
  {
    id: 'todo',
    name: 'TODO',
    orTerms: [{ include: ['todo'], exclude: [] }]
  },
];