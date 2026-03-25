import React, { useEffect, useRef, useState } from 'react';
import DetailSearch from './DetailSearch';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBar.css';
import InlineMemoInput from '../Input/InlineMemoInput';
import { Tag } from '../../types/tags';
import tagExpressionService from '../../services/tagExpressionService';
import { useSmartSearch } from '../../hooks/useSmartSearch';
import { searchService } from '../../services/searchService';
import TagChipInline from '~/components/TagChipInline';
import { SyncStatusIndicator } from '../../../sync/SyncStatusIndicator';

interface NavigationBarProps {
  activeTextQuery?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTextQuery }) => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = useState(false);
  const [isCreatingMemo, setIsCreatingMemo] = useState(false);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // スマート検索フック
  const {
    searchQuery,
    setSearchQuery,
    filterTags,
    setFilterTags,
    suggestions,
    setSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    showSuggestions,
    setShowSuggestions,
    selectedTagIndex,
    setSelectedTagIndex,
    handleSearchChange,
    handleTagAdd,
    handleTagRemove,
    findTagByName,
    parsedPreview,
    isParsing,
    hasSearchConditions,
    selectedStartDate,
    selectedEndDate,
    setSelectedStartDate,
    setSelectedEndDate,
    handleSearch,
    handleClearSearch,
  } = useSmartSearch(availableTags);

  // タグ一覧を取得
  useEffect(() => {
    searchService.fetchTags().then(setAvailableTags).catch((error) => {
      console.error('タグの取得エラー:', error);
    });
  }, []);

  // サジェストからタグを選択
  const selectSuggestion = (tag: Tag) => {
    const isExclude = searchQuery.trim().startsWith('-');
    const tagInput = isExclude ? `-${tag.name}` : tag.name;
    handleTagAdd(tagInput);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // サジェストが表示されている場合のキーボード操作
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev: number) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev: number) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter') {
      console.log('[NavigationBar] Enter pressed with query:', searchQuery);
      const input = searchQuery.trim();

      if (!input) {
        // Input is empty, but we allow Enter to trigger "Clear/Refresh" of search
        handleSearch();
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const isExclude = input.startsWith('-');
      const tagName = isExclude ? input.slice(1) : input;
      const foundTag = findTagByName(tagName);

      if (foundTag) {
        // 既存タグの場合のみタグチップとして追加
        handleTagAdd(input);
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        // 存在しないタグの場合はテキスト検索として残す（チップ化しない）
        // 検索実行
        handleSearch();
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    if (e.key === 'Backspace' && (!searchQuery || (e.target as HTMLInputElement).selectionStart === 0)) {
      // Backspaceキーでタグを削除（検索欄が空か、カーソルが先頭にある場合）
      if (selectedTagIndex !== null) {
        e.preventDefault(); // テキスト削除を防ぐ
        handleTagRemove(filterTags[selectedTagIndex]);
      } else if (filterTags.length > 0) {
        e.preventDefault(); // テキスト削除を防ぐ
        handleTagRemove(filterTags[filterTags.length - 1]);
      }
    }
    if (e.key === 'ArrowLeft' && (!searchQuery || (e.target as HTMLInputElement).selectionStart === 0)) {
      // 左矢印キーでタグを選択（検索欄が空か、カーソルが先頭にある場合）
      e.preventDefault();
      setSelectedTagIndex((prev) =>
        prev === null ? filterTags.length - 1 : Math.max(prev - 1, 0)
      );
    }
    if (e.key === 'ArrowRight' && !searchQuery && selectedTagIndex !== null) {
      // 右矢印キーでタグを選択（検索欄が空で、タグが選択されている場合のみ）
      e.preventDefault();
      setSelectedTagIndex((prev) =>
        prev === null ? 0 : Math.min(prev + 1, filterTags.length - 1)
      );
    }
  };

  const handleNewMemoSave = (memo: { title: string; tags: string[]; date?: string; body?: string }) => {
    console.log('新しいメモが保存されました:', memo);
    try {
      window.dispatchEvent(new CustomEvent('memoSaved', { detail: memo }));
    } catch (e) { }
    setIsCreatingMemo(false); // 保存後に画面を閉じる
  };

  const handleNewMemoCancel = () => {
    setIsCreatingMemo(false); // キャンセル時に画面を閉じる
  };

  const handleSaveAsFilter = () => {
    if (filterTags.length > 0 || searchQuery.trim()) {
      setIsSavingFilter(true);
    }
  };

  const handleFilterSave = async () => {
    // SearchTagからタグIDを抽出してorTermsを構築
    const includeTagIds = filterTags.filter(tag => !tag.isExclude).map(tag => tag.id);
    const excludeTagIds = filterTags.filter(tag => tag.isExclude).map(tag => tag.id);

    // 検索クエリがある場合の処理（一時的に文字列として扱う）
    if (searchQuery.trim()) {
      // 検索クエリは現在文字列なので、一時的なタグとして扱う
      const tempTag = findTagByName(searchQuery.trim());
      if (tempTag) {
        includeTagIds.push(tempTag.id);
      }
      // TODO: 検索クエリがタグでない場合の処理を実装
    }

    const orTerms = [{
      include: includeTagIds,
      exclude: excludeTagIds
    }];

    try {
      await tagExpressionService.create({ orTerms });
      console.log('フィルタが保存されました');
    } catch (error) {
      console.error('フィルタ保存エラー:', error);
    }

    setIsSavingFilter(false);
  };

  const handleFilterSaveCancel = () => {
    setIsSavingFilter(false);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n') {
        e.preventDefault();
        setIsCreatingMemo(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {isCreatingMemo ? (
        <div className="navigation-bar creating-memo">
          <InlineMemoInput onSave={handleNewMemoSave} onCancel={handleNewMemoCancel} autoFocus={true} />
        </div>
      ) : (
        <div
          className={`navigation-bar ${isFocused ? 'expanded' : ''}`}
          onBlur={(e) => {
            if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
              setIsFocused(false);
            }
          }}
          tabIndex={-1}
          ref={containerRef}
        >
          <div className="top-bar">
            <div className="search-bar-container">
              {/* Active Text Query Chip */}
              {activeTextQuery && !searchQuery && (
                <div className="tag-chip inline text-query-chip" style={{ backgroundColor: '#e0e0e0', color: '#333' }}>
                  <span className="tag-name">"{activeTextQuery}"</span>
                  <button
                    className="remove-button"
                    onClick={() => handleClearSearch()}
                  >
                    ×
                  </button>
                </div>
              )}
              {filterTags.map((tag, index) => (
                <TagChipInline
                  key={`${tag.id}-${tag.isExclude}`}
                  tag={tag}
                  onRemove={handleTagRemove}
                />
              ))}
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="さがす..."
                  className="search-bar"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map((tag: Tag, index: number) => (
                      <div
                        key={tag.id}
                        className={`suggestion-item ${selectedSuggestionIndex === index ? 'selected' : ''}`}
                        onClick={() => selectSuggestion(tag)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        <span className="tag-icon">🏷️</span>
                        {searchQuery.trim().startsWith('-') ? `NOT ${tag.name}` : tag.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* AI解析プレビュー */}
              {/* {isParsing && (
                <span className="parse-indicator">...</span>
              )}
              {parsedPreview && (parsedPreview.start || parsedPreview.tag) && !isParsing && (
                <span className="parse-preview">
                  {parsedPreview.start && `📅${parsedPreview.start.slice(5)}`}
                  {parsedPreview.tag && `🏷️${parsedPreview.tag}`}
                </span>
              )} */}
              {/* クリアボタン - 条件がある時のみ表示 */}
              {hasSearchConditions && (
                <button
                  className="clear-search-button"
                  onClick={handleClearSearch}
                  title="検索をクリア"
                >
                  ×
                </button>
              )}
              <button className="search-button" onClick={() => {
                console.log('[NavigationBar] Search button clicked');
                handleSearch();
              }}>
                🔍
              </button>
              {(filterTags.length > 0 || searchQuery.trim()) && (
                <button
                  className="save-filter-button"
                  onClick={handleSaveAsFilter}
                  title="この検索をフィルタとして保存"
                >
                  📌
                </button>
              )}
            </div>
            <SyncStatusIndicator />
            <button className="new-memo-button" onClick={() => setIsCreatingMemo(true)}>
              新規メモ (N)
            </button>
          </div>
          {isFocused && (
            <DetailSearch
              selectedStartDate={selectedStartDate}
              selectedEndDate={selectedEndDate}
              isOrSearch={isOrSearch}
              isDetailSearch={isDetailSearch}
              availableTags={['タグ1', 'タグ2', 'タグ3']}
              availableCategories={['カテゴリ1', 'カテゴリ2']}
              onStartDateChange={setSelectedStartDate}
              onEndDateChange={setSelectedEndDate}
              onTagAdd={handleTagAdd}
              onCategorySelect={(category) => console.log('カテゴリ選択:', category)}
              onOrSearchToggle={toggleOrSearch}
              onDetailSearchToggle={toggleDetailSearch}
            />
          )}
        </div>
      )}

      {isSavingFilter && (
        <div className="save-filter-modal-overlay" onClick={handleFilterSaveCancel}>
          <div className="save-filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-filter-modal-header">
              <h3>フィルタとして保存</h3>
              <button className="close-button" onClick={handleFilterSaveCancel}>×</button>
            </div>
            <div className="save-filter-modal-content">
              <p className="current-search">
                保存する検索: {[
                  ...filterTags.map(tag => tag.isExclude ? `NOT ${tag.name}` : tag.name),
                  ...(searchQuery.trim() ? [searchQuery.trim()] : [])
                ].join(isOrSearch ? ' OR ' : ' AND ')}
              </p>
              <p className="filter-note">
                この検索条件をクイックアクセス用のフィルタとして保存しますか？
              </p>
              <div className="save-filter-buttons">
                <button className="save-button" onClick={handleFilterSave}>
                  保存
                </button>
                <button className="cancel-button" onClick={handleFilterSaveCancel}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavigationBar;