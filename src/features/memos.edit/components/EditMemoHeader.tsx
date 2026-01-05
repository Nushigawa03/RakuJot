import React from 'react';
import { Button } from '~/components';
import './EditMemoHeader.css';

interface EditMemoHeaderProps {
    onBack: () => void;
    isSaving: boolean;
    error: string | null;
    lastSaved: Date | null;
    onDiscard: () => void;
    canDiscard: boolean;
    onDelete: () => void;
    editMode: boolean;
    onToggleMode: () => void;
}

export const EditMemoHeader: React.FC<EditMemoHeaderProps> = ({
    onBack,
    isSaving,
    error,
    lastSaved,
    onDiscard,
    canDiscard,
    onDelete,
    editMode,
    onToggleMode,
}) => {
    return (
        <div className="edit-memo-header-container sticky">
            <div className="top-actions">
                <Button type="button" className="back-button" variant="secondary" onClick={onBack}>
                    ← <span className="button-text">戻る</span>
                </Button>

                <div className="top-actions-center">
                    {isSaving ? (
                        <div className="saving-indicator">
                            💾 <span className="button-text">保存中...</span>
                        </div>
                    ) : error ? (
                        <div className="auto-save-indicator error">
                            ! <span className="button-text">{error}</span>
                        </div>
                    ) : (
                        lastSaved && (
                            <div className="auto-save-indicator">
                                ✓ <span className="button-text">{lastSaved.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に保存済み</span>
                            </div>
                        )
                    )}
                </div>

                <div className="top-actions-right">
                    <Button
                        type="button"
                        className="discard-button"
                        variant="secondary"
                        onClick={onDiscard}
                        disabled={!canDiscard}
                        title="破棄"
                    >
                        🔄 <span className="button-text">変更を破棄</span>
                    </Button>
                    <Button
                        type="button"
                        className="delete-button-top"
                        variant="secondary"
                        onClick={onDelete}
                        title="削除"
                    >
                        🗑️ <span className="button-text">削除</span>
                    </Button>
                    <Button
                        type="button"
                        className="mode-toggle-button"
                        variant="secondary"
                        onClick={onToggleMode}
                        title={editMode ? '閲覧モード' : '詳細編集'}
                    >
                        {editMode ? <>📖 <span className="button-text">閲覧</span></> : <>✏️ <span className="button-text">編集</span></>}
                    </Button>
                </div>
            </div>
        </div>
    );
};
