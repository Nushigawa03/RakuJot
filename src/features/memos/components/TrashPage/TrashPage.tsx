import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmModal } from '../../../../components';
import { memoService } from '../../services/memoService';
import type { TrashedMemo } from '../../types/trashedMemo';
import './TrashPage.css';

const TrashPage: React.FC = () => {
    const navigate = useNavigate();
    const [trashedMemos, setTrashedMemos] = useState<TrashedMemo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => { },
    });

    const openModal = (title: string, message: string, action: () => Promise<void>) => {
        setModalConfig({ isOpen: true, title, message, action });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        loadTrashedMemos();
    }, []);

    const loadTrashedMemos = async () => {
        try {
            setLoading(true);
            const memos = await memoService.getTrashedMemos();
            setTrashedMemos(memos);
        } catch (err) {
            setError('ゴミ箱のメモ取得に失敗しました');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (originalId: string) => {
        const result = await memoService.restoreMemo(originalId);
        if (result.ok) {
            loadTrashedMemos();
        } else {
            alert(`復元に失敗しました: ${result.error}`);
        }
    };

    const confirmPermanentDelete = (id: string) => {
        openModal(
            'メモの完全削除',
            '本当に完全削除しますか？この操作は取り消せません。',
            async () => {
                closeModal();
                const result = await memoService.permanentlyDeleteMemo(id);
                if (result.ok) {
                    loadTrashedMemos();
                } else {
                    alert(`削除に失敗しました: ${result.error}`);
                }
            }
        );
    };

    const confirmEmptyTrash = () => {
        openModal(
            'ゴミ箱を空にする',
            'ゴミ箱を空にしますか？この操作は取り消せません。',
            async () => {
                closeModal();
                try {
                    setLoading(true);
                    const deletePromises = trashedMemos.map(memo => memoService.permanentlyDeleteMemo(memo.id));
                    const results = await Promise.all(deletePromises);

                    const hasErrors = results.some(r => !r.ok);
                    if (hasErrors) {
                        alert('一部のメモの削除に失敗しました');
                    }
                } catch (err) {
                    alert('一括削除中にエラーが発生しました');
                    console.error(err);
                } finally {
                    loadTrashedMemos();
                }
            }
        );
    };

    const getDaysRemaining = (deletedAt: string, maxDays: number = 30) => {
        const deletedDate = new Date(deletedAt);
        const now = new Date();
        const diffTime = now.getTime() - deletedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, maxDays - diffDays);
    };

    if (loading) {
        return <div className="trash-page"><div className="trash-loading">読み込み中...</div></div>;
    }

    if (error) {
        return <div className="trash-page"><div className="trash-error">{error}</div></div>;
    }

    return (
        <div className="trash-page">
            <div className="trash-header">
                <div className="trash-header-top">
                    <div className="trash-header-title">
                        <button className="trash-back-btn" onClick={() => navigate(-1)} aria-label="戻る">
                            <span className="back-icon">←</span>
                        </button>
                        <h1>🗑️ ゴミ箱</h1>
                    </div>
                    {trashedMemos.length > 0 && (
                        <button className="trash-empty-btn" onClick={confirmEmptyTrash}>
                            ゴミ箱を空にする
                        </button>
                    )}
                </div>
                <p className="trash-description">
                    削除されたメモは30日後に自動的に完全削除されます
                </p>
            </div>

            {trashedMemos.length === 0 ? (
                <div className="trash-empty">
                    <p>ゴミ箱は空です</p>
                </div>
            ) : (
                <div className="trash-list">
                    {trashedMemos.map(memo => (
                        <div key={memo.id} className="trash-item">
                            <div className="trash-item-header">
                                <h3 className="trash-item-title">{memo.title}</h3>
                                <span className="trash-item-days">
                                    残り {getDaysRemaining(memo.deletedAt)} 日
                                </span>
                            </div>

                            {memo.body && (
                                <p className="trash-item-body">
                                    {memo.body.length > 100 ? `${memo.body.substring(0, 100)}...` : memo.body}
                                </p>
                            )}

                            <div className="trash-item-meta">
                                <span className="trash-item-date">
                                    削除日時: {new Date(memo.deletedAt).toLocaleString('ja-JP')}
                                </span>
                                {memo.tagNames.length > 0 && (
                                    <div className="trash-item-tags">
                                        {memo.tagNames.map((tag, idx) => (
                                            <span key={idx} className="trash-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="trash-item-actions">
                                <button
                                    className="trash-restore-btn"
                                    onClick={() => handleRestore(memo.originalId)}
                                >
                                    復元
                                </button>
                                <button
                                    className="trash-delete-btn"
                                    onClick={() => confirmPermanentDelete(memo.id)}
                                >
                                    完全削除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                isDangerous={true}
                confirmLabel="削除する"
                onConfirm={modalConfig.action}
                onCancel={closeModal}
            />
        </div>
    );
};

export default TrashPage;
