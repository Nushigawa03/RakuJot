import React from 'react';
import { useDarkMode } from '../../../hooks/useDarkMode';
import ToggleSwitch from '../../../components/ToggleSwitch';

const DarkModeToggle: React.FC = () => {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <ToggleSwitch
      label="ダークモード"
      isChecked={isDark}
      onChange={toggleDarkMode}
    />
  );
};

export default DarkModeToggle;