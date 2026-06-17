import { describe, expect, it } from 'vitest';
import { evaluateDateQuery } from './dateQueryEvaluator';
import type { Memo } from '../types/memo';

const memo = (date: string, embedding: number[] = [1, 0]): Memo => ({
  id: date,
  title: 'memo',
  date,
  tags: [],
  embedding,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('dateQueryEvaluator', () => {
  it('matches concrete date ranges before semantic fallback', () => {
    expect(evaluateDateQuery(memo('2026-06-01'), 'date:2026-01-01..2026-12-31')).toBe(true);
    expect(evaluateDateQuery(memo('2024-06-01'), 'date:2026-01-01..2026-12-31')).toBe(false);
  });

  it('lets embedding similarity decide arbitrary date-field text', () => {
    const result = evaluateDateQuery(memo('ほげほげ'), 'date:2026-01-01..2026-12-31', {
      queryEmbedding: [1, 0],
      semanticThreshold: 0.68,
      useSemanticFallback: true,
    });

    expect(result).toBe(true);
  });

  it('still allows temporal but unparsable date text to use embedding fallback', () => {
    const result = evaluateDateQuery(memo('2024-spring'), 'date:2026-01-01..2026-12-31', {
      queryEmbedding: [1, 0],
      semanticThreshold: 0.68,
      useSemanticFallback: true,
    });

    expect(result).toBe(true);
  });

});
