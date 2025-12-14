import { useState, useEffect } from 'react';
import { TagExpression, FilterTerm } from '../types/filterTypes';
import { getTagNameById, initializeTags } from '../utils/tagUtils';
import { generateExpressionName } from '../utils/tagExpressionUtils';

type TagExprItem = TagExpression;

export const useTagExpression = (onExpressionChange: (expressionQuery: string) => void, tagExpressions: TagExpression[] = []) => {
  const [activeExpression, setActiveExpression] = useState<string>(''); // 現在のアクティブな TagExpression ID
  const [activeQuery, setActiveQuery] = useState<string | null>(null); // 現在の詳細表示

  // タグデータを初期化
  useEffect(() => {
    initializeTags();
  }, []);

  const handleExpressionClick = (exprItem: TagExprItem) => {
    if (activeExpression === exprItem.id) {
      // 同じ式がクリックされた場合は解除
      setActiveExpression('');
      setActiveQuery(null);
      onExpressionChange('');
    } else {
      // 新しい式を適用
      setActiveExpression(exprItem.id);

      // 名前付き(TagExpression.name) の場合は詳細表示あり
      if (exprItem.name) {
        const queryDetails = generateExpressionName(exprItem.orTerms);
        setActiveQuery(queryDetails);
      } else {
        setActiveQuery(null);
      }

      // 選択した式の ID を外部に通知
      onExpressionChange(exprItem.id);
    }
  };

  return { activeExpression, activeQuery, handleExpressionClick };
};