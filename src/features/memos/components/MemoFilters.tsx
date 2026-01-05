import React, { useEffect } from 'react';
import { TagExpression } from '../types/tagExpressions';
import { generateExpressionName } from '../utils/tagExpressionUtils';
import { formatLogicalText } from '../utils/logicalTextFormatter';

interface MemoFiltersProps {
  dateQuery: string;
  setDateQuery: (query: string) => void;
  expressions: TagExpression[];
  activeExpression: string | null;
  handleExpressionClick: (expression: TagExpression) => void;
}

const MemoFilters: React.FC<MemoFiltersProps> = ({
  dateQuery,
  setDateQuery,
  expressions,
  activeExpression,
  handleExpressionClick,
}) => {
  const getExpressionClassName = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Inject dynamic CSS for category colors (same as Sidebar)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'memofilters-category-color-styles';
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
  return (
    <div className="page-mobile__filters">
      <div className="page-mobile__pill-row">
        {dateQuery && (
          <button
            onClick={() => setDateQuery('')}
            className="page-mobile__pill page-mobile__pill--danger"
            title="日付検索をクリア"
          >
            📅 {dateQuery} ✕
          </button>
        )}
        {expressions
          .filter(e => !!e.name)
          .map((category) => (
            <button
              key={category.id}
              onClick={() => handleExpressionClick(category)}
              className={`page-mobile__pill ${activeExpression === category.id ? 'page-mobile__pill--active' : ''} ${category.color ? `page-mobile__pill--has-color category-color--${getExpressionClassName(category.id)}` : ''}`}
            >
              {category.name}
            </button>
          ))}
        {expressions
          .filter(e => !e.name)
          .map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleExpressionClick(filter)}
              className={`page-mobile__pill ${activeExpression === filter.id ? 'page-mobile__pill--active' : ''}`}
            >
              {formatLogicalText(generateExpressionName(filter.orTerms))}
            </button>
          ))}
      </div>
    </div>
  );
};

export default MemoFilters;