import React from 'react';
import './TagChipInline.css';
import type { SearchTag } from "~/features/memos/types/searchTag";

interface TagChipInlineProps {
    tag: SearchTag;
    onRemove: (tag: SearchTag) => void;
}

/**
 * 検索バー内用のコンパクトなタグチップ
 * 標準のTagChipsよりも小さく、インライン表示に適したサイズ
 */
const TagChipInline: React.FC<TagChipInlineProps> = ({ tag, onRemove }) => {
    return (
        <span className={`tag-chip-inline ${tag.isExclude ? 'exclude' : ''}`}>
            {tag.isExclude ? `NOT ${tag.name}` : tag.name}
            <button
                type="button"
                className="tag-chip-inline-remove"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(tag);
                }}
                aria-label={`${tag.name}を削除`}
            >
                ×
            </button>
        </span>
    );
};

export default TagChipInline;
