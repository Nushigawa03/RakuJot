import React, { useEffect, useState } from 'react';
import { memoService } from '../../services/memoService';
import type { TrashedMemo } from '../../types/trashedMemo';
import './TrashPage.css';

const TrashPage: React.FC = () => {
    const [trashedMemos, setTrashedMemos] = useState<TrashedMemo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            alert('メモを復元しました');
            loadTrashedMemos();
        } else {
            alert(`復元に失敗しました: ${result.error}`);
        }
    };

    const handlePermanentDelete = async (id: string) => {
        if (!confirm('本当に完全削除しますか？この操作は取り消せません。')) {
            return;
        }

        const result = await memoService.permanentlyDeleteMemo(id);
        if (result.ok) {
            alert('メモを完全削除しました');
            loadTrashedMemos();
        } else {
            alert(`削除に失敗しました: ${result.error}`);
        }
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
                <h1>🗑️ ゴミ箱</h1>
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
                                    onClick={() => handlePermanentDelete(memo.id)}
                                >
                                    完全削除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrashPage;
