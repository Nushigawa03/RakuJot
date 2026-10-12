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

/** エディタ用の表現: 1行 = AND で並んだタグ（not で除外）、行どうしは OR */
export type ConditionRow = { id: string; not: boolean }[];

export const orTermsToRows = (orTerms: TagExpressionTerm[]): ConditionRow[] =>
  orTerms.map((t) => [...t.include.map((id) => ({ id, not: false })), ...t.exclude.map((id) => ({ id, not: true }))]);

/** 空の行は捨てる */
export const rowsToOrTerms = (rows: ConditionRow[]): TagExpressionTerm[] =>
  rows
    .filter((row) => row.length)
    .map((row) => ({ include: row.filter((c) => !c.not).map((c) => c.id), exclude: row.filter((c) => c.not).map((c) => c.id) }));
