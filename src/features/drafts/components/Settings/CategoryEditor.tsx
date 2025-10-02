import React, { useState, useEffect } from 'react';
import { Category } from '../../types/categories';
import { useTagSuggestions } from '../../hooks/useTagSuggestions';
import { TagSuggestionInput } from '../TagSuggestionInput';
import './CategoryEditor.css';

const CategoryEditor: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    color: string;
    icon: string;
  }>({
    name: '',
    color: '',
    icon: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // タグサジェスト機能
  const { getSuggestions, tagExists } = useTagSuggestions();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tagExpressions');
      if (!response.ok) {
        throw new Error('カテゴリーの読み込みに失敗しました');
      }
      const data = await response.json();
      // 名前があるものだけをカテゴリとして扱う
      const categoriesData = data.filter((d: any) => !!d.name) as Category[];
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsCreating(true);
    setFormData({ name: '', color: '', icon: '' });
    setError(null);
  };

  const handleEditCategory = (category: Category) => {
    // モックデータ（mock-で始まるID）の場合は編集できない旨を表示
    if (category.id.startsWith('mock-')) {
      setError('モックデータは編集できません');
      return;
    }

    setEditingCategory(category);
    setIsCreating(false);
    setFormData({ 
      name: category.name, 
      color: category.color || '',
      icon: category.icon || ''
    });
    setError(null);
  };

  const handleInputChange = (field: 'name' | 'color' | 'icon', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('カテゴリー名を入力してください');
      return;
    }

    try {
      setLoading(true);
  const url = editingCategory ? `/api/tagExpressions/${editingCategory.id}` : '/api/tagExpressions';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color.trim() || undefined,
          icon: formData.icon.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      await loadCategories();
      setEditingCategory(null);
      setIsCreating(false);
      setFormData({ name: '', color: '', icon: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    // モックデータ（mock-で始まるID）の場合は削除できない旨を表示
    if (categoryId.startsWith('mock-')) {
      setError('モックデータは削除できません');
      return;
    }

    if (!confirm('このカテゴリーを削除しますか？')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/tagExpressions/${categoryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setIsCreating(false);
    setFormData({ name: '', color: '', icon: '' });
    setError(null);
  };

  if (loading && !editingCategory && !isCreating) {
    return <div className="category-editor loading">読み込み中...</div>;
  }

  return (
    <div className="category-editor">
      <div className="category-editor-header">
        <h3>カテゴリー管理</h3>
        <button
          className="create-category-button"
          onClick={handleCreateCategory}
          disabled={loading}
        >
          新しいカテゴリー
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {(editingCategory || isCreating) && (
        <div className="category-form">
          <h4>{editingCategory ? 'カテゴリー編集' : '新しいカテゴリー'}</h4>
          
          <div className="form-group">
            <label htmlFor="category-name">カテゴリー名 *</label>
            <input
              id="category-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={loading}
              placeholder="カテゴリー名を入力"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category-color">色 (省略可)</label>
            <input
              id="category-color"
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category-icon">アイコン (省略可)</label>
            <input
              id="category-icon"
              type="text"
              value={formData.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              disabled={loading}
              placeholder="アイコン文字を入力（例: 📝, 🔖, ⭐）"
              maxLength={2}
            />
          </div>

          <div className="form-buttons">
            <button
              className="save-button"
              onClick={handleSave}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              className="cancel-button"
              onClick={handleCancel}
              disabled={loading}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="category-list">
        <h4>カテゴリー一覧</h4>
        {categories.length === 0 ? (
          <div className="empty-state">
            カテゴリーがありません
          </div>
        ) : (
          <div className="category-items">
            {categories.map((category) => (
              <div key={category.id} className="category-item">
                <div className="category-info">
                  <div className="category-header">
                    {category.icon && <span className="category-icon">{category.icon}</span>}
                    <h5>
                      {category.name}
                      {category.id.startsWith('mock-') && (
                        <span className="mock-badge">（サンプル）</span>
                      )}
                    </h5>
                    {category.color && (
                      <div 
                        className="category-color"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                  </div>
                </div>
                <div className="category-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEditCategory(category)}
                    disabled={loading || category.id.startsWith('mock-')}
                    title={category.id.startsWith('mock-') ? 'サンプルデータは編集できません' : '編集'}
                  >
                    編集
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(category.id)}
                    disabled={loading || category.id.startsWith('mock-')}
                    title={category.id.startsWith('mock-') ? 'サンプルデータは削除できません' : '削除'}
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

export { CategoryEditor };
export default CategoryEditor;
