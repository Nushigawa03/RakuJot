import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import { SidebarProps } from '../types/sidebar';
import { Filter } from '../types/filters';
import { Category } from '../types/categories';
import { generateFilterName } from '../utils/filterUtils';
import { useFilter } from '../hooks/useFilter';
import { formatLogicalText } from '../utils/logicalTextFormatter';
import { SidebarSettingsModal } from './SidebarSettingsModal';
import tagExpressionService from '../services/tagExpressionService';
import { initializeTags } from '../utils/tagUtils';

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const { activeFilter, activeQuery, handleFilterClick } = useFilter(onFilterChange);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryClassName = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

  const handleDeleteFilter = async (filterId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを停止
    
    try {
      await tagExpressionService.delete(filterId);
      // フィルタリストから削除
      setFilters(filters.filter(f => f.id !== filterId));
      // アクティブなフィルタの場合はリセット
      if (activeFilter === filterId) {
        onFilterChange('');
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
      setIsLoading(true);
      // タグを最初に初期化してからフィルタ/カテゴリを読み込む
      await initializeTags();
      const { filters: f, categories: c } = await tagExpressionService.load();
      setFilters(f);
      setCategories(c);
    } catch (error) {
      console.error('フィルタ・カテゴリの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'sidebar-category-color-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const rules = categories
      .filter((category) => category.color)
      .map(
        (category) =>
          `.category-color--${getCategoryClassName(category.id)} { --category-color: ${category.color}; }`
      )
      .join('\n');

    styleEl.textContent = rules;
  }, [categories]);

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
      {isLoading ? (
        <div className="sidebar-loading">読み込み中...</div>
      ) : (
        <ul>
          {categories.map((category) => (
            <li
              key={category.id}
              className={`category ${category.color ? 'has-color' : ''} ${activeFilter === category.id ? 'active' : ''} ${category.color ? `category-color--${getCategoryClassName(category.id)}` : ''}`}
              onClick={() => handleFilterClick(category)}
            >
              <span className="category-label">
                <span className="category-name">{category.name}</span>
              </span>
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
      )}

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