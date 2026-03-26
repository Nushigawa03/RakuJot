import React, { useEffect, useState } from 'react';
import './DetailSearchMobile.css';
import { SearchTag } from '../../types/searchTag';
import DatePickerInput from '~/components/DatePickerInput';

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
  onClear?: () => void;
  alwaysExpanded?: boolean;
}

const DetailSearchMobile: React.FC<DetailSearchMobileProps> = ({
  selectedStartDate,
  selectedEndDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  alwaysExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(alwaysExpanded);

  useEffect(() => {
    setIsExpanded(alwaysExpanded);
  }, [alwaysExpanded]);

  return (
    <div className="detail-search-mobile" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="detail-search-toggle-mobile"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        詳細
      </button>

      {isExpanded && (
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
          {onClear && (
            <button className="clear-button-mobile" onClick={onClear}>
              クリア
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailSearchMobile;

