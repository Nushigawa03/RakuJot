import { describe, it, expect } from 'vitest';
import { describeExpression, evaluateExpression, orTermsToRows, rowsToOrTerms } from './expressions';

const name = (id: string) => id.toUpperCase();

describe('expressions', () => {
  it('行（AND）と または（OR）を orTerms に変換し、元に戻せる', () => {
    const rows = [
      [{ id: 'a', not: false }, { id: 'b', not: false }],
      [{ id: 'c', not: false }, { id: 'd', not: true }],
    ];
    const terms = rowsToOrTerms(rows);
    expect(terms).toEqual([
      { include: ['a', 'b'], exclude: [] },
      { include: ['c'], exclude: ['d'] },
    ]);
    expect(orTermsToRows(terms)).toEqual(rows);
  });

  it('空の行は捨てる', () => {
    expect(rowsToOrTerms([[], [{ id: 'a', not: false }], []])).toEqual([{ include: ['a'], exclude: [] }]);
  });

  it('説明文と評価', () => {
    const terms = [{ include: ['a'], exclude: [] }, { include: ['b'], exclude: ['c'] }];
    expect(describeExpression(terms, name)).toBe('A OR (B AND NOT C)');
    expect(evaluateExpression(['b'], terms)).toBe(true);
    expect(evaluateExpression(['b', 'c'], terms)).toBe(false);
  });
});
