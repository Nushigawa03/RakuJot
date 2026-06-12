import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDateQuery, parseFuzzyDate } from './dateUtils';

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('曖昧な年表現を区間に変換する', () => {
    vi.setSystemTime(new Date(2026, 5, 12, 12, 0, 0));

    expect(parseFuzzyDate('去年くらい', false)).toBe('2025-01-01');
    expect(parseFuzzyDate('去年くらい', true)).toBe('2025-12-31');
    expect(buildDateQuery('去年くらい', '今日').query).toBe('date:2025-01-01..2026-06-12');
  });

  it('今年の春のような日付テキストを季節区間に変換する', () => {
    vi.setSystemTime(new Date(2026, 5, 12, 12, 0, 0));

    expect(parseFuzzyDate('今年の春', false)).toBe('2026-03-01');
    expect(parseFuzzyDate('今年の春', true)).toBe('2026-05-31');
  });
});
