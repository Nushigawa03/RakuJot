import React from 'react';
import './AiSuggestionPanel.css';
import { Button, Textarea } from '~/components';
import { MemoData } from '../hooks/useMemoForm';

interface AiSuggestionPanelProps {
    suggestion: MemoData;
    onChange: (data: MemoData) => void;
    onApply: () => void;
    onReject: () => void;
}

export const AiSuggestionPanel: React.FC<AiSuggestionPanelProps> = ({
    suggestion,
    onChange,
    onApply,
    onReject,
}) => {
    return (
        <div className="ai-suggestion-preview">
            <div className="suggestion-header">
                <span className="suggestion-label">🤖 AIの提案</span>
            </div>
            <div className="suggestion-content">
                <div className="suggestion-field">
                    <label>タイトル:</label>
                    <input
                        type="text"
                        value={suggestion.title}
                        onChange={(e) => onChange({ ...suggestion, title: e.target.value })}
                    />
                </div>
                <div className="suggestion-field">
                    <label>日付:</label>
                    <input
                        type="text"
                        value={suggestion.date}
                        onChange={(e) => onChange({ ...suggestion, date: e.target.value })}
                    />
                </div>
                <div className="suggestion-field">
                    <label>タグ:</label>
                    <div className="suggestion-tags">
                        {suggestion.tags.map((tag, idx) => (
                            <span key={idx} className="tag-badge">{tag}</span>
                        ))}
                    </div>
                </div>
                <div className="suggestion-field">
                    <label>内容:</label>
                    <Textarea
                        value={suggestion.body}
                        onChange={(value) => onChange({ ...suggestion, body: value })}
                        rows={6}
                        autoResize={false}
                        showLines={true}
                    />
                </div>
            </div>
            <div className="suggestion-buttons actions-fixed">
                <Button className="btn-apply" variant="primary" onClick={onApply}>
                    ✓ この内容を適用
                </Button>
                <Button className="btn-reject" variant="secondary" onClick={onReject}>
                    ✗ キャンセル
                </Button>
            </div>
        </div>
    );
};
