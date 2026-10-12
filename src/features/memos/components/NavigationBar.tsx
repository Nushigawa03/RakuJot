import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, DatePickerInput, Icon, Modal } from '~/components';
import { SyncStatusIndicator } from '~/features/sync/SyncStatusIndicator';
import { useSettings } from '~/features/settings/useSettings';
import { UserAvatarButton } from '~/features/auth/components/UserMenu';
import { searchActions, useSearch } from '../searchStore';
import { useTags } from '../hooks/useLocalData';
import { expressionService } from '../services/tagService';
import type { SearchTag } from '../types/searchTag';
import type { Tag } from '../types/tags';
import { NewMemoForm } from './MemoInputs';

interface NavigationBarProps {
  variant?: 'pc' | 'mobile';
  /** スマホ: 入力画面に戻る */
  onBack?: () => void;
}

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

const chipLabel = (tag: SearchTag) => (tag.isExclude ? `NOT ${tag.name}` : tag.name);

const NavigationBar = ({ variant = 'pc', onBack }: NavigationBarProps) => {
  const search = useSearch();
  const tags = useTags();
  const { settings } = useSettings();
  const [query, setQuery] = useState(search.textQuery);
  const [focused, setFocused] = useState(false);
  const [detailOpen, setDetailOpen] = useState(settings.detailSearchAlwaysVisible);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [creatingMemo, setCreatingMemo] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPc = variant === 'pc';

  useEffect(() => setDetailOpen(settings.detailSearchAlwaysVisible), [settings.detailSearchAlwaysVisible]);

  // 適用中のテキスト条件を入力欄に反映する（クリア時は空になる）
  useEffect(() => setQuery(search.textQuery), [search.textQuery]);

  // 枠外をタップしたら詳細検索を閉じる
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !containerRef.current?.contains(e.target)) setFocused(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // N キーで新規メモ（入力中は無効）
  useEffect(() => {
    if (!isPc) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'n' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      setCreatingMemo(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPc]);

  // 「-タグ名」で除外タグ
  const trimmed = query.trim();
  const isExclude = trimmed.startsWith('-');
  const term = (isExclude ? trimmed.slice(1) : trimmed).toLowerCase();
  const suggestions = term
    ? tags.filter((t) => t.name.toLowerCase().includes(term) && !search.tags.some((s) => s.id === t.id && s.isExclude === isExclude)).slice(0, 5)
    : [];

  const runSearch = () => {
    setQuery(searchActions.submit(query, tags));
    setActiveSuggestion(-1);
    setFocused(false);
  };

  const selectSuggestion = (tag: Tag) => {
    searchActions.addTag({ id: tag.id, name: tag.name, isExclude });
    setQuery('');
    setActiveSuggestion(-1);
  };

  const removeChip = (tag: SearchTag) => {
    searchActions.removeTag(tag);
    setSelectedChip(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const atStart = !query || e.currentTarget.selectionStart === 0;
    if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveSuggestion((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (suggestions[activeSuggestion]) selectSuggestion(suggestions[activeSuggestion]);
      else runSearch();
    } else if (e.key === 'Escape') {
      setActiveSuggestion(-1);
      setQuery('');
    } else if (e.key === 'Backspace' && atStart && search.tags.length) {
      e.preventDefault();
      removeChip(search.tags[selectedChip ?? search.tags.length - 1]);
    } else if (e.key === 'ArrowLeft' && atStart && search.tags.length) {
      e.preventDefault();
      setSelectedChip((i) => (i === null ? search.tags.length - 1 : Math.max(i - 1, 0)));
    } else if (e.key === 'ArrowRight' && !query && selectedChip !== null) {
      e.preventDefault();
      setSelectedChip((i) => (i === null || i >= search.tags.length - 1 ? null : i + 1));
    }
  };

  const hasConditions = Boolean(search.tags.length || query.trim() || search.startDate || search.endDate);

  const saveFilter = async () => {
    const queryTag = tags.find((t) => t.name === query.trim());
    const include = [...search.tags.filter((t) => !t.isExclude).map((t) => t.id), ...(queryTag ? [queryTag.id] : [])];
    const exclude = search.tags.filter((t) => t.isExclude).map((t) => t.id);
    await expressionService.create({ orTerms: [{ include, exclude }] });
    setSavingFilter(false);
  };

  if (creatingMemo) {
    return (
      <div className="nav nav--creating">
        <NewMemoForm onDone={() => setCreatingMemo(false)} />
      </div>
    );
  }

  return (
    <div className={`nav nav--${variant}`} ref={containerRef}>
      {!isPc && <button type="button" className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="arrow-left" /></button>}

      <div className={`search ${focused ? 'is-focused' : ''}`}>
        {search.tags.map((tag, i) => (
          <span key={`${tag.id}-${tag.isExclude}`} className={`chip chip--sm ${tag.isExclude ? 'chip--exclude' : ''} ${selectedChip === i ? 'is-selected' : ''}`}>
            {chipLabel(tag)}
            <button type="button" onClick={() => removeChip(tag)} aria-label={`${tag.name}を削除`}><Icon name="x" /></button>
          </span>
        ))}
        <div className="search__field">
          <input
            type="search"
            placeholder="さがす..."
            aria-label="検索"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveSuggestion(-1); setSelectedChip(null); }}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
          />
          {suggestions.length > 0 && (
            <ul className="dropdown" role="listbox">
              {suggestions.map((tag, i) => (
                <li
                  key={tag.id}
                  role="option"
                  aria-selected={i === activeSuggestion}
                  className={i === activeSuggestion ? 'is-active' : ''}
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(tag); }}
                  onMouseEnter={() => setActiveSuggestion(i)}
                >
                  <span><Icon name="tag" /> {isExclude ? `NOT ${tag.name}` : tag.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasConditions && (
          <button type="button" className="icon-btn" onClick={() => { searchActions.clear(); setQuery(''); }} aria-label="検索をクリア" title="検索をクリア"><Icon name="x" /></button>
        )}
        <button type="button" className="icon-btn" onClick={runSearch} aria-label="検索" title="検索"><Icon name="search" /></button>
        {isPc && (search.tags.length > 0 || query.trim()) && (
          <button type="button" className="icon-btn" onClick={() => setSavingFilter(true)} title="フィルタとして保存" aria-label="フィルタとして保存"><Icon name="pin" /></button>
        )}

        {focused && !suggestions.length && (
          <div className="search__detail">
            <button type="button" className="btn btn--ghost btn--sm" aria-expanded={detailOpen} onClick={() => setDetailOpen((v) => !v)}>
              詳細 <Icon name={detailOpen ? 'chevron-up' : 'chevron-down'} />
            </button>
            {detailOpen && (
              <div className="search__dates">
                <DatePickerInput label="開始日" value={search.startDate} onChange={(v) => searchActions.setDates(v || null, search.endDate)} />
                <DatePickerInput label="終了日" value={search.endDate} onChange={(v) => searchActions.setDates(search.startDate, v || null)} />
                <Button variant="primary" size="sm" onClick={runSearch}>検索</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isPc ? (
        <>
          <SyncStatusIndicator />
          <Button onClick={() => setCreatingMemo(true)}>メモを書く (N)</Button>
        </>
      ) : (
        <UserAvatarButton />
      )}

      {savingFilter && (
        <Modal
          title="フィルタとして保存"
          onClose={() => setSavingFilter(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSavingFilter(false)}>キャンセル</Button>
              <Button onClick={saveFilter}>フィルタを保存</Button>
            </>
          }
        >
          <p><Icon name="search" /> {[...search.tags.map(chipLabel), ...(query.trim() ? [query.trim()] : [])].join(' AND ')}</p>
        </Modal>
      )}
    </div>
  );
};

export default NavigationBar;
