import React from 'react';
import './Sidebar.css';
import { SidebarProps } from '../types/sidebar';
import { filters } from '../stores/filters';
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
        {filters.map((filter, index) => (
          <li
            key={index}
            className={`${activeFilter === filter.query ? 'active' : ''} ${
              filter.isCategory ? 'category' : 'tag'
            }`}
            onClick={() => handleFilterClick(filter)}
          >
            {filter.name}
          </li>
        ))}
      </ul>
      {activeQuery && (
        <div className="category-details">
          <h4>カテゴリの詳細</h4>
          <p>{activeQuery}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;