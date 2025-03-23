import React from 'react';
import './NavigationBar.css';

const NavigationBar: React.FC = () => {
  return (
    <div className="navigation-bar">
      <input type="text" placeholder="検索..." className="search-bar" />
      <button className="new-memo-button" onClick={() => console.log('新規メモ作成')}>
        新規メモ (Ctrl + N)
      </button>
    </div>
  );
};

export default NavigationBar;