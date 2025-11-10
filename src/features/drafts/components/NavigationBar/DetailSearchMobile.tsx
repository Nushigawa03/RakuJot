import React from 'react';
import './DetailSearchMobile.css';
import { SearchTag } from '../../types/searchTag';

interface DetailSearchMobileProps {
  filterTags: SearchTag[];
  selectedTagIndex: number | null;
  onTagRemove: (tag: SearchTag) => void;
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  availableTags: string[];
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTagAdd: (tag: string) => void;
}

const DetailSearchMobile: React.FC<DetailSearchMobileProps> = ({
  filterTags,
  selectedTagIndex,
  onTagRemove,
  selectedStartDate,
  selectedEndDate,
  availableTags,
  onStartDateChange,
  onEndDateChange,
  onTagAdd,
}) => {
  const startHiddenRef = React.useRef<HTMLInputElement | null>(null);
  const endHiddenRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className="detail-search-mobile" onClick={(e) => e.stopPropagation()}>
      {/* タグチップ表示 */}
      {filterTags.length > 0 && (
        <div className="tag-chips-mobile">
          {filterTags.map((tag, index) => (
            <span
              key={`${tag.id}-${tag.isExclude}`}
              className={`tag-mobile ${selectedTagIndex === index ? 'selected' : ''} ${tag.isExclude ? 'exclude' : ''}`}
            >
              {tag.isExclude ? `NOT ${tag.name}` : tag.name}
              <button onClick={() => onTagRemove(tag)}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="search-options-mobile">
            {/* 日付検索（任意テキスト + カレンダーボタン） */}
            <label>
              開始日:
              <div className="date-with-picker">
                <input
                  className="date"
                  type="text"
                  placeholder="日付やキーワード（空欄でもOK）"
                  value={selectedStartDate || ''}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
                <button
                  type="button"
                  className="date-picker-btn"
                  onClick={() => {
                    // trigger native date picker on hidden input
                    if (startHiddenRef.current) {
                      try {
                        // @ts-ignore
                        if (typeof startHiddenRef.current.showPicker === 'function') {
                          // @ts-ignore
                          startHiddenRef.current.showPicker();
                          return;
                        }
                      } catch {}
                      startHiddenRef.current.click();
                    }
                  }}
                >
                  📅
                </button>
                <input
                  ref={startHiddenRef}
                  type="date"
                  value={selectedStartDate || ''}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    opacity: 0,
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    background: 'transparent',
                  }}
                />
              </div>
            </label>
            <label>
              終了日:
              <div className="date-with-picker">
                <input
                  className="date"
                  type="text"
                  placeholder="日付やキーワード（空欄でもOK）"
                  value={selectedEndDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
                <button
                  type="button"
                  className="date-picker-btn"
                  onClick={() => {
                    if (endHiddenRef.current) {
                      try {
                        // @ts-ignore
                        if (typeof endHiddenRef.current.showPicker === 'function') {
                          // @ts-ignore
                          endHiddenRef.current.showPicker();
                          return;
                        }
                      } catch {}
                      endHiddenRef.current.click();
                    }
                  }}
                >
                  📅
                </button>
                <input
                  ref={endHiddenRef}
                  type="date"
                  value={selectedEndDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    opacity: 0,
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    background: 'transparent',
                  }}
                />
              </div>
            </label>

        {/* タグ選択はUIから削除 - タグは既存のタグチップ操作で扱います */}
      </div>
    </div>
  );
};

export default DetailSearchMobile;
