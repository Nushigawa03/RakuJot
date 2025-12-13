import React from 'react';
import ToggleSwitch from './ToggleSwitch';
import DatePickerInput from './DatePickerInput';
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
  onClear?: () => void;
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
  onClear,
}) => {
  return (
    <div className="detail-search">
      <p>詳細検索オプション</p>
      <div className="search-options">
        {/* 日付検索 */}
        <DatePickerInput 
          label="開始日"
          value={selectedStartDate}
          onChange={onStartDateChange}
        />
        <DatePickerInput 
          label="終了日"
          value={selectedEndDate}
          onChange={onEndDateChange}
        />

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
        {/* <ToggleSwitch
            label="本文詳細検索"
            isChecked={isDetailSearch}
            onChange={onDetailSearchToggle}
        />
        <ToggleSwitch
            label="タグOR検索"
            isChecked={isOrSearch}
            onChange={onOrSearchToggle}
        /> */}

        {/* クリアボタンを他の要素と同列に配置 */}
        {onClear && (
          <div className="detail-search-actions">
            <button className="clear-button" onClick={onClear}>
              クリア
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailSearch;