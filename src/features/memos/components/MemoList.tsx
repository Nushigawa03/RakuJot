import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useExpressions, useMemos, useQueryEmbedding, useTagNameOf } from '../hooks/useLocalData';
import { useSearch } from '../searchStore';
import { filterMemos } from '../utils/search';
import { memoDateSortKey } from '../utils/dateUtils';
import type { LocalMemo } from '~/features/sync/localDb';

type SortKey = 'date' | 'title';

interface MemoListProps {
  /** PC: ホバー中のメモをプレビューに表示する */
  onHover?: (memo: LocalMemo | null) => void;
}

const MemoList = ({ onHover }: MemoListProps) => {
  const navigate = useNavigate();
  const memos = useMemos();
  const expressions = useExpressions();
  const nameOf = useTagNameOf();
  const search = useSearch();
  const queryEmbedding = useQueryEmbedding(search.semanticDateQuery);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'date', desc: true });

  const expression = expressions.find((e) => e.id === search.expressionId);
  const visible = useMemo(() => {
    // 先に基本の並び順を決め、絞り込み後のスコア順で同点のものはこの順を保つ
    const sorted = [...memos].sort((a, b) => {
      const cmp = sort.key === 'date'
        ? memoDateSortKey(a.date).localeCompare(memoDateSortKey(b.date))
        : (a.title || '').localeCompare(b.title || '', 'ja');
      return sort.desc ? -cmp : cmp;
    });
    return filterMemos(sorted, { expression, dateQuery: search.dateQuery, textQuery: search.textQuery, tags: search.tags, queryEmbedding, tagName: nameOf });
  }, [memos, sort, expression, search, queryEmbedding, nameOf]);

  // 絞り込みの根拠になったタグを強調する
  const highlighted = new Set([
    ...search.tags.filter((t) => !t.isExclude).map((t) => t.id),
    ...(expression?.orTerms.flatMap((t) => t.include) ?? []),
  ]);
  const showTags = Boolean(expression || search.tags.length);

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      className={`memo-list__sort ${sort.key === key ? 'is-active' : ''}`}
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
    >
      {label} {sort.key === key && (sort.desc ? '▼' : '▲')}
    </button>
  );

  return (
    <div className="memo-list">
      <div className="memo-list__header">
        {sortButton('date', '日付')}
        {sortButton('title', 'タイトル')}
        <span className="memo-list__count">{visible.length}件</span>
      </div>
      {visible.length === 0 ? (
        <p className="empty">{memos.length ? '条件に一致するメモはありません' : 'メモはまだありません'}</p>
      ) : (
        <ul>
          {visible.map((memo) => (
            <li
              key={memo.id}
              className={`memo-row ${memo._syncStatus !== 'synced' ? 'is-pending' : ''}`}
              onClick={() => navigate(`/app/edit/${memo.id}`)}
              onMouseEnter={() => onHover?.(memo)}
              onMouseLeave={() => onHover?.(null)}
            >
              <span className="memo-row__date">{memo.date || '不明'}</span>
              <span className="memo-row__title">{memo.title}</span>
              {showTags && memo.tags.length > 0 && (
                <span className="memo-row__tags">
                  {memo.tags.slice(0, 3).map((id) => (
                    <span key={id} className={`tag ${highlighted.has(id) ? 'tag--highlight' : ''}`}>{nameOf(id)}</span>
                  ))}
                  {memo.tags.length > 3 && <span className="tag">+{memo.tags.length - 3}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MemoList;
