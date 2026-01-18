import React, { useRef } from "react";
import { useNavigate } from "react-router";
import MemoListBackground from "./PageMobile/MemoListBackground";
import InputOverlay from "./PageMobile/InputOverlay";
import { useDragOverlay } from "../hooks/useDragOverlay";
import { useKeyboardManager } from "../hooks/useKeyboardManager";
import { useSearchFilters } from "../hooks/useSearchFilters";
import "./PageMobile.css";

const PageMobile: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hooks for state management
  const { inputOffset, setInputOffset, isDragging, dragHandlers } = useDragOverlay(containerRef);
  useKeyboardManager();
  const {
    filterQuery,
    dateQuery,
    setDateQuery,
    textQuery,
    setTextQuery,
    queryEmbedding,
    tagQuery,
    setTagQuery,
    expressions,
    activeExpression,
    handleExpressionClick,
  } = useSearchFilters(setInputOffset);

  // Handlers
  const handleBackToInput = () => {
    setInputOffset(0);
    setDateQuery('');
  };

  const handleSettings = () => {
    try {
      navigate('/settings');
    } catch (e) {
      console.debug('NavigationBarMobile.settings.navigate.failed', e);
    }
  };

  const handleRemoveTag = (tagToRemove: any) => {
    setTagQuery(tagQuery.filter(t => t.id !== tagToRemove.id));
  };

  return (
    <div className="page-mobile" ref={containerRef}>
      {/* Background: Memo List (always visible) */}
      <MemoListBackground
        onBackToInput={handleBackToInput}
        onSettings={handleSettings}
        dateQuery={dateQuery}
        setDateQuery={setDateQuery}
        expressions={expressions}
        activeExpression={activeExpression}
        handleExpressionClick={handleExpressionClick}
        filterQuery={filterQuery}
        queryEmbedding={queryEmbedding}
        textQuery={textQuery}
        setTextQuery={setTextQuery}
        tagQuery={tagQuery}
        removeTag={handleRemoveTag}
      />

      {/* Foreground: FullScreenMemoInput (draggable overlay) */}
      <InputOverlay
        inputOffset={inputOffset}
        isDragging={isDragging}
        onMouseDown={dragHandlers.onMouseDown}
        onTouchStart={dragHandlers.onTouchStart}
      />
    </div>
  );
};

export default PageMobile;