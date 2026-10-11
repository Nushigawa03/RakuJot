import { describe, it, expect } from 'vitest';
import { describeExpression, draftToOrTerms, evaluateExpression, orTermsToDraft } from './expressions';

const name = (id: string) => id.toUpperCase();

describe('expressions', () => {
  it('グループの直積で orTerms を作り、元に戻せる', () => {
    const draft = { must: [['a', 'b'], ['c']], mustNot: ['x'] };
    const terms = draftToOrTerms(draft);
    expect(terms).toEqual([
      { include: ['a', 'c'], exclude: ['x'] },
      { include: ['b', 'c'], exclude: ['x'] },
    ]);
    expect(orTermsToDraft(terms)).toEqual(draft);
  });

  it('AND だけの式は各タグを別グループとして復元する（OR に化けない）', () => {
    expect(orTermsToDraft([{ include: ['a', 'b'], exclude: [] }])).toEqual({ must: [['a'], ['b']], mustNot: [] });
  });

  it('エディタで表現できない式は null', () => {
    expect(orTermsToDraft([{ include: ['a'], exclude: [] }, { include: ['b'], exclude: ['c'] }])).toBeNull();
  });

  it('説明文と評価', () => {
    const terms = [{ include: ['a'], exclude: [] }, { include: ['b'], exclude: ['c'] }];
    expect(describeExpression(terms, name)).toBe('A OR (B AND NOT C)');
    expect(evaluateExpression(['b'], terms)).toBe(true);
    expect(evaluateExpression(['b', 'c'], terms)).toBe(false);
  });

  it('組み合わせが多すぎるとエラー', () => {
    const big = Array.from({ length: 3 }, (_, i) => Array.from({ length: 10 }, (_, j) => `${i}-${j}`));
    expect(() => draftToOrTerms({ must: big, mustNot: [] })).toThrow();
  });
});
