import React from 'react';
import './DetailSearchMobile.css';
import { SearchTag } from '../../types/searchTag';
import TagChips from './TagChips';
import DatePickerInput from './DatePickerInput';

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
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="detail-search-mobile" onClick={(e) => e.stopPropagation()}>
      <TagChips 
        tags={filterTags}
        selectedIndex={selectedTagIndex}
        onRemove={onTagRemove}
      />
      <div className="search-options-mobile">
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
      </div>
    </div>
  );
};

export default DetailSearchMobile;
