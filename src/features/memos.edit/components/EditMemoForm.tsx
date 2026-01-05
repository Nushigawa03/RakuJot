import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import './EditMemoForm.css';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useMemoForm, Tag } from '../hooks/useMemoForm';
import { useMemoAi } from '../hooks/useMemoAi';
import { EditMemoView } from './EditMemoView';
import { EditMemoEditor } from './EditMemoEditor';
import { EditMemoHeader } from './EditMemoHeader';

interface EditMemoFormProps {
  memo: {
    id: string;
    title: string;
    body: string;
    date?: string;
    tags?: Tag[];
  };
  onSubmit: (title: string, body: string, tags: string[], date: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
  error: string | null;
  availableTags: Tag[];
}

const EditMemoForm: React.FC<EditMemoFormProps> = ({
  memo,
  onSubmit,
  onDelete,
  error,
  availableTags
}) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    title, setTitle,
    body, setBody,
    date, setDate,
    selectedTags, setSelectedTags,
    isSaving,
    lastSaved,
    historyIndex,
    historyLength,
    performSave,
    saveToHistory, // Add this
    handleDiscardChanges,
    handleUndo,
    handleRedo
  } = useMemoForm({ initialMemo: memo, onSubmit });

  // Use current form state for AI context
  const currentMemoData = { title, body, date, tags: selectedTags };

  const {
    quickEditContent, setQuickEditContent,
    isAiProcessing,
    aiSuggestion, setAiSuggestion,
    handleAiSuggest,
    handleApplySuggestion,
    handleRejectSuggestion
  } = useMemoAi({
    currentMemo: currentMemoData,
    onApply: async (suggestion) => {
      const ok = await performSave(suggestion.title, suggestion.body, suggestion.tags, suggestion.date);
      if (ok) {
        saveToHistory(suggestion); // Save to history stack
        setTitle(suggestion.title);
        setBody(suggestion.body);
        setDate(suggestion.date);
        setSelectedTags(suggestion.tags);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave(title, body, selectedTags, date);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteModalOpen(false);
    await onDelete();
  };

  const handleAddTag = (tagName: string) => {
    if (tagName.trim() && !selectedTags.includes(tagName.trim())) {
      setSelectedTags([...selectedTags, tagName.trim()]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="edit-memo-container full-screen">
      <EditMemoHeader
        onBack={() => navigate(-1)}
        isSaving={isSaving}
        error={error}
        lastSaved={lastSaved}
        onDiscard={handleDiscardChanges}
        canDiscard={historyIndex > 0}
        onDelete={() => setIsDeleteModalOpen(true)}
        editMode={editMode}
        onToggleMode={() => setEditMode(!editMode)}
      />

      {!editMode ? (
        <EditMemoView
          memo={currentMemoData}
          history={{
            canUndo: historyIndex > 0,
            canRedo: historyIndex < historyLength - 1,
            onUndo: handleUndo,
            onRedo: handleRedo
          }}
          ai={{
            quickEditContent,
            setQuickEditContent,
            isProcessing: isAiProcessing,
            suggestion: aiSuggestion,
            setSuggestion: setAiSuggestion,
            onSuggest: handleAiSuggest,
            onApply: handleApplySuggestion,
            onReject: handleRejectSuggestion
          }}
        />
      ) : (
        <EditMemoEditor
          title={title} setTitle={setTitle}
          body={body} setBody={setBody}
          date={date} setDate={setDate}
          selectedTags={selectedTags}
          availableTags={availableTags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onSubmit={handleSubmit}
          onDelete={() => setIsDeleteModalOpen(true)}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        memoTitle={title}
      />
    </div>
  );
};

export default EditMemoForm;