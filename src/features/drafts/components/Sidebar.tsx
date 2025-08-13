import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import { SidebarProps } from '../types/sidebar';
import { Filter } from '../types/filters';
import { Category } from '../types/categories';
import { generateFilterName } from '../utils/filterUtils';
import { useFilter } from '../hooks/useFilter';
import { formatLogicalText } from '../utils/logicalTextFormatter';
import { SidebarSettingsModal } from './SidebarSettingsModal';

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const { activeFilter, activeQuery, handleFilterClick } = useFilter(onFilterChange);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDeleteFilter = async (filterId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを停止
    
    try {
      const response = await fetch('/api/filters', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: filterId }),
      });
      
      if (response.ok) {
        // フィルタリストから削除
        setFilters(filters.filter(f => f.id !== filterId));
        // アクティブなフィルタの場合はリセット
        if (activeFilter === filterId) {
          onFilterChange('');
        }
      } else {
        console.error('フィルタの削除に失敗しました');
      }
    } catch (error) {
      console.error('フィルタ削除エラー:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [filtersResponse, categoriesResponse] = await Promise.all([
        fetch('/api/filters'),
        fetch('/api/categories')
      ]);
      
      if (filtersResponse.ok && categoriesResponse.ok) {
        const filtersData = await filtersResponse.json();
        const categoriesData = await categoriesResponse.json();
        setFilters(filtersData);
        setCategories(categoriesData);
      } else {
        console.error('APIからのデータ取得に失敗しました');
      }
    } catch (error) {
      console.error('フィルタ・カテゴリの読み込みエラー:', error);
    }
  };

  const handleSettingsDataChange = () => {
    // 設定モーダルでデータが変更された時にリロード
    loadData();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>
          タグ・カテゴリ
          <span className="tooltip">
            <span className="tooltip-icon">?</span>
            <span className="tooltip-text">
              タグはメモに直接付けられたラベルです。
              <br />
              カテゴリは複数のタグ検索条件をまとめたものです。
            </span>
          </span>
        </h3>
        <button 
          className="settings-button"
          onClick={() => setIsSettingsOpen(true)}
          title="タグ・フィルタ・カテゴリを編集"
        >
          ⚙️
        </button>
      </div>
      <ul>
        {categories.map((category) => (
          <li
            key={category.id}
            className={`category ${activeFilter === category.id ? 'active' : ''}`}
            onClick={() => handleFilterClick(category)}
            style={{ borderLeft: category.color ? `4px solid ${category.color}` : undefined }}
          >
            {category.name}
          </li>
        ))}
        {filters.map((filter) => (
          <li
            key={filter.id}
            className={`filter ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => handleFilterClick(filter)}
          >
            <span className="filter-name">
              {formatLogicalText(generateFilterName(filter.orTerms))}
            </span>
            <button 
              className="delete-filter-button"
              onClick={(e) => handleDeleteFilter(filter.id, e)}
              title="フィルタを削除"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {activeQuery && (
        <div className="filter-details">
          <h4>詳細</h4>
          <p>{formatLogicalText(activeQuery)}</p>
        </div>
      )}

      <SidebarSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChange={handleSettingsDataChange}
      />
    </div>
  );
};

export default Sidebar;