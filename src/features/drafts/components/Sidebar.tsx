import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import { SidebarProps } from '../types/sidebar';
import type { Filter } from '../stores/filters';
import type { Category } from '../stores/categories';
import { useFilter } from '../hooks/useFilter';
import { formatLogicalText } from '../utils/logicalTextFormatter';

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const { activeFilter, activeQuery, handleFilterClick } = useFilter(onFilterChange);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
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

    loadData();
  }, []);

  return (
    <div className="sidebar">
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
              {formatLogicalText(filter.name)}
            </span>
          </li>
        ))}
      </ul>

      {activeQuery && (
        <div className="filter-details">
          <h4>詳細</h4>
          <p>{formatLogicalText(activeQuery)}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;