import React, { useState } from 'react';
import { TagEditor } from './Settings/TagEditor';
import { ExpressionEditor } from './Settings/ExpressionEditor';
import './SidebarSettingsModal.css';

interface SidebarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void; // データが変更された時のコールバック
}

type TabType = 'tags' | 'expressions';

export const SidebarSettingsModal: React.FC<SidebarSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChange
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tags');

  if (!isOpen) return null;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleDataChange = () => {
    // 子コンポーネントでデータが変更された時の処理
    if (onDataChange) {
      onDataChange();
    }
  };

  return (
    <div className="sidebar-settings-modal-overlay" onClick={onClose}>
      <div className="sidebar-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-settings-modal-header">
          <h2>タグ・フィルタ・カテゴリ設定</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="sidebar-settings-modal-tabs">
          <button
            className={`tab-button ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => handleTabChange('tags')}
          >
            タグ
          </button>
          <button
            className={`tab-button ${activeTab === 'expressions' ? 'active' : ''}`}
            onClick={() => handleTabChange('expressions')}
          >
            分類
          </button>
        </div>

        <div className="sidebar-settings-modal-content">
          {activeTab === 'tags' && <TagEditor />}
          {activeTab === 'expressions' && <ExpressionEditor />}
        </div>
      </div>
    </div>
  );
};
