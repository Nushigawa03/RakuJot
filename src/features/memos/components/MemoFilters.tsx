import React from 'react';
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
              className={`page-mobile__pill ${activeExpression === category.id ? 'page-mobile__pill--active' : ''}`}
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