import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '~/components';
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
  const [settingsOpen, setSettingsOpen] = useState<'tags' | 'expressions' | null>(null);

  return (
    <>
      <div className="sidebar__header">
        <h3>分類</h3>
        <button type="button" className="icon-btn" onClick={() => setSettingsOpen('tags')} title="分類を編集" aria-label="分類を編集"><Icon name="settings" /></button>
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
              ><Icon name="x" /></button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li><button type="button" className="btn btn--ghost btn--sm" onClick={() => setSettingsOpen('expressions')}><Icon name="plus" /> 分類を作成</button></li>
        )}
      </ul>
      {active?.expression.name && (
        <div className="sidebar__detail">
          <h4>詳細</h4>
          <p><LogicText text={describeExpression(active.expression.orTerms, nameOf)} /></p>
        </div>
      )}
      <div className="sidebar__footer">
        <UserMenu />
        <Link to="/memos/trash" className="sidebar__trash"><Icon name="trash" /> ゴミ箱</Link>
      </div>
      {settingsOpen && <TagSettingsModal initialTab={settingsOpen} onClose={() => setSettingsOpen(null)} />}
    </>
  );
};

/** 分類の切り替えボタン。namedOnly なら名前のない検索フィルタは出さない */
export const ExpressionPills = ({ namedOnly = false }: { namedOnly?: boolean }) => {
  const { items } = useExpressionItems();
  return (
    <>
      {items.filter((i) => !namedOnly || i.expression.name).map(({ expression: e, label, active }) => (
        <button
          key={e.id}
          type="button"
          className={`pill ${e.color ? 'has-color' : ''} ${active ? 'is-active' : ''}`}
          style={colorStyle(e)}
          onClick={() => searchActions.toggleExpression(e.id)}
          aria-pressed={active}
        >
          {e.name ? label : <LogicText text={label} />}
        </button>
      ))}
    </>
  );
};

/** スマホ: 一覧上部の横スクロールするフィルタ（適用中の日付・タグ・分類） */
export const FilterPills = () => {
  const search = useSearch();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="pills">
      <div className="pills__scroll">
        {search.dateQuery && (
          <button type="button" className="pill pill--date" onClick={searchActions.clearDate} title="日付検索をクリア">
            <Icon name="calendar" /> {search.dateQuery.replace(/^date:?/, '')} <Icon name="x" />
          </button>
        )}
        {search.tags.map((tag) => (
          <button key={`${tag.id}-${tag.isExclude}`} type="button" className="pill pill--tag" onClick={() => searchActions.removeTag(tag)} title="タグ検索をクリア">
            <Icon name="tag" /> {tag.isExclude ? `NOT ${tag.name}` : tag.name} <Icon name="x" />
          </button>
        ))}
        <ExpressionPills />
      </div>
      <button type="button" className="icon-btn pills__add" onClick={() => setSettingsOpen(true)} aria-label="タグ設定を開く" title="タグ設定"><Icon name="plus" /></button>
      {settingsOpen && <TagSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
