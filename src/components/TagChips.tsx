import React from 'react';
import './TagChips.css';
import type { SearchTag } from "~/features/memos/types/searchTag";

interface TagChipsProps {
  tags: SearchTag[];
  selectedIndex: number | null;
  onRemove: (tag: SearchTag) => void;
}

const TagChips: React.FC<TagChipsProps> = ({ tags, selectedIndex, onRemove }) => {
  if (tags.length === 0) return null;

  return (
    <div className="tag-chips-mobile">
      {tags.map((tag, index) => (
        <span
          key={`${tag.id}-${tag.isExclude}`}
          className={`tag-mobile ${selectedIndex === index ? 'selected' : ''} ${tag.isExclude ? 'exclude' : ''}`}
        >
          {tag.isExclude ? `NOT ${tag.name}` : tag.name}
          <button onClick={() => onRemove(tag)}>×</button>
        </span>
      ))}
    </div>
  );
};

export default TagChips;
