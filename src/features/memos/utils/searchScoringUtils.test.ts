import { describe, expect, it } from 'vitest';
import { sortMemosByFuzzyScore } from './searchScoringUtils';
import type { Memo } from '../types/memo';

const memo = (id: string, title: string, body = ''): Memo => ({
    id,
    title,
    body,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
});

describe('searchScoringUtils', () => {
    it('keeps zero-score memos when text search is used as ranking refinement', () => {
        const memos = [
            memo('1', '仕事の記録', '打ち合わせ'),
            memo('2', '買い物', '卵と牛乳'),
        ];

        const result = sortMemosByFuzzyScore(memos, 'とか', {
            keepZeroScoreMemos: true,
        });

        expect(result.map(m => m.id)).toEqual(['1', '2']);
    });

    it('ranks fuzzy text matches without requiring strict body filtering', () => {
        const memos = [
            memo('1', '買い物', '卵と牛乳'),
            memo('2', '仕事の記録', '明日の会議資料'),
        ];

        const result = sortMemosByFuzzyScore(memos, '会議', {
            keepZeroScoreMemos: true,
        });

        expect(result.map(m => m.id)).toEqual(['2', '1']);
    });

    it('still filters weak text-only searches when no structured filter is present', () => {
        const memos = [
            memo('1', '買い物', '卵と牛乳'),
            memo('2', '仕事の記録', '明日の会議資料'),
        ];

        const result = sortMemosByFuzzyScore(memos, '会議');

        expect(result.map(m => m.id)).toEqual(['2']);
    });
});
