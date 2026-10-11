import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import UserMenu from '~/features/auth/components/UserMenu';
import { useExpressions, useTagNameOf } from '../hooks/useLocalData';
import { searchActions, useSearch } from '../searchStore';
import { expressionService } from '../services/tagService';
import { describeExpression, LogicText } from '../utils/expressions';
import type { TagExpression } from '../types/tagExpressions';
import TagSettingsModal from './TagSettingsModal';

const colorStyle = (e: TagExpression) => (e.color ? ({ '--category-color': e.color } as CSSProperties) : undefined);

/** 名前付きの分類を先に、名前のない検索フィルタを後に並べる */
function useExpressionItems() {
  const expressions = useExpressions();
  const nameOf = useTagNameOf();
  const { expressionId } = useSearch();
  const items = [...expressions.filter((e) => e.name), ...expressions.filter((e) => !e.name)].map((e) => ({
    expression: e,
    label: e.name || describeExpression(e.orTerms, nameOf),
    active: e.id === expressionId,
  }));
  return { items, active: items.find((i) => i.active), nameOf };
}

/** PC 左カラム: 分類リスト・設定・ユーザー・ゴミ箱 */
export const Sidebar = () => {
  const { items, active, nameOf } = useExpressionItems();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="sidebar__header">
        <h3>分類</h3>
        <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} title="分類を編集" aria-label="分類を編集">⚙️</button>
      </div>
      <ul className="sidebar__list">
        {items.map(({ expression: e, label, active }) => (
          <li
            key={e.id}
            className={`category ${e.color ? 'has-color' : ''} ${active ? 'is-active' : ''}`}
            style={colorStyle(e)}
            onClick={() => searchActions.toggleExpression(e.id)}
          >
            <span className="category__label">{e.name ? label : <LogicText text={label} />}</span>
            {!e.name && (
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                title="式を削除"
                aria-label="式を削除"
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (active) searchActions.toggleExpression(e.id);
                  expressionService.delete(e.id);
                }}
              >×</button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="muted">⚙️ から分類を作成できます</li>}
      </ul>
      {active?.expression.name && (
        <div className="sidebar__detail">
          <h4>詳細</h4>
          <p><LogicText text={describeExpression(active.expression.orTerms, nameOf)} /></p>
        </div>
      )}
      <div className="sidebar__footer">
        <UserMenu />
        <Link to="/memos/trash" className="sidebar__trash">🗑️ ゴミ箱</Link>
      </div>
      {settingsOpen && <TagSettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
};

/** スマホ: 一覧上部の横スクロールするフィルタ（適用中の日付・タグ・分類） */
export const FilterPills = () => {
  const { items } = useExpressionItems();
  const search = useSearch();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="pills">
      <div className="pills__scroll">
        {search.dateQuery && (
          <button type="button" className="pill pill--date" onClick={searchActions.clearDate} title="日付検索をクリア">
            📅 {search.dateQuery.replace(/^date:?/, '')} ✕
          </button>
        )}
        {search.tags.map((tag) => (
          <button key={`${tag.id}-${tag.isExclude}`} type="button" className="pill pill--tag" onClick={() => searchActions.removeTag(tag)} title="タグ検索をクリア">
            🏷️ {tag.isExclude ? `NOT ${tag.name}` : tag.name} ✕
          </button>
        ))}
        {items.map(({ expression: e, label, active }) => (
          <button
            key={e.id}
            type="button"
            className={`pill ${e.color ? 'has-color' : ''} ${active ? 'is-active' : ''}`}
            style={colorStyle(e)}
            onClick={() => searchActions.toggleExpression(e.id)}
          >
            {e.name ? label : <LogicText text={label} />}
          </button>
        ))}
      </div>
      <button type="button" className="icon-btn pills__add" onClick={() => setSettingsOpen(true)} aria-label="タグ設定を開く" title="タグ設定">＋</button>
      {settingsOpen && <TagSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
