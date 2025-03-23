import React from 'react';
import './QuickMemoInput.css';

const QuickMemoInput: React.FC = () => {
  return (
    <div className="quick-memo-input">
      <textarea placeholder="ここにクイックメモを入力..." />
      <button>保存</button>
    </div>
  );
};

export default QuickMemoInput;