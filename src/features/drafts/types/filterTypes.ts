// フィルタとカテゴリで共通の型定義

export interface FilterTerm {
  include: string[]; // AND で結合（含むべきタグID）
  exclude: string[]; // AND で結合（含まないタグID）
}

// フィルタ・カテゴリ共通のベース型
export interface FilterBase {
  id: string;
  orTerms: FilterTerm[]; // OR で結合される項
}
