import React from 'react';
import DetailSearch from './DetailSearch';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBar.css';
import NewMemo from '../NewMemo/NewMemo';

const NavigationBar: React.FC = () => {
  const {
    isOrSearch,
    isDetailSearch,
    toggleOrSearch,
    toggleDetailSearch,
  } = useNavigationBarStore();

  const [isFocused, setIsFocused] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTags, setFilterTags] = React.useState<string[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = React.useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = React.useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = React.useState<string | null>(null);
  const [isCreatingMemo, setIsCreatingMemo] = React.useState(false); // 新規メモ作成状態
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedTagIndex(null);
  };

  const handleTagAdd = (tag: string) => {
    const formattedTag = tag.startsWith('-') ? `NOT ${tag.slice(1)}` : tag;
    if (!filterTags.includes(formattedTag)) {
      setFilterTags([...filterTags, formattedTag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    setFilterTags(filterTags.filter((t) => t !== tag));
    setSelectedTagIndex(null); // タグを削除したら選択をリセット
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Enterキーでタグを追加
      handleTagAdd(searchQuery.trim());
      setSearchQuery('');
    }
    if (e.key === 'Backspace' && !searchQuery) {
      // Backspaceキーでタグを削除
      if (selectedTagIndex !== null) {
        handleTagRemove(filterTags[selectedTagIndex]);
      } else if (filterTags.length > 0) {
        handleTagRemove(filterTags[filterTags.length - 1]);
      }
    }
    if (e.key === 'ArrowLeft' && !searchQuery) {
      // 左矢印キーでタグを選択
      setSelectedTagIndex((prev) =>
        prev === null ? filterTags.length - 1 : Math.max(prev - 1, 0)
      );
    }
    if (e.key === 'ArrowRight' && !searchQuery) {
      // 右矢印キーでタグを選択
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
                  key={tag}
                  className={`tag ${selectedTagIndex === index ? 'selected' : ''}`}
                >
                  {tag}
                  <button onClick={() => handleTagRemove(tag)}>×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder="タイトル、タグ、詳細を検索..."
                className="search-bar"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown} // キー操作を追加
              />
              <button className="search-button" onClick={handleSearch}>
                🔍
              </button>
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
    </>
  );
};

export default NavigationBar;