import { describe, it, expect } from 'vitest';
import { clientParseSearch, filterMemos, parseSmartQuery } from './search';
import type { Tag } from '../types/tags';
import type { Memo } from '../types/memo';

const tags: Tag[] = [{ id: '1', name: 'Work' }, { id: '2', name: 'Personal' }];
const none = { tags: [], startDate: null, endDate: null };

describe('parseSmartQuery', () => {
  it('既存タグと一致する入力はタグ検索にする', () => {
    const r = parseSmartQuery('Work', tags, none);
    expect(r).toMatchObject({ textQuery: '', dateQuery: '' });
    expect(r.tags).toEqual([{ id: '1', name: 'Work', isExclude: false }]);
  });

  it('日付とタグを同時に抽出する（例: 2024年3月 Work）', () => {
    const r = parseSmartQuery('2024年3月 Work', tags, none);
    expect(r.dateQuery).toBe('date:2024-03-01..2024-03-31');
    expect(r.textQuery).toBe('');
    expect(r.tags.map((t) => t.name)).toEqual(['Work']);
  });

  it('日付・タグを取り除いた後に助詞だけが残らない', () => {
    const r = parseSmartQuery('2024年3月とかのWork', tags, none);
    expect(r.dateQuery).toBe('date:2024-03-01..2024-03-31');
    expect(r.textQuery).toBe('');
    expect(r.tags.map((t) => t.name)).toEqual(['Work']);
  });

  it('検索バーの日付は詳細検索で選んだ日付より優先する', () => {
    const r = parseSmartQuery('2024年3月 Work', tags, { tags: [], startDate: '2023-01-01', endDate: '2023-12-31' });
    expect(r.startDate).toBe('2024-03-01');
    expect(r.endDate).toBe('2024-03-31');
    expect(r.dateQuery).toBe('date:2024-03-01..2024-03-31');
  });

  it('詳細検索の日付だけでも検索できる', () => {
    const r = parseSmartQuery('', tags, { tags: [], startDate: '2023-01-01', endDate: '2023-12-31' });
    expect(r.dateQuery).toBe('date:2023-01-01..2023-12-31');
    expect(r.semanticDateQuery).toBe('2023-01-01 から 2023-12-31');
  });

  it('タグ以外の語はテキスト検索に残す（例: Work Meeting）', () => {
    const r = parseSmartQuery('Work Meeting', tags, none);
    expect(r.textQuery).toBe('Meeting');
    expect(r.dateQuery).toBe('');
    expect(r.tags.map((t) => t.name)).toEqual(['Work']);
  });

  it('既に選択済みのタグは重複させない', () => {
    const r = parseSmartQuery('Work', tags, { ...none, tags: [{ id: '1', name: 'Work', isExclude: false }] });
    expect(r.tags).toHaveLength(1);
  });

  it('「去年の夏」は季節の区間として解釈する', () => {
    const y = new Date().getFullYear() - 1;
    expect(clientParseSearch('去年の夏 旅行', [])).toMatchObject({ start: `${y}-06-01`, end: `${y}-08-31`, residualQuery: '旅行' });
  });
});

describe('filterMemos', () => {
  const memo = (id: string, tagIds: string[], date = '', title = id): Memo => ({ id, title, date, tags: tagIds, createdAt: '' });
  const memos = [memo('a', ['1'], '2024-03-10'), memo('b', ['1', '2'], '2023-05-01'), memo('c', [], '2024-03-20', '会議メモ')];
  const base = { dateQuery: '', textQuery: '', tags: [] };

  it('タグの包含・除外で絞り込む', () => {
    const r = filterMemos(memos, { ...base, tags: [{ id: '1', name: 'Work', isExclude: false }, { id: '2', name: 'Personal', isExclude: true }] });
    expect(r.map((m) => m.id)).toEqual(['a']);
  });

  it('分類（タグ式）と日付で絞り込む', () => {
    const expression = { id: 'e', orTerms: [{ include: ['1'], exclude: [] }] };
    const r = filterMemos(memos, { ...base, expression, dateQuery: 'date:2024-01-01..2024-12-31' });
    expect(r.map((m) => m.id)).toEqual(['a']);
  });

  it('分類を選んでいてもテキスト検索は並び替えに使う', () => {
    const expression = { id: 'e', orTerms: [{ include: [], exclude: ['2'] }] };
    const r = filterMemos(memos, { ...base, expression, textQuery: '会議' });
    expect(r.map((m) => m.id)).toEqual(['c', 'a']);
  });
});
