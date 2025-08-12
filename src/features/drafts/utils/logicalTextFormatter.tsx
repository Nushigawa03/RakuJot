import React from 'react';

// 論理演算子をスタイル付きで表示するヘルパー
export const formatLogicalText = (text: string): React.ReactNode => {
  // AND, OR, NOTを特別なスタイルで表示
  const parts = text.split(/(\s+AND\s+|\s+OR\s+|\s+NOT\s+|AND\s+|OR\s+|NOT\s+)/);
  
  return parts.map((part, index) => {
    const trimmedPart = part.trim();
    
    if (trimmedPart === 'AND') {
      return (
        <span key={index} className="logical-operator and">
          AND
        </span>
      );
    } else if (trimmedPart === 'OR') {
      return (
        <span key={index} className="logical-operator or">
          OR
        </span>
      );
    } else if (trimmedPart === 'NOT') {
      return (
        <span key={index} className="logical-operator not">
          NOT
        </span>
      );
    } else if (part.includes(' ')) {
      // スペースのみの部分
      return part;
    } else {
      // 通常のテキスト（タグ名など）
      return part;
    }
  });
};
