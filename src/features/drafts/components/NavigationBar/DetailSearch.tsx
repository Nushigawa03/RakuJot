import React from 'react';
import ToggleSwitch from './ToggleSwitch';
import './DetailSearch.css';

interface DetailSearchProps {
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  isOrSearch: boolean;
  isDetailSearch: boolean;
  availableTags: string[];
  availableCategories: string[];
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTagAdd: (tag: string) => void;
  onCategorySelect: (category: string) => void;
  onOrSearchToggle: () => void;
  onDetailSearchToggle: () => void;
}

const DetailSearch: React.FC<DetailSearchProps> = ({
  selectedStartDate,
  selectedEndDate,
  isOrSearch,
  isDetailSearch,
  availableTags,
  availableCategories,
  onStartDateChange,
  onEndDateChange,
  onTagAdd,
  onCategorySelect,
  onOrSearchToggle,
  onDetailSearchToggle,
}) => {
  return (
    <div className="detail-search">
      <p>詳細検索オプション</p>
      <div className="search-options">
        {/* 日付検索 */}
        <label>
          開始日:
          <input
            type="date"
            value={selectedStartDate || ''}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </label>
        <label>
          終了日:
          <input
            type="date"
            value={selectedEndDate || ''}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </label>

        {/* タグ選択 */}
        <label>
          タグを選択:
          <select onChange={(e) => onTagAdd(e.target.value)} defaultValue="">
            <option value="" disabled>
              タグを選択
            </option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        {/* カテゴリ選択 */}
        <label>
          カテゴリを選択:
          <select onChange={(e) => onCategorySelect(e.target.value)} defaultValue="">
            <option value="" disabled>
              カテゴリを選択
            </option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        {/* トグルスイッチ */}
        <ToggleSwitch
            label="本文詳細検索"
            isChecked={isDetailSearch}
            onChange={onDetailSearchToggle}
        />
        <ToggleSwitch
            label="タグOR検索"
            isChecked={isOrSearch}
            onChange={onOrSearchToggle}
        />
      </div>
    </div>
  );
};

export default DetailSearch;