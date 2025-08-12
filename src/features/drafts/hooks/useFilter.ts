import { useState, useEffect } from 'react';
import { Filter } from '../stores/filters';
import { Category } from '../stores/categories';
import { FilterTerm } from '../types/filterTypes';
import { getTagNameById, initializeTags } from '../utils/tagUtils';

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
        const queryDetails = generateQueryDescription(filterItem.orTerms);
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

// フィルタ条件の説明文を生成（カテゴリ用）
function generateQueryDescription(orTerms: FilterTerm[]): string {
  const termDescriptions = orTerms.map(term => {
    const parts: string[] = [];
    
    // include条件
    if (term.include.length > 0) {
      const includeNames = term.include.map(id => getTagNameById(id));
      parts.push(...includeNames);
    }
    
    // exclude条件
    if (term.exclude.length > 0) {
      const excludeNames = term.exclude.map(id => getTagNameById(id));
      parts.push(...excludeNames.map(name => `NOT ${name}`));
    }
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    
    return `(${parts.join(' AND ')})`;
  });
  
  const validDescriptions = termDescriptions.filter(desc => desc !== '');
  
  if (validDescriptions.length === 0) return '';
  if (validDescriptions.length === 1) return validDescriptions[0];
  
  return validDescriptions.join(' OR ');
}