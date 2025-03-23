import { useState } from 'react';
import { Filter } from '../stores/filters';

export const useFilter = (onFilterChange: (filterQuery: string) => void) => {
  const [activeFilter, setActiveFilter] = useState<string>(''); // 現在のアクティブなフィルタ
  const [activeQuery, setActiveQuery] = useState<string | null>(null); // 現在のカテゴリの詳細

  const handleFilterClick = (filter: Filter) => {
    if (activeFilter === filter.query) {
      // 同じフィルタがクリックされた場合は解除
      setActiveFilter('');
      setActiveQuery(null); // カテゴリ詳細をクリア
      onFilterChange(''); // フィルタをクリア
    } else {
      // 新しいフィルタを適用
      setActiveFilter(filter.query);
      setActiveQuery(filter.isCategory ? filter.query : null); // カテゴリの場合のみ詳細を表示
      onFilterChange(filter.query);
    }
  };

  return { activeFilter, activeQuery, handleFilterClick };
};