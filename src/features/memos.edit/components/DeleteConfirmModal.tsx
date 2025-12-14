import React, { useEffect } from 'react';
import './DeleteConfirmModal.css';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  memoTitle: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  memoTitle,
}) => {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>メモの削除</h2>
        </div>
        <div className="modal-body">
          <p>以下のメモを削除してもよろしいですか？</p>
          <p className="memo-title-preview">「{memoTitle}」</p>
          <p className="warning-text">この操作は取り消せません。</p>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
