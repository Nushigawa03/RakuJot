import React from 'react';
import './EditMemoView.css';
import { Button, Textarea } from '~/components';
import { MemoData } from '../hooks/useMemoForm';
import { AiSuggestionPanel } from './AiSuggestionPanel';

interface EditMemoViewProps {
    memo: MemoData;
    history: {
        canUndo: boolean;
        canRedo: boolean;
        onUndo: () => void;
        onRedo: () => void;
    };
    ai: {
        quickEditContent: string;
        setQuickEditContent: (val: string) => void;
        isProcessing: boolean;
        suggestion: MemoData | null;
        setSuggestion: (data: MemoData) => void;
        onSuggest: () => void;
        onApply: () => void;
        onReject: () => void;
    };
}

export const EditMemoView: React.FC<EditMemoViewProps> = ({
    memo,
    history,
    ai,
}) => {
    const { title, date, tags, body } = memo;

    return (
        <div className="view-mode">
            <div className="memo-display">
                <h1 className="memo-title">{title || '(タイトルなし)'}</h1>
                {date && <div className="memo-date">{date}</div>}
                {tags.length > 0 && (
                    <div className="memo-tags">
                        {tags.map((tag, index) => (
                            <span key={`${tag}-${index}`} className="tag-badge">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <div className="memo-body">
                    {body.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                    ))}
                </div>
            </div>

            <div className="quick-edit">
                <div className="quick-edit-header">
                    <div className="header-top">
                        <h3>✨ 手軽に編集</h3>
                        <div className="history-controls">
                            <Button className="btn-undo" variant="secondary" onClick={history.onUndo} disabled={!history.canUndo}>
                                ↶
                            </Button>
                            <Button className="btn-redo" variant="secondary" onClick={history.onRedo} disabled={!history.canRedo}>
                                ↷
                            </Button>
                        </div>
                    </div>
                    <p className="quick-edit-description">
                        メモを改善したいアイデアがあれば、ここに書くとAIが提案します
                    </p>
                </div>

                {ai.suggestion ? (
                    <AiSuggestionPanel
                        suggestion={ai.suggestion}
                        onChange={ai.setSuggestion}
                        onApply={ai.onApply}
                        onReject={ai.onReject}
                    />
                ) : (
                    <>
                        <Textarea
                            className="quick-body"
                            placeholder="改善したい点を教えてください"
                            value={ai.quickEditContent}
                            onChange={ai.setQuickEditContent}
                            rows={8}
                            disabled={ai.isProcessing}
                            autoResize={false}
                            showLines={true}
                        />
                        <Button
                            className="btn-ai-suggest"
                            variant="primary"
                            onClick={ai.onSuggest}
                            disabled={!ai.quickEditContent.trim() || ai.isProcessing}
                        >
                            {ai.isProcessing ? '処理中...' : 'OK'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
