import React, { useState, useEffect } from 'react';
import { TagExpression, TagExpressionTerm } from '../../../types/tagExpressions';
import { useTagSuggestions } from '../../../hooks/useTagSuggestions';
import { TagSuggestionInput } from '~/components/TagSuggestionInput';
import './ExpressionEditor.css';
import tagExpressionService from '../../../services/tagExpressionService';

export const ExpressionEditor: React.FC = () => {
  const [expressions, setExpressions] = useState<TagExpression[]>([]);
  const [editingExpr, setEditingExpr] = useState<TagExpression | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{ name?: string; color?: string; icon?: string; orTerms: TagExpressionTerm[] }>({ name: '', color: '', icon: '', orTerms: [] });
  const [termForm, setTermForm] = useState<any>({ include: [], exclude: [], includeNames: [], excludeNames: [], newIncludeTag: '', newExcludeTag: '', newTagNames: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getSuggestions, tagExists, getTagName } = useTagSuggestions();

  useEffect(() => {
    loadExpressions();
  }, []);

  const loadExpressions = async () => {
    try {
      setLoading(true);
      const exprs = await tagExpressionService.load();
      setExpressions(exprs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingExpr(null);
    setIsCreating(true);
    setFormData({ name: '', color: '', icon: '', orTerms: [] });
    setTermForm({ include: [], exclude: [], includeNames: [], excludeNames: [], newIncludeTag: '', newExcludeTag: '', newTagNames: {} });
    setError(null);
  };

  const handleEdit = (expr: TagExpression) => {
    if (expr.id.startsWith('mock-')) {
      setError('サンプルデータは編集できません');
      return;
    }
    setEditingExpr(expr);
    setIsCreating(false);
    setFormData({ name: expr.name || '', color: expr.color || '', icon: expr.icon || '', orTerms: [...expr.orTerms] });
    setTermForm({ include: [], exclude: [], includeNames: [], excludeNames: [], newIncludeTag: '', newExcludeTag: '', newTagNames: {} });
    setError(null);
  };

  const handleAddIncludeTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    if (termForm.include.includes(trimmed)) { setError('そのタグは既に追加されています'); return; }
    if (termForm.exclude.includes(trimmed)) { setError('そのタグは除外タグに含まれています'); return; }
    setTermForm((prev: any) => ({ ...prev, include: [...prev.include, trimmed], includeNames: [...prev.includeNames, tagName], newTagNames: { ...prev.newTagNames, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }, newIncludeTag: '' }));
    setError(null);
  };

  const handleAddExcludeTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    if (termForm.exclude.includes(trimmed)) { setError('そのタグは既に追加されています'); return; }
    if (termForm.include.includes(trimmed)) { setError('そのタグは含むタグに含まれています'); return; }
    setTermForm((prev: any) => ({ ...prev, exclude: [...prev.exclude, trimmed], excludeNames: [...prev.excludeNames, tagName], newTagNames: { ...prev.newTagNames, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }, newExcludeTag: '' }));
    setError(null);
  };

  const handleRemoveInclude = (index: number) => setTermForm((prev: any) => ({ ...prev, include: prev.include.filter((_: any, i: number) => i !== index), includeNames: prev.includeNames.filter((_: any, i: number) => i !== index) }));
  const handleRemoveExclude = (index: number) => setTermForm((prev: any) => ({ ...prev, exclude: prev.exclude.filter((_: any, i: number) => i !== index), excludeNames: prev.excludeNames.filter((_: any, i: number) => i !== index) }));

  const handleAddTerm = () => {
    if (termForm.include.length === 0 && termForm.exclude.length === 0) { setError('含むタグまたは除外するタグを最低1つ指定してください'); return; }
    const newTerm: TagExpressionTerm = { include: [...termForm.include], exclude: [...termForm.exclude] };
    setFormData((prev) => ({ ...prev, orTerms: [...prev.orTerms, newTerm] }));
    setTermForm({ include: [], exclude: [], includeNames: [], excludeNames: [], newIncludeTag: '', newExcludeTag: '', newTagNames: {} });
    setError(null);
  };

  const handleRemoveTerm = (index: number) => setFormData((prev) => ({ ...prev, orTerms: prev.orTerms.filter((_: any, i: number) => i !== index) }));

  const handleSave = async () => {
    if (formData.orTerms.length === 0) { setError('最低1つの検索条件を追加してください'); return; }
    try {
      setLoading(true);
      // create any new tags referenced in new-tag-* placeholders
      const processedOrTerms = await Promise.all(formData.orTerms.map(async (term: TagExpressionTerm) => {
        const processedInclude = await Promise.all(term.include.map(async (tagId) => {
          if (tagId.startsWith('new-tag-')) {
            const tagName = termForm.newTagNames[tagId] || tagId;
            const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tagName }) });
            if (!res.ok) throw new Error(`タグ「${tagName}」の作成に失敗しました`);
            const j = await res.json();
            return j.tag.id;
          }
          return tagId;
        }));
        const processedExclude = await Promise.all(term.exclude.map(async (tagId) => {
          if (tagId.startsWith('new-tag-')) {
            const tagName = termForm.newTagNames[tagId] || tagId;
            const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tagName }) });
            if (!res.ok) throw new Error(`タグ「${tagName}」の作成に失敗しました`);
            const j = await res.json();
            return j.tag.id;
          }
          return tagId;
        }));
        return { include: processedInclude, exclude: processedExclude };
      }));

      if (editingExpr) {
        await tagExpressionService.update(editingExpr.id, { orTerms: processedOrTerms, name: formData.name || undefined, color: formData.color || undefined, icon: formData.icon || undefined });
      } else {
        await tagExpressionService.create({ orTerms: processedOrTerms, name: formData.name || undefined, color: formData.color || undefined, icon: formData.icon || undefined });
      }

      await loadExpressions();
      setEditingExpr(null);
      setIsCreating(false);
      setFormData({ name: '', color: '', icon: '', orTerms: [] });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('mock-')) { setError('サンプルデータは削除できません'); return; }
    if (!confirm('この分類を削除しますか？')) return;
    try {
      setLoading(true);
      await tagExpressionService.delete(id);
      await loadExpressions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingExpr(null);
    setIsCreating(false);
    setFormData({ name: '', color: '', icon: '', orTerms: [] });
    setTermForm({ include: [], exclude: [], includeNames: [], excludeNames: [], newIncludeTag: '', newExcludeTag: '', newTagNames: {} });
    setError(null);
  };

  return (
    <div className="filter-editor">
      <div className="filter-editor-header">
        <div>
          <h3>分類管理</h3>
          <p className="header-description">タグを使ってメモを分類・フィルタリングできます</p>
        </div>
        <button className="create-filter-button" onClick={handleCreate} disabled={loading}>
          <span className="button-icon">➕</span>
          新しい分類
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {(editingExpr || isCreating) && (
        <div className="filter-form">
          <div className="form-header">
            <h4>{editingExpr ? '分類を編集' : '新しい分類を作成'}</h4>
            <div className="form-steps">
              <span className="step active">1. 基本情報</span>
              <span className="step-arrow">→</span>
              <span className="step">2. 条件設定</span>
              <span className="step-arrow">→</span>
              <span className="step">3. 確認・保存</span>
            </div>
          </div>

          <div className="form-section">
            <h5>📝 基本情報</h5>
            <div className="form-grid">
              <div className="form-group">
                <label>分類名 <span className="optional">(任意)</span></label>
                <input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={loading}
                  placeholder="例: 仕事関連、個人メモ"
                />
                <small>分類を識別するための名前です</small>
              </div>
              <div className="form-group">
                <label>色 <span className="optional">(任意)</span></label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={formData.color || '#007bff'}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    disabled={loading}
                  />
                  <span className="color-preview" style={{ backgroundColor: formData.color || '#007bff' }}></span>
                </div>
                <small>分類を視覚的に区別するための色</small>
              </div>
              <div className="form-group">
                <label>アイコン <span className="optional">(任意)</span></label>
                <input
                  value={formData.icon || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  disabled={loading}
                  placeholder="例: 📝 ✏️ 📌"
                  maxLength={2}
                />
                <small>絵文字などで分類を表すアイコン</small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h5>🔍 検索条件の設定</h5>
            <div className="condition-builder">
              <div className="condition-help">
                <p><strong>条件の作り方:</strong></p>
                <ul>
                  <li><strong>含むタグ:</strong> これらのタグのいずれかを含むメモ</li>
                  <li><strong>除外タグ:</strong> これらのタグを含まないメモ</li>
                  <li><strong>OR条件:</strong> 複数の条件グループを作成可能</li>
                </ul>
              </div>

              <div className="tag-condition-form">
                <div className="condition-group">
                  <h6>✅ 含むタグ (この中のどれかを含む)</h6>
                  <div className="tag-input-area">
                    <TagSuggestionInput
                      value={termForm.newIncludeTag}
                      onChange={(v) => setTermForm((p: any)=> ({ ...p, newIncludeTag: v }))}
                      onSelect={handleAddIncludeTag}
                      suggestions={getSuggestions(termForm.newIncludeTag)}
                      placeholder="タグ名を入力して追加..."
                      disabled={loading}
                    />
                    <div className="tag-preview">
                      {termForm.include.map((tagId: string, index: number) => (
                        <div key={index} className="tag-chip include-chip">
                          <span className="tag-icon">🏷️</span>
                          <span className="tag-name">{termForm.includeNames[index]}</span>
                          <span className="tag-status">{tagExists(tagId) ? '既存' : '新規'}</span>
                          <button type="button" onClick={() => handleRemoveInclude(index)} disabled={loading} className="remove-tag">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="condition-group">
                  <h6>❌ 除外タグ (これらを含まない)</h6>
                  <div className="tag-input-area">
                    <TagSuggestionInput
                      value={termForm.newExcludeTag}
                      onChange={(v) => setTermForm((p: any)=> ({ ...p, newExcludeTag: v }))}
                      onSelect={handleAddExcludeTag}
                      suggestions={getSuggestions(termForm.newExcludeTag)}
                      placeholder="タグ名を入力して追加..."
                      disabled={loading}
                    />
                    <div className="tag-preview">
                      {termForm.exclude.map((tagId: string, index: number) => (
                        <div key={index} className="tag-chip exclude-chip">
                          <span className="tag-icon">🚫</span>
                          <span className="tag-name">{termForm.excludeNames[index]}</span>
                          <span className="tag-status">{tagExists(tagId) ? '既存' : '新規'}</span>
                          <button type="button" onClick={() => handleRemoveExclude(index)} disabled={loading} className="remove-tag">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="add-condition-actions">
                  <button
                    type="button"
                    className="add-condition-button"
                    onClick={handleAddTerm}
                    disabled={loading || (termForm.include.length === 0 && termForm.exclude.length === 0)}
                  >
                    <span className="button-icon">➕</span>
                    この条件グループを追加
                  </button>
                  {(termForm.include.length > 0 || termForm.exclude.length > 0) && (
                    <small className="condition-preview">
                      プレビュー: {termForm.include.length > 0 && `タグ「${termForm.includeNames.slice(0, 2).join('」または「')}」${termForm.include.length > 2 ? 'など' : ''}を含む`}
                      {termForm.include.length > 0 && termForm.exclude.length > 0 && '、'}
                      {termForm.exclude.length > 0 && `タグ「${termForm.excludeNames.slice(0, 2).join('」と「')}」${termForm.exclude.length > 2 ? 'など' : ''}を含まない`}
                      メモ
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h5>📋 現在の条件一覧</h5>
            {formData.orTerms.length === 0 ? (
              <div className="empty-conditions">
                <div className="empty-icon">📭</div>
                <p>まだ条件が設定されていません</p>
                <small>上の「条件グループを追加」から条件を追加してください</small>
              </div>
            ) : (
              <div className="conditions-list">
                {formData.orTerms.map((term, index) => (
                  <div key={index} className="condition-card">
                    <div className="condition-header">
                      <span className="condition-number">条件 {index + 1}</span>
                      <button type="button" className="remove-condition" onClick={() => handleRemoveTerm(index)} disabled={loading}>
                        <span className="button-icon">🗑️</span>
                        削除
                      </button>
                    </div>
                    <div className="condition-content">
                      {term.include.length > 0 && (
                        <div className="condition-tags include-tags">
                          <span className="condition-label">✅ 含む:</span>
                          <div className="tag-chips">
                            {term.include.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip small include">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {term.exclude.length > 0 && (
                        <div className="condition-tags exclude-tags">
                          <span className="condition-label">❌ 除外:</span>
                          <div className="tag-chips">
                            {term.exclude.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip small exclude">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="conditions-summary">
                  <div className="summary-icon">🔗</div>
                  <div className="summary-text">
                    <strong>{formData.orTerms.length}個の条件グループ</strong>がOR条件で結合されます
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="save-button primary" onClick={handleSave} disabled={loading || formData.orTerms.length === 0}>
              <span className="button-icon">💾</span>
              {loading ? '保存中...' : '分類を保存'}
            </button>
            <button className="cancel-button secondary" onClick={handleCancel} disabled={loading}>
              <span className="button-icon">↩️</span>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="filter-list">
        <h4>📂 作成済みの分類</h4>
        {expressions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>まだ分類が作成されていません</p>
            <small>「新しい分類」ボタンから作成を開始してください</small>
          </div>
        ) : (
          <div className="filter-items">
            {expressions.map((expr) => (
              <div key={expr.id} className="filter-item">
                <div className="filter-info">
                  <div className="filter-header">
                    <div className="filter-name">
                      {expr.icon && <span className="filter-icon">{expr.icon}</span>}
                      <h5>{expr.name || `分類 #${expr.id.slice(-4)}`}</h5>
                      {expr.color && <div className="color-indicator" style={{ backgroundColor: expr.color }}></div>}
                    </div>
                    {expr.id.startsWith('mock-') && <span className="mock-badge">サンプル</span>}
                  </div>
                  <div className="filter-conditions">
                    {expr.orTerms.map((term, i) => (
                      <div key={i} className="condition-summary">
                        <div className="condition-number">条件 {i + 1}:</div>
                        {term.include.length > 0 && (
                          <div className="condition-tags">
                            <span className="label">含む:</span>
                            {term.include.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip tiny include">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        )}
                        {term.exclude.length > 0 && (
                          <div className="condition-tags">
                            <span className="label">除外:</span>
                            {term.exclude.map((tagId, tagIndex) => (
                              <span key={tagIndex} className="tag-chip tiny exclude">{getTagName(tagId)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="filter-actions">
                  <button className="edit-button" onClick={() => handleEdit(expr)} disabled={loading || expr.id.startsWith('mock-')} title={expr.id.startsWith('mock-') ? 'サンプルデータは編集できません' : '編集'}>
                    <span className="button-icon">✏️</span>
                    編集
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(expr.id)} disabled={loading || expr.id.startsWith('mock-')} title={expr.id.startsWith('mock-') ? 'サンプルデータは削除できません' : '削除'}>
                    <span className="button-icon">🗑️</span>
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

export default ExpressionEditor;
