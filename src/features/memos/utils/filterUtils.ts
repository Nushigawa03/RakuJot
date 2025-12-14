import { FilterTerm } from '../types/filterTypes';
import { getTagNameById } from './tagUtils';

// フィルタ名を自動生成する関数（タグIDをタグ名に変換）
export function generateFilterName(orTerms: FilterTerm[]): string {
  const termDescriptions = orTerms.map(term => {
    const parts: string[] = [];
    
    // include条件
    if (term.include.length > 0) {
      const includeNames = term.include.map(id => getTagNameById(id));
      parts.push(...includeNames);
    }
    
    // exclude条件
    if (term.exclude.length > 0) {
      const excludeNames = term.exclude.map(id => getTagNameById(id));
      parts.push(...excludeNames.map(name => `NOT ${name}`));
    }
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    
    return `(${parts.join(' AND ')})`;
  });
  
  const validDescriptions = termDescriptions.filter(desc => desc !== '');
  
  if (validDescriptions.length === 0) return '';
  if (validDescriptions.length === 1) return validDescriptions[0];
  
  return validDescriptions.join(' OR ');
}

// フィルタの評価関数
export function evaluateFilterExpression(
  memoTagIds: string[], 
  orTerms: FilterTerm[]
): boolean {
  // OR結合: いずれかのTermがtrueならtrue
  return orTerms.some(term => {
    // include条件: 全て含まれている必要がある（AND）
    // FilterTermのinclude/excludeはタグIDで保存されているため、タグIDで比較
    const includeMatch = term.include.every(tagId => memoTagIds.includes(tagId));
    
    // exclude条件: 含まれていてはいけない（AND）
    const excludeMatch = term.exclude.every(tagId => !memoTagIds.includes(tagId));
    
    return includeMatch && excludeMatch;
  });
}
