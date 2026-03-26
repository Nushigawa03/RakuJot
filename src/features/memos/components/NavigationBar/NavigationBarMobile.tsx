
import React, { useEffect, useRef, useState } from 'react';
import DetailSearchMobile from './DetailSearchMobile';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBarMobile.css';
import { Tag } from '../../types/tags';
import { useSmartSearch } from '../../hooks/useSmartSearch';
import { searchService } from '../../services/searchService';
import TagChipInline from '~/components/TagChipInline';
import { useSettings } from '~/features/settings/hooks/useSettings';

type Props = {
  onBack: () => void;
  onSettings?: () => void;
};

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
};

const NavigationBarMobile: React.FC<Props> = ({ onBack, onSettings }) => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  // スマート検索フック
  const {
    searchQuery,
    setSearchQuery,
    filterTags,
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

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setAuthUser(null);
          return;
        }
        const data = await res.json();
        setAuthUser(data?.user ?? null);
      } catch {
        setAuthUser(null);
      }
    };

    fetchCurrentUser();
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

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleUserButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!authUser) {
      window.location.href = '/login';
      return;
    }

    if (onSettings) {
      onSettings();
      return;
    }

    window.location.href = '/app/settings';
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
      <div className="nav-mobile">
        <button className="nav-left" onClick={(e) => { e.stopPropagation(); onBack(); }} aria-label="戻る">
          ←
        </button>

        <div className="nav-center">
          <div className="search-bar-container-mobile">
            {/* インラインタグチップ */}
            {filterTags.length > 0 && (
              <div className="inline-tag-chips-mobile">
                {filterTags.map((tag) => (
                  <TagChipInline
                    key={`${tag.id}-${tag.isExclude}`}
                    tag={tag}
                    onRemove={handleTagRemove}
                  />
                ))}
              </div>
            )}
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
            {/* 解析中インジケーター */}
            {isParsing && (
              <span className="parse-indicator-mobile">...</span>
            )}
            {/* クリアボタン - 条件がある時のみ表示 */}
            {hasSearchConditions && (
              <button
                className="clear-search-button-mobile"
                onClick={(e) => { e.stopPropagation(); handleClearSearch(); }}
                aria-label="検索をクリア"
              >
                ×
              </button>
            )}
            <button className="search-button-mobile" onClick={(e) => { e.stopPropagation(); handleSearch(); }}>
              🔍
            </button>
          </div>
        </div>

        <button
          className="nav-right"
          onClick={handleUserButtonClick}
          aria-label={authUser ? 'ユーザー設定' : 'ログイン'}
          title={authUser ? (authUser.name || authUser.email || 'ユーザー') : 'ログイン'}
        >
          {authUser?.picture ? (
            <img
              src={authUser.picture}
              alt={authUser.name || 'ユーザー'}
              className="nav-user-avatar"
            />
          ) : (
            <span className="nav-user-fallback">
              {authUser ? (authUser.name || authUser.email).slice(0, 1).toUpperCase() : '👤'}
            </span>
          )}
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
          onClear={handleClearSearch}
          alwaysExpanded={settings.detailSearchAlwaysVisible}
        />
      )}
    </div>
  );
};

export default NavigationBarMobile;
