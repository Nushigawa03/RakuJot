import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import { SidebarProps } from '../../types/sidebar';
import { TagExpression } from '../../types/tagExpressions';
import { generateExpressionName } from '../../utils/tagExpressionUtils';
import { useTagExpression } from '../../hooks/useTagExpression';
import { formatLogicalText } from '../../utils/logicalTextFormatter';
import { SidebarSettingsModal } from './SidebarSettingsModal';
import tagExpressionService from '../../services/tagExpressionService';
import { initializeTags } from '../../utils/tagUtils';

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const { activeExpression, activeQuery, handleExpressionClick } = useTagExpression(onFilterChange);
  const [expressions, setExpressions] = useState<TagExpression[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getExpressionClassName = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

  const handleDeleteExpression = async (expressionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tagExpressionService.delete(expressionId);
      setExpressions(expressions.filter(x => x.id !== expressionId));
      if (activeExpression === expressionId) onFilterChange('');
    } catch (error) {
      console.error('式削除エラー:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await initializeTags();
      const exprs = await tagExpressionService.load();
      setExpressions(exprs || []);
    } catch (error) {
      console.error('TagExpression の読み込みエラー:', error);
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

    const named = expressions.filter(e => e.name);
    const rules = named
      .filter((e) => e.color)
      .map((e) => `.category-color--${getExpressionClassName(e.id)} { --category-color: ${e.color}; }`)
      .join('\n');

    styleEl.textContent = rules;
  }, [expressions]);

  const handleSettingsDataChange = () => {
    loadData();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>
          タグと式
          <span className="tooltip">
            <span className="tooltip-icon">?</span>
            <span className="tooltip-text">
              タグはメモに直接付けられたラベルです。
              <br />
              式は複数のタグ検索条件をまとめたものです。
            </span>
          </span>
        </h3>
        <button
          className="settings-button"
          onClick={() => setIsSettingsOpen(true)}
          title="タグと式を編集"
        >
          ⚙️
        </button>
      </div>

      {isLoading ? (
        <div className="sidebar-loading">読み込み中...</div>
      ) : (
        <ul>
          {expressions.filter(e => e.name).map((expr) => (
            <li
              key={expr.id}
              className={`category ${expr.color ? 'has-color' : ''} ${activeExpression === expr.id ? 'active' : ''} ${expr.color ? `category-color--${getExpressionClassName(expr.id)}` : ''}`}
              onClick={() => handleExpressionClick(expr)}
            >
              <span className="category-label">
                <span className="category-name">{expr.name}</span>
              </span>
            </li>
          ))}

          {expressions.filter(e => !e.name).map((expr) => (
            <li
              key={expr.id}
              className={`filter ${activeExpression === expr.id ? 'active' : ''}`}
              onClick={() => handleExpressionClick(expr)}
            >
              <span className="filter-name">
                {formatLogicalText(generateExpressionName(expr.orTerms))}
              </span>
              <button
                className="delete-filter-button"
                onClick={(e) => handleDeleteExpression(expr.id, e)}
                title="式を削除"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeQuery && (
        <div className="expression-details">
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