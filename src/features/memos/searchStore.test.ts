import { describe, it, expect, beforeEach } from 'vitest';
import { getSearchState, searchActions } from './searchStore';

const tags = [{ id: '1', name: 'Work' }];

describe('searchStore', () => {
  beforeEach(() => {
    searchActions.clear();
    if (getSearchState().expressionId) searchActions.toggleExpression(getSearchState().expressionId);
  });

  it('検索すると条件を適用し、分類を解除して一覧表示を合図する', () => {
    searchActions.toggleExpression('expr-1');
    const before = getSearchState().revision;

    const text = searchActions.submit('2024年3月 Work 会議', tags);

    const s = getSearchState();
    expect(text).toBe('会議');
    expect(s).toMatchObject({ dateQuery: 'date:2024-03-01..2024-03-31', textQuery: '会議', expressionId: '' });
    expect(s.tags).toEqual([{ id: '1', name: 'Work', isExclude: false }]);
    expect(s.revision).toBe(before + 1);
  });

  it('クリアで日付・テキスト・タグを消し、分類は残す', () => {
    searchActions.submit('Work foo', tags);
    searchActions.toggleExpression('expr-1');

    searchActions.clear();

    expect(getSearchState()).toMatchObject({ dateQuery: '', textQuery: '', tags: [], startDate: null, expressionId: 'expr-1' });
  });

  it('同じ分類を再度選ぶと解除される', () => {
    searchActions.toggleExpression('expr-1');
    searchActions.toggleExpression('expr-1');
    expect(getSearchState().expressionId).toBe('');
  });

  it('タグの追加・削除（包含と除外は別扱い）', () => {
    searchActions.addTag({ id: '1', name: 'Work', isExclude: false });
    searchActions.addTag({ id: '1', name: 'Work', isExclude: true });
    searchActions.addTag({ id: '1', name: 'Work', isExclude: false });
    expect(getSearchState().tags).toHaveLength(2);

    searchActions.removeTag({ id: '1', name: 'Work', isExclude: true });
    expect(getSearchState().tags).toEqual([{ id: '1', name: 'Work', isExclude: false }]);
  });
});
