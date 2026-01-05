import React from 'react';
import './EditMemoEditor.css';
import { Button } from '~/components';
import { TagInput } from './TagInput';
import { Tag } from '../hooks/useMemoForm';

interface EditMemoEditorProps {
    title: string;
    setTitle: (val: string) => void;
    body: string;
    setBody: (val: string) => void;
    date: string;
    setDate: (val: string) => void;
    selectedTags: string[];
    availableTags: Tag[];
    onAddTag: (val: string) => void;
    onRemoveTag: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onDelete: () => void;
}

export const EditMemoEditor: React.FC<EditMemoEditorProps> = ({
    title, setTitle,
    body, setBody,
    date, setDate,
    selectedTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onSubmit,
    onDelete
}) => {
    return (
        <form className="edit-memo-form" onSubmit={onSubmit}>
            <div className="form-group">
                <label htmlFor="title">タイトル</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="タイトル"
                    aria-label="タイトル"
                />
            </div>

            <div className="form-group">
                <label htmlFor="date">日付</label>
                <input
                    id="date"
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="日付やキーワード（空欄でもOK）"
                    aria-label="日付"
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

            <div className="form-group">
                <label htmlFor="body">内容</label>
                <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={15}
                    placeholder="内容"
                    aria-label="内容"
                />
            </div>

            <div className="form-actions">
                <Button type="submit" variant="primary">💾 保存</Button>
                <Button type="button" variant="secondary" onClick={onDelete}>🗑️ 削除</Button>
            </div>
        </form>
    );
};
