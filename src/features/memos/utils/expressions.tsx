import type { TagExpressionTerm } from '../types/tagExpressions';

/** orTerms（OR で結合した AND 条件の列）をメモのタグ ID 列で評価する */
export const evaluateExpression = (memoTagIds: string[], orTerms: TagExpressionTerm[]) =>
  orTerms.some((t) => t.include.every((id) => memoTagIds.includes(id)) && t.exclude.every((id) => !memoTagIds.includes(id)));

/** 「(A AND NOT B) OR C」形式の説明文を作る */
export const describeExpression = (orTerms: TagExpressionTerm[], nameOf: (id: string) => string) =>
  orTerms
    .map((t) => [...t.include.map(nameOf), ...t.exclude.map((id) => `NOT ${nameOf(id)}`)])
    .filter((parts) => parts.length)
    .map((parts) => (parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`))
    .join(' OR ');

/** AND / OR / NOT を強調表示する */
export const LogicText = ({ text }: { text: string }) => (
  <>
    {text.split(/\b(AND|OR|NOT)\b/).map((part, i) =>
      ['AND', 'OR', 'NOT'].includes(part)
        ? <span key={i} className={`logic-op logic-op--${part.toLowerCase()}`}>{part}</span>
        : part)}
  </>
);

/**
 * エディタ用の表現: must = OR グループの AND（各グループからいずれか1つ）、mustNot = すべて含まない。
 * orTerms はグループの直積として保存する。
 */
export interface ExpressionDraft {
  must: string[][];
  mustNot: string[];
}

const cartesian = (groups: string[][]): string[][] =>
  groups.reduce<string[][]>((acc, group) => acc.flatMap((combo) => group.map((id) => [...combo, id])), [[]]);

export function draftToOrTerms({ must, mustNot }: ExpressionDraft, maxTerms = 200): TagExpressionTerm[] {
  const groups = must.filter((g) => g.length);
  const combos = cartesian(groups);
  if (combos.length > maxTerms) {
    throw new Error(`条件の組み合わせが多すぎます（${combos.length} > ${maxTerms}）。グループ/タグ数を減らしてください。`);
  }
  return combos.map((include) => ({ include, exclude: [...mustNot] }));
}

/** draftToOrTerms の逆変換。エディタで表現できない式なら null */
export function orTermsToDraft(orTerms: TagExpressionTerm[]): ExpressionDraft | null {
  if (!orTerms.length) return { must: [], mustNot: [] };
  const mustNot = orTerms[0].exclude;
  const width = orTerms[0].include.length;
  const sameShape = orTerms.every((t) => t.include.length === width && t.exclude.join() === mustNot.join());
  if (!sameShape) return null;
  const must = Array.from({ length: width }, (_, i) => [...new Set(orTerms.map((t) => t.include[i]))]);
  const rebuilt = draftToOrTerms({ must, mustNot }, Infinity).map((t) => t.include.join());
  const original = orTerms.map((t) => t.include.join());
  return rebuilt.length === original.length && rebuilt.every((k) => original.includes(k)) ? { must, mustNot } : null;
}
