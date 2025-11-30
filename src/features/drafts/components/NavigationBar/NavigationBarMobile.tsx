import React from 'react';
import DetailSearchMobile from './DetailSearchMobile';
import { useNavigationBarStore } from '../../stores/navigationBarStore';
import './NavigationBarMobile.css';
import { SearchTag } from '../../types/searchTag';
import { Tag } from '../../types/tags';

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

  const [isFocused, setIsFocused] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTags, setFilterTags] = React.useState<SearchTag[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = React.useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = React.useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = React.useState<string | null>(null);
  const [availableTags, setAvailableTags] = React.useState<Tag[]>([]);
  const [suggestions, setSuggestions] = React.useState<Tag[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState<number>(-1);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
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
        setSuggestions(matchingTags.slice(0, 5));
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
    
    const foundTag = findTagByName(tagName);
    
    const newSearchTag: SearchTag = {
      id: foundTag ? foundTag.id : `temp_${Date.now()}`,
      name: tagName,
      isExclude: isExclude
    };
    
    const existingTag = filterTags.find(tag => tag.id === newSearchTag.id && tag.isExclude === newSearchTag.isExclude);
    if (!existingTag) {
      const newFilterTags = [...filterTags, newSearchTag];
      setFilterTags(newFilterTags);
      // notify rest of app about tag changes so filtering can happen
      try {
        window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'tags', tags: newFilterTags } }));
      } catch {}
    }
  };

  const handleTagRemove = (targetTag: SearchTag) => {
    const newFilterTags = filterTags.filter((tag) => !(tag.id === targetTag.id && tag.isExclude === targetTag.isExclude));
    setFilterTags(newFilterTags);
    try {
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'tags', tags: newFilterTags } }));
    } catch {}
    setSelectedTagIndex(null);
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

  const handleSearch = () => {
    // If user typed a natural-language query like "先月の仕事" and no explicit start/end selected,
    // call the parse API to extract dates/tags. We'll apply the parsed values immediately and also
    // update local state so the UI reflects them.
    const attemptParseAndApply = async () => {
      try {
        const resp = await fetch('/api/parseSearch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: searchQuery }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const parsedStart = data.start ?? null;
          const parsedEnd = data.end ?? null;
          const parsedTag = data.tag ?? null;

          if (parsedStart) setSelectedStartDate(parsedStart);
          if (parsedEnd) setSelectedEndDate(parsedEnd);

          // If the parser returned a tag candidate, try to match with availableTags
          if (parsedTag) {
            // match exact name first, then includes, case-insensitive
            const foundExact = availableTags.find(t => t.name === parsedTag);
            const foundCi = availableTags.find(t => t.name.toLowerCase() === parsedTag.toLowerCase());
            const foundIncludes = availableTags.find(t => t.name.toLowerCase().includes(parsedTag.toLowerCase()));
            const match = foundExact || foundCi || foundIncludes;
            if (match) {
              // add as positive tag
              handleTagAdd(match.name);
            }
          }

          // After applying parsed values, continue to build date query from parsed values
          const startRaw2 = parsedStart ?? (selectedStartDate ? selectedStartDate.trim() : '');
          const endRaw2 = parsedEnd ?? (selectedEndDate ? selectedEndDate.trim() : '');

          applyDateFilterFromRaw(startRaw2, endRaw2);
          return;
        }
      } catch (err) {
        console.warn('[NavigationBarMobile] parseSearch call failed', err);
      }
      // Fallback to existing behavior if parse failed
      const startRaw = selectedStartDate ? selectedStartDate.trim() : '';
      const endRaw = selectedEndDate ? selectedEndDate.trim() : '';
      applyDateFilterFromRaw(startRaw, endRaw);
    };

    // If user typed a free-form query and hasn't set start/end manually, try to parse it.
    if (searchQuery && !selectedStartDate && !selectedEndDate) {
      attemptParseAndApply();
      return;
    }

    // Otherwise use existing selectedStartDate/EndDate
    const startRaw = selectedStartDate ? selectedStartDate.trim() : '';
    const endRaw = selectedEndDate ? selectedEndDate.trim() : '';

    // Parse fuzzy Japanese date expressions. When preferEnd is true we return the latest
    // possible date for the expression (e.g. '去年' -> 2023-12-31). When false, return
    // the earliest possible date (e.g. '2024年春' -> 2024-03-01).
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const lastDayOf = (y: number, mZeroBased: number) => new Date(y, mZeroBased + 1, 0).getDate();

    const parseFuzzyDate = (input: string, preferEnd: boolean): string | null => {
      if (!input) return null;
      const s = input.trim();
      if (!s) return null;
      const now = new Date();
      const cy = now.getFullYear();

      // Exact YYYY年M月D日, YYYY年M月, YYYY年
      const ymd = s.match(/^(\d{4})年(?:\s*(\d{1,2})月(?:\s*(\d{1,2})日?)?)?$/);
      if (ymd) {
        const y = parseInt(ymd[1], 10);
        const m = ymd[2] ? parseInt(ymd[2], 10) : null;
        const d = ymd[3] ? parseInt(ymd[3], 10) : null;
        if (m && d) return `${y}-${pad2(m)}-${pad2(d)}`;
        if (m) {
          if (preferEnd) {
            const last = lastDayOf(y, m - 1);
            return `${y}-${pad2(m)}-${pad2(last)}`;
          }
          return `${y}-${pad2(m)}-01`;
        }
        // only year
        return preferEnd ? `${y}-12-31` : `${y}-01-01`;
      }

      // Seasons like 2024年春 or 春 (assume current year if missing)
      const season = s.match(/^(?:(\d{4})年)?\s*(春|夏|秋|冬)$/);
      if (season) {
        const y = season[1] ? parseInt(season[1], 10) : cy;
        const seas = season[2];
        if (seas === '春') {
          return preferEnd ? `${y}-05-31` : `${y}-03-01`;
        }
        if (seas === '夏') {
          return preferEnd ? `${y}-08-31` : `${y}-06-01`;
        }
        if (seas === '秋') {
          return preferEnd ? `${y}-11-30` : `${y}-09-01`;
        }
        if (seas === '冬') {
          // winter spans Dec of year -> Feb of next year
          if (preferEnd) {
            const y2 = y + 1;
            const last = lastDayOf(y2, 1); // Feb
            return `${y2}-02-${pad2(last)}`;
          }
          return `${y}-12-01`;
        }
      }

      // Relative year words
      if (/^去年$/.test(s)) {
        const y = cy - 1;
        return preferEnd ? `${y}-12-31` : `${y}-01-01`;
      }
      if (/^一昨年$/.test(s)) {
        const y = cy - 2;
        return preferEnd ? `${y}-12-31` : `${y}-01-01`;
      }
      if (/^今年$/.test(s)) {
        return preferEnd ? `${cy}-12-31` : `${cy}-01-01`;
      }
      if (/^来年$/.test(s)) {
        const y = cy + 1;
        return preferEnd ? `${y}-12-31` : `${y}-01-01`;
      }

      // Relative months: 先月/来月/先々月
      if (/^(先々月|先月|来月)$/.test(s)) {
        let offset = 0;
        if (s === '先月') offset = -1;
        if (s === '先々月') offset = -2;
        if (s === '来月') offset = 1;
        const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const y = dt.getFullYear();
        const m = dt.getMonth() + 1;
        return preferEnd ? `${y}-${pad2(m)}-${pad2(lastDayOf(y, m - 1))}` : `${y}-${pad2(m)}-01`;
      }

      // Days: 今日/昨日/明日
      if (/^今日$/.test(s)) {
        const dt = now;
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }
      if (/^昨日$/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - 1);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }
      if (/^明日$/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + 1);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }

      // Try natural Date parse as fallback
      try {
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      } catch {}

      // Unable to normalize: return the original string so callers can still use it
      return s;
    };

    let start = parseFuzzyDate(startRaw, false) || '';
    let end = parseFuzzyDate(endRaw, true) || '';

    // If both dates provided and start > end, swap them for robustness
    if (start && end) {
      try {
        const s = new Date(start);
        const e = new Date(end);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() > e.getTime()) {
          // swap
          const tmp = start;
          // @ts-ignore
          start = end;
          // @ts-ignore
          end = tmp;
        }
      } catch {}
    }

    let query = '';
    if (start && end) query = `date:${start}..${end}`;
    else if (start) query = `date>=${start}`;
    else if (end) query = `date<=${end}`;

    // Emit a CustomEvent so other parts of the app can react if they want to.
    // detail contains normalized start/end and a simple query string.
    try {
      // より検索向けのイベント名に変更
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'date', start: start || null, end: end || null, query } }));
    } catch (e) {
      // fallback for environments where CustomEvent might not be constructable
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window.dispatchEvent === 'function') {
        // no-op
      }
    }

    console.log('日付フィルタ適用:', { start, end, query });

    // UI：詳細検索パネルを閉じる
    setIsFocused(false);
  };

  // Extracted helper to build and dispatch date filter from raw start/end strings
  const applyDateFilterFromRaw = (startRaw: string, endRaw: string) => {
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const lastDayOf = (y: number, mZeroBased: number) => new Date(y, mZeroBased + 1, 0).getDate();

    const parseFuzzyDate = (input: string, preferEnd: boolean): string | null => {
      if (!input) return null;
      const s = input.trim();
      if (!s) return null;
      const now = new Date();
      const cy = now.getFullYear();

      // Exact YYYY年M月D日, YYYY年M月, YYYY年
      const ymd = s.match(/^(\d{4})年(?:\s*(\d{1,2})月(?:\s*(\d{1,2})日?)?)?$/);
      if (ymd) {
        const y = parseInt(ymd[1], 10);
        const m = ymd[2] ? parseInt(ymd[2], 10) : null;
        const d = ymd[3] ? parseInt(ymd[3], 10) : null;
        if (m && d) return `${y}-${pad2(m)}-${pad2(d)}`;
        if (m) {
          if (preferEnd) {
            const last = lastDayOf(y, m - 1);
            return `${y}-${pad2(m)}-${pad2(last)}`;
          }
          return `${y}-${pad2(m)}-01`;
        }
        // only year
        return preferEnd ? `${y}-12-31` : `${y}-01-01`;
      }

      // Seasons and other rules
      const season = s.match(/^(?:(\d{4})年)?\s*(春|夏|秋|冬)$/);
      if (season) {
        const y = season[1] ? parseInt(season[1], 10) : cy;
        const seas = season[2];
        if (seas === '春') {
          return preferEnd ? `${y}-05-31` : `${y}-03-01`;
        }
        if (seas === '夏') {
          return preferEnd ? `${y}-08-31` : `${y}-06-01`;
        }
        if (seas === '秋') {
          return preferEnd ? `${y}-11-30` : `${y}-09-01`;
        }
        if (seas === '冬') {
          if (preferEnd) {
            const y2 = y + 1;
            const last = lastDayOf(y2, 1);
            return `${y2}-02-${pad2(last)}`;
          }
          return `${y}-12-01`;
        }
      }

      if (/^今日$/.test(s)) {
        const dt = now;
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }
      if (/^昨日$/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - 1);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }
      if (/^明日$/.test(s)) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + 1);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }

      try {
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      } catch {}

      return s;
    };

    let start = parseFuzzyDate(startRaw, false) || '';
    let end = parseFuzzyDate(endRaw, true) || '';

    if (start && end) {
      try {
        const s = new Date(start);
        const e = new Date(end);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() > e.getTime()) {
          const tmp = start;
          start = end;
          end = tmp;
        }
      } catch {}
    }

    let query = '';
    if (start && end) query = `date:${start}..${end}`;
    else if (start) query = `date>=${start}`;
    else if (end) query = `date<=${end}`;

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
                onChange={handleSearchChange}
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
