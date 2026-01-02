import React, { useState, useEffect } from 'react';
import './TagEditor.css';
import { Textarea } from '~/components';
import { Tag } from '../../../types/tags';

interface TagEditorProps {
  onClose: () => void;
}

const TagEditor: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // タグ一覧を取得
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const tagsData = await response.json();
        setTags(tagsData);
      } else {
        setError('タグの取得に失敗しました');
      }
    } catch (error) {
      console.error('タグ取得エラー:', error);
      setError('タグの取得に失敗しました');
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('タグ名は必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEdit = editingTag !== null;
      const url = '/api/tags';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { id: editingTag.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadTags(); // リストを更新
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || (isEdit ? 'タグの更新に失敗しました' : 'タグの作成に失敗しました'));
      }
    } catch (error) {
      console.error('タグ保存エラー:', error);
      setError('タグの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    // モックデータ（mock-で始まるID）の場合は削除できない旨を表示
    if (tag.id.startsWith('mock-')) {
      setError('モックデータは削除できません');
      return;
    }

    if (!confirm(`タグ「${tag.name}」を削除しますか？`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: tag.id }),
      });

      if (response.ok) {
        await loadTags(); // リストを更新
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'タグの削除に失敗しました');
      }
    } catch (error) {
      console.error('タグ削除エラー:', error);
      setError('タグの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tag: Tag) => {
    // モックデータ（mock-で始まるID）の場合は編集できない旨を表示
    if (tag.id.startsWith('mock-')) {
      setError('モックデータは編集できません');
      return;
    }

    setEditingTag(tag);
    setFormData({ name: tag.name, description: tag.description || '' });
    setIsCreating(false);
    setError(null);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingTag(null);
    setFormData({ name: '', description: '' });
  };

  const resetForm = () => {
    setEditingTag(null);
    setIsCreating(false);
    setFormData({ name: '', description: '' });
    setError(null);
  };

  return (
    <div className="tag-editor">
      <div className="tag-editor-header">
        <h3>タグ管理</h3>
        <button className="create-tag-button" onClick={startCreate}>
          新規タグ作成
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {(isCreating || editingTag) && (
        <div className="tag-form">
          <h4>{editingTag ? 'タグ編集' : '新規タグ作成'}</h4>
          <div className="form-group">
            <label htmlFor="tagName">タグ名 *</label>
            <input
              id="tagName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="タグ名を入力..."
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tagDescription">説明</label>
            <Textarea
              id="tagDescription"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="タグの説明を入力..."
              rows={3}
              disabled={loading}
              autoResize={false}
              showLines={false}
            />
          </div>
          <div className="form-buttons">
            <button 
              className="save-button" 
              onClick={handleSave} 
              disabled={loading || !formData.name.trim()}
            >
              {loading ? '保存中...' : (editingTag ? '更新' : '作成')}
            </button>
            <button className="cancel-button" onClick={resetForm} disabled={loading}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="tag-list">
        <h4>既存のタグ ({tags.length}個)</h4>
        {tags.length === 0 ? (
          <p className="empty-state">タグがありません</p>
        ) : (
          <div className="tag-items">
            {tags.map((tag) => (
              <div key={tag.id} className="tag-item">
                <div className="tag-info">
                  <h5>
                    {tag.name}
                    {tag.id.startsWith('mock-') && (
                      <span className="mock-badge">（サンプル）</span>
                    )}
                  </h5>
                  {tag.description && <p>{tag.description}</p>}
                </div>
                <div className="tag-actions">
                  <button 
                    className="edit-button" 
                    onClick={() => startEdit(tag)}
                    disabled={loading || tag.id.startsWith('mock-')}
                    title={tag.id.startsWith('mock-') ? 'サンプルデータは編集できません' : '編集'}
                  >
                    編集
                  </button>
                  <button 
                    className="delete-button" 
                    onClick={() => handleDelete(tag)}
                    disabled={loading || tag.id.startsWith('mock-')}
                    title={tag.id.startsWith('mock-') ? 'サンプルデータは削除できません' : '削除'}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { TagEditor };
export default TagEditor;
