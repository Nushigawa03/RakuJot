import React, { useEffect, useRef, useState } from 'react';
import DetailSearch from './DetailSearch';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBar.css';
import NewMemo from '../NewMemo/NewMemo';
import { SearchTag } from '../../types/searchTag';
import { Tag } from '../../types/tags';
import tagExpressionService from '../../services/tagExpressionService';
import { useTagSearch } from '../../hooks/useTagSearch';
import { searchService } from '../../services/searchService';
import { buildDateQuery } from '../../utils/dateUtils';

const NavigationBar: React.FC = () => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [isCreatingMemo, setIsCreatingMemo] = useState(false);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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
  } = useTagSearch(availableTags);

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

    if (e.key === 'Enter' && searchQuery.trim()) {
      const input = searchQuery.trim();
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

  const handleSearch = async () => {
    if (searchQuery && !selectedStartDate && !selectedEndDate) {
      try {
        const data = await searchService.parseSearchQuery(searchQuery);
        const parsedStart = data.start ?? null;
        const parsedEnd = data.end ?? null;
        const parsedTag = data.tag ?? null;
        if (parsedStart) setSelectedStartDate(parsedStart);
        if (parsedEnd) setSelectedEndDate(parsedEnd);
        if (parsedTag) {
          const foundExact = availableTags.find(t => t.name === parsedTag);
          const foundCi = availableTags.find(t => t.name.toLowerCase() === parsedTag.toLowerCase());
          const foundIncludes = availableTags.find(t => t.name.toLowerCase().includes(parsedTag.toLowerCase()));
          const match = foundExact || foundCi || foundIncludes;
          if (match) handleTagAdd(match.name);
        }
        const startRaw2 = parsedStart ?? (selectedStartDate ? selectedStartDate.trim() : '');
        const endRaw2 = parsedEnd ?? (selectedEndDate ? selectedEndDate.trim() : '');
        applyDateFilterFromRaw(startRaw2, endRaw2);
        return;
      } catch (err) {
        console.warn('[NavigationBar] parseSearch call failed', err);
      }
    }
    const startRaw = selectedStartDate ? selectedStartDate.trim() : '';
    const endRaw = selectedEndDate ? selectedEndDate.trim() : '';
    applyDateFilterFromRaw(startRaw, endRaw);
  };

  const applyDateFilterFromRaw = (startRaw: string, endRaw: string) => {
    const { start, end, query } = buildDateQuery(startRaw, endRaw);
    try {
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'date', start: start || null, end: end || null, query } }));
    } catch (e) {}
    setIsFocused(false);
  };

  const handleNewMemoSave = (memo: { title: string; tags: string[]; date?: string; body?: string }) => {
    console.log('新しいメモが保存されました:', memo);
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

  const handleClearSearch = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setFilterTags([]);
    setSearchQuery('');
    // 検索クリアイベントを発行
    try {
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'clear' } }));
    } catch (e) {}
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
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
          <NewMemo onSave={handleNewMemoSave} onCancel={handleNewMemoCancel} />
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
              {filterTags.map((tag, index) => (
                <span
                  key={`${tag.id}-${tag.isExclude}`}
                  className={`tag ${selectedTagIndex === index ? 'selected' : ''} ${tag.isExclude ? 'exclude' : ''}`}
                >
                  {tag.isExclude ? `NOT ${tag.name}` : tag.name}
                  <button onClick={() => handleTagRemove(tag)}>×</button>
                </span>
              ))}
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="さがす..."
                  className="search-bar"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown} // キー操作を追加
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
              <button className="search-button" onClick={handleSearch}>
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
            <button className="new-memo-button" onClick={() => setIsCreatingMemo(true)}>
              新規メモ (Ctrl + N)
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
              onClear={handleClearSearch}
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