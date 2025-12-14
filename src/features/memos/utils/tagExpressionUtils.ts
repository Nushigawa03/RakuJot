import { FilterTerm } from '../types/filterTypes';
import { getTagNameById } from './tagUtils';
import tagExpressionService from '../services/tagExpressionService';

// TagExpression の名前生成 / 評価ユーティリティ
export function generateExpressionName(orTerms: FilterTerm[]): string {
  const termDescriptions = orTerms.map(term => {
    const parts: string[] = [];

    if (term.include.length > 0) {
      const includeNames = term.include.map(id => getTagNameById(id));
      parts.push(...includeNames);
    }

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

// TagExpression の orTerms を評価する関数
export function evaluateExpression(
  memoTagIds: string[],
  orTerms: FilterTerm[]
): boolean {
  return orTerms.some(term => {
    const includeMatch = term.include.every(tagId => memoTagIds.includes(tagId));
    const excludeMatch = term.exclude.every(tagId => !memoTagIds.includes(tagId));
    return includeMatch && excludeMatch;
  });
}
// TagExpression（名前付き）からタグ名配列を取得する汎用関数
export const getExpressionTagNames = async (
  expressionId: string,
  getTagName: (id: string) => string
): Promise<string[]> => {
  try {
    const { categories } = await tagExpressionService.load();
    const expr = categories.find((c) => c.id === expressionId);

    if (expr?.orTerms && expr.orTerms.length > 0) {
      const tagIds = expr.orTerms[0]?.include || [];
      return tagIds.map(getTagName);
    }

    return [];
  } catch (error) {
    console.error('Error fetching expression tags:', error);
    return [];
  }
};

