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
      e.preventDefault();
      onChange();
    }
  };

  return (
    <div className="toggle-switch">
      <span className="toggle-label">{label}</span>
      <label className="toggle-container" tabIndex={0} onKeyDown={handleKeyDown}>
        <input type="checkbox" checked={isChecked} onChange={onChange} />
        <span className="slider"></span>
      </label>
    </div>
  );
};

export default ToggleSwitch;
