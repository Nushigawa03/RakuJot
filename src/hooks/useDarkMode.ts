import { useState, useLayoutEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setIsDark(JSON.parse(stored));
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(!isDark);

  return { isDark, toggleDarkMode };
}