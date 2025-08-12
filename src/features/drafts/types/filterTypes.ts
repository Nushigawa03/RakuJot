// フィルタとカテゴリで共通の型定義

export interface FilterTerm {
  include: string[]; // AND で結合（含むべきタグID）
  exclude: string[]; // AND で結合（含まないタグID）
}

// フィルタ・カテゴリ共通のベース型
export interface FilterBase {
  id: string;
  name: string;
  orTerms: FilterTerm[]; // OR で結合される項
}

// フィルタの評価関数
export function evaluateFilterExpression(
  memoTags: string[], 
  orTerms: FilterTerm[]
): boolean {
  // OR結合: いずれかのTermがtrueならtrue
  return orTerms.some(term => {
    // include条件: 全て含まれている必要がある（AND）
    const includeMatch = term.include.every(tagId => memoTags.includes(tagId));
    
    // exclude条件: 含まれていてはいけない（AND）
    const excludeMatch = term.exclude.every(tagId => !memoTags.includes(tagId));
    
    return includeMatch && excludeMatch;
  });
}
