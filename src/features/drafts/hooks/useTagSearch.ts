import { useEffect, useRef, useState, useCallback } from 'react';
import { SearchTag } from '../types/searchTag';
import { Tag } from '../types/tags';

export function useTagSearch(availableTags: Tag[], initialFilterTags: SearchTag[] = []) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<SearchTag[]>(initialFilterTags);
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTagIndex, setSelectedTagIndex] = useState<number | null>(null);

  const findTagByName = useCallback((tagName: string): Tag | undefined => {
    return availableTags.find(tag => tag.name === tagName);
  }, [availableTags]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedTagIndex(null);
    setSelectedSuggestionIndex(-1);
    if (value.trim()) {
      const input = value.trim();
      const isExclude = input.startsWith('-');
      const searchTerm = isExclude ? input.slice(1) : input;
      if (searchTerm) {
        const matchingTags = availableTags.filter(tag => 
          tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !filterTags.some(filterTag => filterTag.id === tag.id && filterTag.isExclude === isExclude)
        );
        setSuggestions(matchingTags.slice(0, 5));
        setShowSuggestions(matchingTags.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [availableTags, filterTags]);

  const handleTagAdd = useCallback((tagInput: string) => {
    const isExclude = tagInput.startsWith('-');
    const tagName = isExclude ? tagInput.slice(1) : tagInput;
    const foundTag = findTagByName(tagName);
    const newSearchTag: SearchTag = {
      id: foundTag ? foundTag.id : `temp_${Date.now()}`,
      name: tagName,
      isExclude: isExclude
    };
    const existingTag = filterTags.find(tag => tag.id === newSearchTag.id && tag.isExclude === newSearchTag.isExclude);
    if (!existingTag) {
      const newFilterTags = [...filterTags, newSearchTag];
      setFilterTags(newFilterTags);
      try {
        window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'tags', tags: newFilterTags } }));
      } catch {}
    }
  }, [filterTags, findTagByName]);

  const handleTagRemove = useCallback((targetTag: SearchTag) => {
    const newFilterTags = filterTags.filter((tag) => !(tag.id === targetTag.id && tag.isExclude === targetTag.isExclude));
    setFilterTags(newFilterTags);
    try {
      window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'tags', tags: newFilterTags } }));
    } catch {}
    setSelectedTagIndex(null);
  }, [filterTags]);

  return {
    searchQuery,
    setSearchQuery,
    filterTags,
    setFilterTags,
    suggestions,
    setSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    showSuggestions,
    setShowSuggestions,
    selectedTagIndex,
    setSelectedTagIndex,
    handleSearchChange,
    handleTagAdd,
    handleTagRemove,
    findTagByName,
  };
}
