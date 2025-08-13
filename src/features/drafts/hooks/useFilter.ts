import { useState, useEffect } from 'react';
import { Filter } from '../types/filters';
import { Category } from '../types/categories';
import { FilterTerm } from '../types/filterTypes';
import { getTagNameById, initializeTags } from '../utils/tagUtils';
import { generateFilterName } from '../utils/filterUtils';

type FilterItem = Filter | Category;

export const useFilter = (onFilterChange: (filterQuery: string) => void, filters: Filter[] = [], categories: Category[] = []) => {
  const [activeFilter, setActiveFilter] = useState<string>(''); // 現在のアクティブなフィルタID
  const [activeQuery, setActiveQuery] = useState<string | null>(null); // 現在の詳細表示

  // タグデータを初期化
  useEffect(() => {
    initializeTags();
  }, []);

  const handleFilterClick = (filterItem: FilterItem) => {
    if (activeFilter === filterItem.id) {
      // 同じフィルタがクリックされた場合は解除
      setActiveFilter('');
      setActiveQuery(null);
      onFilterChange('');
    } else {
      // 新しいフィルタを適用
      setActiveFilter(filterItem.id);
      
      // カテゴリの場合のみ詳細表示用のクエリを生成
      if ('color' in filterItem) { // Category判定
        const queryDetails = generateFilterName(filterItem.orTerms);
        setActiveQuery(queryDetails);
      } else {
        setActiveQuery(null); // フィルタの場合は説明文なし
      }
      
      // フィルタ条件を適用（実際のフィルタリング用）
      onFilterChange(filterItem.id);
    }
  };

  return { activeFilter, activeQuery, handleFilterClick };
};