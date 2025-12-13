
import React, { useEffect, useRef, useState, useCallback } from 'react';
import DetailSearchMobile from './DetailSearchMobile';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBarMobile.css';
import { SearchTag } from '../../types/searchTag';
import { Tag } from '../../types/tags';
import { useTagSearch } from '../../hooks/useTagSearch';
import { searchService } from '../../services/searchService';
import { parseFuzzyDate, buildDateQuery } from '../../utils/dateUtils';

type Props = {
  onBack: () => void;
  onSettings?: () => void;
};

const NavigationBarMobile: React.FC<Props> = ({ onBack, onSettings }) => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // タグ検索用カスタムフック
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
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
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
      handleSearch();
    }
    if (e.key === 'Backspace' && (!searchQuery || (e.target as HTMLInputElement).selectionStart === 0)) {
      if (selectedTagIndex !== null) {
        e.preventDefault();
        handleTagRemove(filterTags[selectedTagIndex]);
      } else if (filterTags.length > 0) {
        e.preventDefault();
        handleTagRemove(filterTags[filterTags.length - 1]);
      }
    }
    if (e.key === 'ArrowLeft' && (!searchQuery || (e.target as HTMLInputElement).selectionStart === 0)) {
      e.preventDefault();
      setSelectedTagIndex((prev) =>
        prev === null ? filterTags.length - 1 : Math.max(prev - 1, 0)
      );
    }
    if (e.key === 'ArrowRight' && !searchQuery && selectedTagIndex !== null) {
      e.preventDefault();
      setSelectedTagIndex((prev) =>
        prev === null ? 0 : Math.min(prev + 1, filterTags.length - 1)
      );
    }
  };

  const handleSearch = async () => {
    // If user typed a natural-language query like "先月の仕事" and no explicit start/end selected,
    // call the parse API to extract dates/tags. We'll apply the parsed values immediately and also
    // update local state so the UI reflects them.

    // If user typed a free-form query and hasn't set start/end manually, try to parse it.
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
        console.warn('[NavigationBarMobile] parseSearch call failed', err);
      }
    }
    // Otherwise use existing selectedStartDate/EndDate
    const startRaw = selectedStartDate ? selectedStartDate.trim() : '';
    const endRaw = selectedEndDate ? selectedEndDate.trim() : '';
    applyDateFilterFromRaw(startRaw, endRaw);
  };

  // 日付フィルタ適用ロジックをutilsに分離
  const applyDateFilterFromRaw = (startRaw: string, endRaw: string) => {
    const { start, end, query } = buildDateQuery(startRaw, endRaw);
    try {
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'date', start: start || null, end: end || null, query } }));
    } catch (e) {}
    console.log('日付フィルタ適用:', { start, end, query });
    setIsFocused(false);
  };

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Close detail when clicking/tapping outside the wrapped area.
  React.useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="nav-mobile-wrapper" tabIndex={-1} onClick={stop}>
      <div
        className="nav-mobile"
      >
        <button className="nav-left" onClick={(e) => { e.stopPropagation(); onBack(); }} aria-label="戻る">
          ←
        </button>

        <div className="nav-center">
          <div className="search-bar-container-mobile">
            <div className="search-input-container-mobile">
              <input
                className="nav-search"
                type="search"
                placeholder="さがす..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                onClick={stop}
                aria-label="検索"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown-mobile">
                  {suggestions.map((tag, index) => (
                    <div
                      key={tag.id}
                      className={`suggestion-item-mobile ${selectedSuggestionIndex === index ? 'selected' : ''}`}
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
            <button className="search-button-mobile" onClick={(e) => { e.stopPropagation(); handleSearch(); }}>
              🔍
            </button>
          </div>
        </div>

        <button
          className="nav-right"
          onClick={(e) => { e.stopPropagation(); if (onSettings) onSettings(); else console.debug('settings clicked'); }}
          aria-label="設定"
        >
          ⚙
        </button>
      </div>

      {isFocused && (
        <DetailSearchMobile
          filterTags={filterTags}
          selectedTagIndex={selectedTagIndex}
          onTagRemove={handleTagRemove}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          availableTags={availableTags.map(t => t.name)}
          onStartDateChange={setSelectedStartDate}
          onEndDateChange={setSelectedEndDate}
          onTagAdd={handleTagAdd}
        />
      )}
    </div>
  );
};

export default NavigationBarMobile;
