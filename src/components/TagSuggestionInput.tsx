import React, { useEffect, useRef, useState } from 'react';
import './TagSuggestionInput.css';

export type Tag = { id: string; name: string; description?: string };

interface TagSuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (tagId: string, tagName: string) => void;
  suggestions: Tag[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TagSuggestionInput: React.FC<TagSuggestionInputProps> = ({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  disabled,
  className
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        // Enter で確定（候補がない場合は何もしない）
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          const tag = suggestions[selectedIndex];
          onSelect(tag.id, tag.name);
          setShowSuggestions(false);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSuggestionClick = (tag: Tag) => {
    onSelect(tag.id, tag.name);
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const container = suggestionsRef.current;
      const item = container.children[selectedIndex] as HTMLElement | undefined;
      if (item) {
        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        if (itemTop < containerTop) {
          container.scrollTop = itemTop;
        } else if (itemBottom > containerBottom) {
          container.scrollTop = itemBottom - container.clientHeight;
        }
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`tag-suggestion-input ${className || ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="tag-input"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown" ref={suggestionsRef}>
          {suggestions.map((tag, index) => (
            <div
              key={tag.id}
              className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
              onMouseDown={() => handleSuggestionClick(tag)}
            >
              <div className="tag-name">{tag.name}</div>
              {tag.description && (
                <div className="tag-description">{tag.description}</div>
              )}
            </div>
          ))}
          <div className="keyboard-help">↑↓で選択 / Enterで決定 / Escで閉じる</div>
        </div>
      )}
      {showSuggestions && suggestions.length === 0 && (
        <div className="no-suggestions">候補がありません</div>
      )}
    </div>
  );
}

export default TagSuggestionInput;
