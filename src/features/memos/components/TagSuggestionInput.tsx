import React, { useState, useRef, useEffect } from 'react';
import { Tag } from '../hooks/useTagSuggestions';
import './TagSuggestionInput.css';

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

  // 入力値が変更されたときの処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // キーボード操作の処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (value.trim()) {
          // 新規タグの場合、一時的なIDを生成
          const tempId = `new-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          onSelect(tempId, value.trim());
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          onSelect(suggestions[selectedIndex].id, suggestions[selectedIndex].name);
        } else if (value.trim()) {
          // 新規タグの場合、一時的なIDを生成
          const tempId = `new-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          onSelect(tempId, value.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // サジェスション項目がクリックされたときの処理
  const handleSuggestionClick = (tag: Tag) => {
    onSelect(tag.id, tag.name);
  };

  // 入力フィールドがフォーカスされたときの処理
  const handleFocus = () => {
    setShowSuggestions(true);
  };

  // 入力フィールドがフォーカスを失ったときの処理
  const handleBlur = () => {
    // 少し遅延させてサジェスションクリックを可能にする
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // 選択されたインデックスが変更されたときのスクロール処理
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
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
        <div ref={suggestionsRef} className="suggestions-dropdown">
          {suggestions.map((tag, index) => (
            <div
              key={tag.id}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(tag)}
            >
              <div className="tag-name">{tag.name}</div>
              {tag.description && (
                <div className="tag-description">{tag.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
