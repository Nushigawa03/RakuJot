import type { Tag } from "../../stores/tags";
import type { Filter } from "../../stores/filters";
import type { Category } from "../../stores/categories";

// モックメモデータ
export const mockMemos = [
  { 
    id: "mock-1", 
    title: "モック：重要な会議メモ", 
    body: "来週の企画会議について\n- 新機能の提案\n- 予算確認\n- スケジュール調整",
    date: "2025-03-20", 
    tags: ["work", "important"], 
    createdAt: new Date("2025-03-20T09:00:00Z").toISOString(),
    updatedAt: new Date("2025-03-20T09:00:00Z").toISOString()
  },
  { 
    id: "mock-2", 
    title: "モック：旅行計画", 
    body: "夏休みの旅行プラン\n- 宿泊先の予約\n- 観光地リスト\n- 持ち物チェック",
    date: "2024-spring", 
    tags: ["private"], 
    createdAt: new Date("2025-03-15T14:30:00Z").toISOString(),
    updatedAt: new Date("2025-03-15T14:30:00Z").toISOString()
  },
  { 
    id: "mock-3", 
    title: "モック：アプリ改善アイデア", 
    body: "RakuJotの新機能案\n- タグ機能の強化\n- 検索機能の改善\n- UIの見直し",
    date: "2024", 
    tags: ["idea", "todo"], 
    createdAt: new Date("2025-03-10T16:45:00Z").toISOString(),
    updatedAt: new Date("2025-03-10T16:45:00Z").toISOString()
  },
  { 
    id: "mock-4", 
    title: "モック：明日の予定", 
    body: "明日のスケジュール\n- 9:00 朝礼\n- 10:30 開発作業\n- 14:00 ミーティング",
    date: "", 
    tags: ["work"], 
    createdAt: new Date("2025-03-08T18:00:00Z").toISOString(),
    updatedAt: new Date("2025-03-08T18:00:00Z").toISOString()
  },
  { 
    id: "mock-5", 
    title: "モック：読書ノート", 
    body: "「プログラマが知るべき97のこと」\n- 良いコードの書き方\n- チーム開発のコツ\n- 継続的学習の重要性",
    date: "2023-winter", 
    tags: ["important", "idea"], 
    createdAt: new Date("2025-03-05T20:15:00Z").toISOString(),
    updatedAt: new Date("2025-03-05T20:15:00Z").toISOString()
  },
];

// モックタグデータ
export const mockTags: Tag[] = [
  { id: "work", name: "仕事", description: "仕事に関連するメモ" },
  { id: "important", name: "重要", description: "重要なメモ" },
  { id: "idea", name: "アイデア", description: "アイデアに関するメモ" },
  { id: "private", name: "プライベート", description: "プライベートなメモ" },
  { id: "todo", name: "TODO", description: "やるべきこと" },
];

// モックフィルタデータ
export const mockFilters: Filter[] = [
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

// モックカテゴリデータ
export const mockCategories: Category[] = [
  { 
    id: 'important_idea', 
    name: '重要なアイデア', 
    orTerms: [{ include: ['important', 'idea'], exclude: [] }],
    color: '#ff6b6b'
  },
  { 
    id: 'work_related', 
    name: '仕事関連', 
    orTerms: [
      { include: ['work'], exclude: [] },
      { include: ['todo'], exclude: ['private'] }
    ],
    color: '#4ecdc4'
  },
];

// 環境変数の確認用ヘルパー
export const shouldUseMockDatabase = (): boolean => {
  return process.env.USE_MOCK_DATABASE === "true";
};
