import React, { useState, useRef, useEffect } from 'react';
import './TagInput.css';

interface Tag {
    id: string;
    name: string;
}

interface TagInputProps {
    selectedTags: string[];
    availableTags: Tag[];
    onAddTag: (tagName: string) => void;
    onRemoveTag: (tagName: string) => void;
}

export const TagInput: React.FC<TagInputProps> = ({
    selectedTags,
    availableTags,
    onAddTag,
    onRemoveTag,
}) => {
    const [tagInput, setTagInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    const filteredSuggestions = availableTags
        .filter(tag =>
            tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.includes(tag.name)
        )
        .slice(0, 5);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            onAddTag(tagInput);
            setTagInput("");
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (tagName: string) => {
        onAddTag(tagName);
        setTagInput("");
        setShowSuggestions(false);
    };

    return (
        <div className="tags-container" aria-label="タグ">
            {selectedTags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="tag-chip">
                    {tag}
                    <button
                        type="button"
                        className="tag-remove-button"
                        onClick={() => onRemoveTag(tag)}
                        aria-label={`Remove ${tag}`}
                    >
                        ×
                    </button>
                </span>
            ))}
            <div className="tag-input-wrapper">
                <input
                    ref={tagInputRef}
                    type="text"
                    className="tag-input"
                    value={tagInput}
                    onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowSuggestions(e.target.value.length > 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => tagInput.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="タグを追加"
                    aria-label="タグ入力"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                        {filteredSuggestions.map((tag) => (
                            <div
                                key={tag.id}
                                className="tag-suggestion"
                                onClick={() => handleSuggestionClick(tag.name)}
                            >
                                {tag.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
