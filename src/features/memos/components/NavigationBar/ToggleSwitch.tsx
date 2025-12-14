import React from 'react';
import './ToggleSwitch.css';

interface ToggleSwitchProps {
  label: string;
  isChecked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, isChecked, onChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // スクロール防止（スペースキーの場合）
      onChange(); // トグルの状態を切り替える
    }
  };

  return (
    <div className="toggle-switch">
      <span className="toggle-label">{label}</span>
      <label
        className="toggle-container"
        tabIndex={0} // Tabキーで選択可能にする
        onKeyDown={handleKeyDown} // キーボード操作を処理
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onChange}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
};

export default ToggleSwitch;