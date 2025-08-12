import { useState } from 'react';
import { Filter } from '../stores/filters';
import { Category } from '../stores/categories';
import { FilterTerm } from '../types/filterTypes';

type FilterItem = Filter | Category;

export const useFilter = (onFilterChange: (filterQuery: string) => void) => {
  const [activeFilter, setActiveFilter] = useState<string>(''); // 現在のアクティブなフィルタID
  const [activeQuery, setActiveQuery] = useState<string | null>(null); // 現在の詳細表示

  const handleFilterClick = (filterItem: FilterItem) => {
    if (activeFilter === filterItem.id) {
      // 同じフィルタがクリックされた場合は解除
      setActiveFilter('');
      setActiveQuery(null);
      onFilterChange('');
    } else {
      // 新しいフィルタを適用
      setActiveFilter(filterItem.id);
      
      // 詳細表示用のクエリを生成
      const queryDetails = generateQueryDescription(filterItem.orTerms);
      setActiveQuery(queryDetails);
      
      // フィルタ条件を適用（実際のフィルタリング用）
      onFilterChange(filterItem.id);
    }
  };

  return { activeFilter, activeQuery, handleFilterClick };
};

// フィルタ条件の説明文を生成
function generateQueryDescription(orTerms: FilterTerm[]): string {
  const termDescriptions = orTerms.map(term => {
    const includes = term.include.length > 0 ? `含む: ${term.include.join(', ')}` : '';
    const excludes = term.exclude.length > 0 ? `含まない: ${term.exclude.join(', ')}` : '';
    
    return [includes, excludes].filter(Boolean).join(' かつ ');
  });
  
  return termDescriptions.join(' または ');
}