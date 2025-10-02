import React from 'react';
import DetailSearch from './DetailSearch';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBar.css';
import NewMemo from '../NewMemo/NewMemo';
import { SearchTag } from '../../types/searchTag';
import { Tag } from '../../types/tags';

const NavigationBar: React.FC = () => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTags, setFilterTags] = React.useState<SearchTag[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = React.useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = React.useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = React.useState<string | null>(null);
  const [isCreatingMemo, setIsCreatingMemo] = React.useState(false); // 新規メモ作成状態
  const [isSavingFilter, setIsSavingFilter] = React.useState(false); // フィルタ保存状態
  const [availableTags, setAvailableTags] = React.useState<Tag[]>([]); // 利用可能なタグ一覧
  const [suggestions, setSuggestions] = React.useState<Tag[]>([]); // サジェスト候補
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState<number>(-1); // 選択中のサジェスト
  const [showSuggestions, setShowSuggestions] = React.useState(false); // サジェスト表示フラグ
  const containerRef = React.useRef<HTMLDivElement>(null);

  // タグ一覧を取得
  React.useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const tags = await response.json();
          setAvailableTags(tags);
        }
      } catch (error) {
        console.error('タグの取得エラー:', error);
      }
    };
    fetchTags();
  }, []);

  // タグ名からタグIDを取得
  const findTagByName = (tagName: string): Tag | undefined => {
    return availableTags.find(tag => tag.name === tagName);
  };

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedTagIndex(null);
    setSelectedSuggestionIndex(-1);
    
    // サジェストを更新
    if (value.trim()) {
      const input = value.trim();
      const isExclude = input.startsWith('-');
      const searchTerm = isExclude ? input.slice(1) : input;
      
      if (searchTerm) {
        const matchingTags = availableTags.filter(tag => 
          tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !filterTags.some(filterTag => filterTag.id === tag.id && filterTag.isExclude === isExclude)
        );
        setSuggestions(matchingTags.slice(0, 5)); // 最大5件表示
        setShowSuggestions(matchingTags.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleTagAdd = (tagInput: string) => {
    const isExclude = tagInput.startsWith('-');
    const tagName = isExclude ? tagInput.slice(1) : tagInput;
    
    // タグ名からタグIDを取得
    const foundTag = findTagByName(tagName);
    
    const newSearchTag: SearchTag = {
      id: foundTag ? foundTag.id : `temp_${Date.now()}`, // 一時的なIDを生成（存在しないタグの場合）
      name: tagName,
      isExclude: isExclude
    };
    
    // 同じタグが既に存在しないかチェック
    const existingTag = filterTags.find(tag => tag.id === newSearchTag.id && tag.isExclude === newSearchTag.isExclude);
    if (!existingTag) {
      setFilterTags([...filterTags, newSearchTag]);
    }
  };

  const handleTagRemove = (targetTag: SearchTag) => {
    setFilterTags(filterTags.filter((tag) => !(tag.id === targetTag.id && tag.isExclude === targetTag.isExclude)));
    setSelectedTagIndex(null); // タグを削除したら選択をリセット
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // サジェストが表示されている場合のキーボード操作
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

  const handleSearch = () => {
    console.log('検索実行:', searchQuery, filterTags, selectedStartDate, selectedEndDate, isOrSearch, isDetailSearch);
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
  const response = await fetch('/api/tagExpressions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orTerms: orTerms,
        }),
      });
      
      if (response.ok) {
        console.log('フィルタが保存されました');
        // 成功時の処理（通知など）
      } else {
        console.error('フィルタの保存に失敗しました');
      }
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
                  placeholder="タイトル、タグ、詳細を検索..."
                  className="search-bar"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown} // キー操作を追加
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map((tag, index) => (
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