import React, { useEffect } from 'react';
import { TagExpression } from '../types/tagExpressions';
import { generateExpressionName } from '../utils/tagExpressionUtils';
import { formatLogicalText } from '../utils/logicalTextFormatter';
import { SearchTag } from '../types/searchTag';

interface MemoFiltersProps {
  dateQuery: string;
  setDateQuery: (query: string) => void;
  textQuery?: string;
  setTextQuery?: (query: string) => void;
  tagQuery?: SearchTag[];
  removeTag?: (tag: SearchTag) => void;
  expressions: TagExpression[];
  activeExpression: string | null;
  handleExpressionClick: (expression: TagExpression) => void;
}

const MemoFilters: React.FC<MemoFiltersProps> = ({
  dateQuery,
  setDateQuery,
  textQuery,
  setTextQuery,
  tagQuery,
  removeTag,
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
        {textQuery && setTextQuery && (
          <button
            onClick={() => setTextQuery('')}
            className="page-mobile__pill"
            style={{ backgroundColor: '#e0e0e0', color: '#333' }}
            title="テキスト検索をクリア"
          >
            "{textQuery}" ✕
          </button>
        )}
        {tagQuery && tagQuery.map(tag => (
          <button
            key={tag.id}
            onClick={() => removeTag && removeTag(tag)}
            className="page-mobile__pill"
            style={{ backgroundColor: '#e0e0e0', color: '#333' }}
            title="タグ検索をクリア"
          >
            🏷️ {tag.name} ✕
          </button>
        ))}
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