import type { CSSProperties } from 'react';

// icons/*.svg（24×24・黒の線画）を CSS マスクとして使い、文字色（currentColor）で塗る
const urls = import.meta.glob<string>('./icons/*.svg', { eager: true, query: '?url', import: 'default' });

export type IconName =
  | 'alert' | 'arrow-left' | 'book-open' | 'calendar' | 'check' | 'chevron-down' | 'chevron-up'
  | 'circle-minus' | 'circle-plus' | 'cloud' | 'cloud-off' | 'eye' | 'eye-off' | 'key' | 'lightbulb'
  | 'note' | 'pen-tool' | 'pencil' | 'pin' | 'plus' | 'redo' | 'refresh' | 'reset' | 'save' | 'search'
  | 'settings' | 'sparkles' | 'tag' | 'trash' | 'undo' | 'user' | 'wrench' | 'x' | 'zap';

/** 装飾用アイコン。意味はボタンの aria-label や隣のテキストで伝える */
const Icon = ({ name, className = '' }: { name: IconName; className?: string }) => (
  <span
    className={`icon ${className}`}
    style={{ '--icon': `url("${urls[`./icons/${name}.svg`]}")` } as CSSProperties}
    aria-hidden="true"
  />
);

export default Icon;
