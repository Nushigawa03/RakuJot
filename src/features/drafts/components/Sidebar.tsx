import React from 'react';
import './Sidebar.css';
import { SidebarProps } from '../types/sidebar';
import { filters } from '../stores/filters';
import { categories } from '../stores/categories';
import { useFilter } from '../hooks/useFilter';

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const { activeFilter, activeQuery, handleFilterClick } = useFilter(onFilterChange);

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
            {filter.name}
          </li>
        ))}
      </ul>

      {activeQuery && (
        <div className="filter-details">
          <h4>詳細</h4>
          <p>{activeQuery}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;