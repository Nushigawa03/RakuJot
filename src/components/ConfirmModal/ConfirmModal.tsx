import React, { useEffect } from 'react';
import { Button } from '~/components';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'キャンセル',
    isDangerous = false,
    onConfirm,
    onCancel,
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
        <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <Button variant="secondary" className="cancel-button" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDangerous ? 'danger' : 'primary'}
                        className={isDangerous ? 'danger-button' : 'confirm-button'}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
