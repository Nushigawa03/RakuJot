import { useState, type KeyboardEvent } from 'react';
import type { Tag } from '~/features/memos/types/tags';

export interface Chip {
  key: string;
  label: string;
  className?: string;
}

interface TagInputProps {
  chips: Chip[];
  onRemove: (key: string) => void;
  /** 候補（選択済みを除いたもの）。入力文字列で絞り込んで表示する */
  suggestions: Tag[];
  onSelect: (tag: Tag) => void;
  /** 指定すると、候補にない文字列も Enter で追加できる */
  onCreate?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** チップ表示 + 候補付きの入力欄（↑↓で選択 / Enterで決定 / Escで閉じる） */
export const TagInput = ({ chips, onRemove, suggestions, onSelect, onCreate, placeholder = 'タグを追加', disabled }: TagInputProps) => {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = text.trim().toLowerCase();
  const matches = suggestions.filter((t) => t.name.toLowerCase().includes(query)).slice(0, 6);

  const commit = (tag?: Tag) => {
    if (tag) onSelect(tag);
    else if (onCreate && text.trim()) onCreate(text.trim());
    else return;
    setText('');
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : -1));
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit(matches[active] ?? (onCreate ? undefined : matches[0]));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !text && chips.length) {
      onRemove(chips[chips.length - 1].key);
    }
  };

  return (
    <div className={`tag-input ${disabled ? 'is-disabled' : ''}`}>
      {chips.map((chip) => (
        <span key={chip.key} className={`chip ${chip.className ?? ''}`}>
          {chip.label}
          <button type="button" onClick={() => onRemove(chip.key)} aria-label={`${chip.label}を削除`} disabled={disabled}>×</button>
        </span>
      ))}
      <div className="tag-input__field">
        <input
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {open && matches.length > 0 && (
          <ul className="dropdown" role="listbox">
            {matches.map((tag, i) => (
              <li
                key={tag.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseDown={(e) => { e.preventDefault(); commit(tag); }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{tag.name}</span>
                {tag.description && <small>{tag.description}</small>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
