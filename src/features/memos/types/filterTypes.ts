// TagExpression に統合する型定義
// Prisma の TagExpression モデルを TypeScript 側で表現します。

export interface TagExpressionTerm {
  include: string[]; // AND で結合（含むべきタグID）
  exclude: string[]; // AND で結合（含まないタグID）
}

export interface TagExpressionBase {
  id: string;
  // Prisma 側では Json 型で保存されるため、読み書き時に変換して扱います
  orTerms: TagExpressionTerm[];
  // 以下はカテゴリ（名前付き TagExpression）が持つ可能性があるメタ情報
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// 互換性のため既存の名前をエイリアスとして残す
export type FilterTerm = TagExpressionTerm;
export type FilterBase = TagExpressionBase;

// 新しい主名称（将来的にこちらを使う）
export type TagExpression = TagExpressionBase;

// 将来的に命名を切り替えたい場合は TagExpression* を使ってください。
