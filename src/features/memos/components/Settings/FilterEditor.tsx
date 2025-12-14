import React, { useState, useEffect } from 'react';
import { FilterBase, FilterTerm } from '../../types/filterTypes';
import { useTagSuggestions } from '../../hooks/useTagSuggestions';
import { TagSuggestionInput } from '~/components/TagSuggestionInput';
import './FilterEditor.css';
import tagExpressionService from '../../services/tagExpressionService';

const FilterEditor: React.FC = () => {
  const [filters, setFilters] = useState<FilterBase[]>([]);
  const [editingFilter, setEditingFilter] = useState<FilterBase | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    orTerms: FilterTerm[];
  }>({
    orTerms: []
  });
  const [termForm, setTermForm] = useState<{
    include: string[];
    exclude: string[];
    includeNames: string[];
    excludeNames: string[];
    newIncludeTag: string;
    newExcludeTag: string;
    newTagNames: { [tagId: string]: string }; // 新規タグのID->名前マッピング
  }>({
    include: [],
    exclude: [],
    includeNames: [],
    excludeNames: [],
    newIncludeTag: '',
    newExcludeTag: '',
    newTagNames: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // タグサジェスト機能
  const { getSuggestions, tagExists, getTagName } = useTagSuggestions();

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const { filters: f, categories: c } = await tagExpressionService.load();
      // 旧来の挙動を保つため、全ての TagExpression をまとめてセット
      setFilters([...f, ...c] as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFilter = () => {
    setEditingFilter(null);
    setIsCreating(true);
    setFormData({ orTerms: [] });
    setTermForm({ 
      include: [], 
      exclude: [], 
      includeNames: [], 
      excludeNames: [], 
      newIncludeTag: '', 
      newExcludeTag: '',
      newTagNames: {}
    });
    setError(null);
  };

  const handleEditFilter = (filter: FilterBase) => {
    // モックデータ（mock-で始まるID）の場合は編集できない旨を表示
    if (filter.id.startsWith('mock-')) {
      setError('モックデータは編集できません');
      return;
    }

    setEditingFilter(filter);
    setIsCreating(false);
    setFormData({ orTerms: [...filter.orTerms] });
    setTermForm({ 
      include: [], 
      exclude: [], 
      includeNames: [], 
      excludeNames: [], 
      newIncludeTag: '', 
      newExcludeTag: '',
      newTagNames: {}
    });
    setError(null);
  };

  const handleAddIncludeTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    
    const trimmedTagId = tagId.trim();
    
    // 既に追加されているかチェック
    if (termForm.include.includes(trimmedTagId)) {
      setError('そのタグは既に追加されています');
      return;
    }
    
    // 除外タグに含まれているかチェック
    if (termForm.exclude.includes(trimmedTagId)) {
      setError('そのタグは除外タグに含まれています');
      return;
    }
    
    setTermForm(prev => ({
      ...prev,
      include: [...prev.include, trimmedTagId],
      includeNames: [...prev.includeNames, tagName],
      newTagNames: {
        ...prev.newTagNames,
        ...(trimmedTagId.startsWith('new-tag-') ? { [trimmedTagId]: tagName } : {})
      },
      newIncludeTag: ''
    }));
    setError(null);
  };

  const handleAddExcludeTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    
    const trimmedTagId = tagId.trim();
    
    // 既に追加されているかチェック
    if (termForm.exclude.includes(trimmedTagId)) {
      setError('そのタグは既に追加されています');
      return;
    }
    
    // 含むタグに含まれているかチェック
    if (termForm.include.includes(trimmedTagId)) {
      setError('そのタグは含むタグに含まれています');
      return;
    }
    
    setTermForm(prev => ({
      ...prev,
      exclude: [...prev.exclude, trimmedTagId],
      excludeNames: [...prev.excludeNames, tagName],
      newTagNames: {
        ...prev.newTagNames,
        ...(trimmedTagId.startsWith('new-tag-') ? { [trimmedTagId]: tagName } : {})
      },
      newExcludeTag: ''
    }));
    setError(null);
  };

  const handleRemoveIncludeTag = (index: number) => {
    setTermForm(prev => ({
      ...prev,
      include: prev.include.filter((_, i) => i !== index),
      includeNames: prev.includeNames.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveExcludeTag = (index: number) => {
    setTermForm(prev => ({
      ...prev,
      exclude: prev.exclude.filter((_, i) => i !== index),
      excludeNames: prev.excludeNames.filter((_, i) => i !== index)
    }));
  };

  const handleAddTerm = () => {
    if (termForm.include.length === 0 && termForm.exclude.length === 0) {
      setError('含むタグまたは除外するタグを最低1つ指定してください');
      return;
    }

    const newTerm: FilterTerm = {
      include: [...termForm.include],
      exclude: [...termForm.exclude]
    };

    setFormData(prev => ({
      orTerms: [...prev.orTerms, newTerm]
    }));

    setTermForm({ 
      include: [], 
      exclude: [], 
      includeNames: [], 
      excludeNames: [], 
      newIncludeTag: '', 
      newExcludeTag: '',
      newTagNames: {}
    });
    setError(null);
  };

  const handleRemoveTerm = (index: number) => {
    setFormData(prev => ({
      orTerms: prev.orTerms.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (formData.orTerms.length === 0) {
      setError('最低1つの検索条件を追加してください');
      return;
    }

    try {
      setLoading(true);
      
      // 新規タグを先に作成
      const processedOrTerms = await Promise.all(
        formData.orTerms.map(async (term) => {
          const processedInclude = await Promise.all(
            term.include.map(async (tagId) => {
              if (tagId.startsWith('new-tag-')) {
                // 新規タグを作成
                const tagName = termForm.newTagNames[tagId] || tagId; // フォールバック
                const response = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: tagName })
                });
                
                if (!response.ok) {
                  throw new Error(`タグ「${tagName}」の作成に失敗しました`);
                }
                
                const result = await response.json();
                return result.tag.id; // 新しく作成されたタグのIDを返す
              }
              return tagId; // 既存タグの場合はそのまま
            })
          );
          
          const processedExclude = await Promise.all(
            term.exclude.map(async (tagId) => {
              if (tagId.startsWith('new-tag-')) {
                // 新規タグを作成
                const tagName = termForm.newTagNames[tagId] || tagId; // フォールバック
                const response = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: tagName })
                });
                
                if (!response.ok) {
                  throw new Error(`タグ「${tagName}」の作成に失敗しました`);
                }
                
                const result = await response.json();
                return result.tag.id; // 新しく作成されたタグのIDを返す
              }
              return tagId; // 既存タグの場合はそのまま
            })
          );
          
          return {
            include: processedInclude,
            exclude: processedExclude
          };
        })
      );

      if (editingFilter) {
        await tagExpressionService.update(editingFilter.id, { orTerms: processedOrTerms });
      } else {
        await tagExpressionService.create({ orTerms: processedOrTerms });
      }

      await loadFilters();
      setEditingFilter(null);
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filterId: string) => {
    if (!confirm('このフィルターを削除しますか？')) return;

    // モックデータ（mock-で始まるID）の場合は削除できない旨を表示
    if (filterId.startsWith('mock-')) {
      setError('モックデータは削除できません');
      return;
    }

    try {
      setLoading(true);
      await tagExpressionService.delete(filterId as string);

      await loadFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingFilter(null);
    setIsCreating(false);
    setFormData({ orTerms: [] });
    setTermForm({ 
      include: [], 
      exclude: [], 
      includeNames: [], 
      excludeNames: [], 
      newIncludeTag: '', 
      newExcludeTag: '',
      newTagNames: {}
    });
    setError(null);
  };

  if (loading && !editingFilter && !isCreating) {
    return <div className="filter-editor loading">読み込み中...</div>;
  }

  return (
    <div className="filter-editor">
      <div className="filter-editor-header">
        <h3>フィルター管理</h3>
        <button
          className="create-filter-button"
          onClick={handleCreateFilter}
          disabled={loading}
        >
          新しいフィルター
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {(editingFilter || isCreating) && (
        <div className="filter-form">
          <h4>{editingFilter ? 'フィルター編集' : '新しいフィルター'}</h4>
          
          <div className="term-form">
            <h5>検索条件を作成</h5>
            
            <div className="tag-section">
              <h6>含むタグ (AND条件)</h6>
              <div className="tag-input-group">
                <TagSuggestionInput
                  value={termForm.newIncludeTag}
                  onChange={(value) => setTermForm(prev => ({ ...prev, newIncludeTag: value }))}
                  onSelect={handleAddIncludeTag}
                  suggestions={getSuggestions(termForm.newIncludeTag)}
                  placeholder="タグ名を入力（既存タグから選択または新規作成）"
                  disabled={loading}
                />
              </div>
              {termForm.include.length > 0 && (
                <div className="tag-list">
                  {termForm.include.map((tagId, index) => (
                    <div key={index} className="tag-chip">
                      <span>{termForm.includeNames[index]}</span>
                      <span className="tag-status">
                        {tagExists(tagId) ? '✓' : '新規'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncludeTag(index)}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="tag-section">
              <h6>除外するタグ (AND条件)</h6>
              <div className="tag-input-group">
                <TagSuggestionInput
                  value={termForm.newExcludeTag}
                  onChange={(value) => setTermForm(prev => ({ ...prev, newExcludeTag: value }))}
                  onSelect={handleAddExcludeTag}
                  suggestions={getSuggestions(termForm.newExcludeTag)}
                  placeholder="タグ名を入力（既存タグから選択または新規作成）"
                  disabled={loading}
                />
              </div>
              {termForm.exclude.length > 0 && (
                <div className="tag-list">
                  {termForm.exclude.map((tagId, index) => (
                    <div key={index} className="tag-chip exclude">
                      <span>{termForm.excludeNames[index]}</span>
                      <span className="tag-status">
                        {tagExists(tagId) ? '✓' : '新規'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludeTag(index)}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="add-term-button"
              onClick={handleAddTerm}
              disabled={loading || (termForm.include.length === 0 && termForm.exclude.length === 0)}
            >
              この条件を追加
            </button>
          </div>

          <div className="current-terms">
            <h5>現在の検索条件 (OR条件)</h5>
            {formData.orTerms.length === 0 ? (
              <p className="no-terms">検索条件がありません</p>
            ) : (
              <div className="terms-list">
                {formData.orTerms.map((term, index) => (
                  <div key={index} className="term-item">
                    <div className="term-display">
                      {term.include.length > 0 && (
                        <div className="term-tags">
                          <span className="term-label">含む:</span>
                          {term.include.map((tagId, tagIndex) => (
                            <span key={tagIndex} className="tag-chip small">{getTagName(tagId)}</span>
                          ))}
                        </div>
                      )}
                      {term.exclude.length > 0 && (
                        <div className="term-tags">
                          <span className="term-label">除外:</span>
                          {term.exclude.map((tagId, tagIndex) => (
                            <span key={tagIndex} className="tag-chip small exclude">{getTagName(tagId)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="remove-term-button"
                      onClick={() => handleRemoveTerm(index)}
                      disabled={loading}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button
              className="save-button"
              onClick={handleSave}
              disabled={loading || formData.orTerms.length === 0}
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

      <div className="filter-list">
        <h4>フィルター一覧</h4>
        {filters.length === 0 ? (
          <div className="empty-state">
            フィルターがありません
          </div>
        ) : (
          <div className="filter-items">
            {filters.map((filter) => (
              <div key={filter.id} className="filter-item">
                <div className="filter-info">
                  <h5>
                    フィルター #{filter.id}
                    {filter.id.startsWith('mock-') && (
                      <span className="mock-badge">（サンプル）</span>
                    )}
                  </h5>
                  <div className="filter-terms">
                    {filter.orTerms.map((term, index) => (
                      <div key={index} className="term-summary">
                        {term.include.length > 0 && (
                          <div>
                            <span className="term-label">含む:</span>
                            {term.include.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip small">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        )}
                        {term.exclude.length > 0 && (
                          <div>
                            <span className="term-label">除外:</span>
                            {term.exclude.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip small exclude">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="filter-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEditFilter(filter)}
                    disabled={loading || filter.id.startsWith('mock-')}
                    title={filter.id.startsWith('mock-') ? 'サンプルデータは編集できません' : '編集'}
                  >
                    編集
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(filter.id)}
                    disabled={loading || filter.id.startsWith('mock-')}
                    title={filter.id.startsWith('mock-') ? 'サンプルデータは削除できません' : '削除'}
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

export { FilterEditor };
export default FilterEditor;
