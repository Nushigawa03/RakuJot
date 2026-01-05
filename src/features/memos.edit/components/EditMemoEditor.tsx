import React from 'react';
import './EditMemoEditor.css';
import { Button } from '~/components';
import { TagInput } from './TagInput';
import DatePickerInput from '~/components/DatePickerInput';
import { Tag } from '../hooks/useMemoForm';

interface EditMemoEditorProps {
    title: string;
    setTitle: (value: string) => void;
    body: string;
    setBody: (value: string) => void;
    date: string;
    setDate: (value: string) => void;
    selectedTags: string[];
    availableTags: Tag[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    history: {
        canUndo: boolean;
        canRedo: boolean;
        onUndo: () => void;
        onRedo: () => void;
    };
}

export const EditMemoEditor: React.FC<EditMemoEditorProps> = ({
    title, setTitle,
    body, setBody,
    date, setDate,
    selectedTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    history
}) => {
    return (
        <div className="edit-memo-form">
            <div className="editor-toolbar">
                <div className="editor-toolbar-group">
                    <Button
                        type="button"
                        onClick={history.onUndo}
                        disabled={!history.canUndo}
                        className="editor-icon-button"
                        variant="secondary"
                    >
                        ↩
                    </Button>
                    <Button
                        type="button"
                        onClick={history.onRedo}
                        disabled={!history.canRedo}
                        className="editor-icon-button"
                        variant="secondary"
                    >
                        ↪
                    </Button>
                </div>
                <div className="editor-status-text">
                    編集モード
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="title">タイトル</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="タイトルを入力"
                />
            </div>

            <div className="form-group date-picker-group">
                <DatePickerInput
                    label="日付"
                    value={date}
                    onChange={setDate}
                    placeholder="日付やキーワード (空欄でもOK)"
                />
            </div>

            <div className="form-group">
                <label>タグ</label>
                <TagInput
                    selectedTags={selectedTags}
                    availableTags={availableTags}
                    onAddTag={onAddTag}
                    onRemoveTag={onRemoveTag}
                />
            </div>

            <div className="form-group full-height-input">
                <label htmlFor="body">本文</label>
                <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="メモの内容を入力..."
                    className="body-textarea"
                />
            </div>
        </div>
    );
};
