import React, { useState, useEffect } from 'react';
import { TagExpression, TagExpressionTerm } from '../../../types/tagExpressions';
import { useTagSuggestions } from '../../../hooks/useTagSuggestions';
import { TagSuggestionInput } from '~/components/TagSuggestionInput';
import './ExpressionEditor.css';
import tagExpressionService from '../../../services/tagExpressionService';
import { generateExpressionName } from '../../../utils/tagExpressionUtils';
import { formatLogicalText } from '../../../utils/logicalTextFormatter';

// 直積計算関数
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>((acc, arr) => {
    const res: T[][] = [];
    for (const a of acc) {
      for (const v of arr) res.push([...a, v]);
    }
    return res;
  }, [[]]);
}

// must/mustNot を orTerms に変換
function mustMustNotToOrTerms(must: string[][], mustNot: string[], maxTerms = 200): TagExpressionTerm[] {
  const effective = must.filter(bucket => bucket && bucket.length > 0);
  if (effective.length === 0) {
    return [{ include: [], exclude: mustNot }];
  }
  const combos = cartesianProduct(effective);
  if (combos.length > maxTerms) {
    throw new Error(`条件の組み合わせが多すぎます（${combos.length} > ${maxTerms}）。グループ/タグ数を減らしてください。`);
  }
  return combos.map(combo => ({ include: combo, exclude: [...mustNot] }));
}

// 新規タグ作成と置換
async function resolveNewTagPlaceholders(
  terms: TagExpressionTerm[],
  newTagNames: Record<string, string>
): Promise<TagExpressionTerm[]> {
  const placeholderIds = new Set<string>();
  for (const t of terms) {
    for (const id of [...t.include, ...t.exclude]) {
      if (typeof id === 'string' && id.startsWith('new-tag-')) placeholderIds.add(id);
    }
  }
  const mapping: Record<string, string> = {};
  for (const ph of placeholderIds) {
    const name = newTagNames[ph] || ph;
    const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) throw new Error(`タグ「${name}」の作成に失敗しました`);
    const j = await res.json();
    mapping[ph] = j.tag.id;
  }
  return terms.map(t => ({
    include: t.include.map(id => mapping[id] || id),
    exclude: t.exclude.map(id => mapping[id] || id),
  }));
}

export const ExpressionEditor: React.FC = () => {
  const [expressions, setExpressions] = useState<TagExpression[]>([]);
  const [editingExpr, setEditingExpr] = useState<TagExpression | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    name?: string;
    color?: string;
    icon?: string;
    must: Array<{
      main: string;
      mainName: string;
      alternatives: string[];
      alternativeNames: string[];
    }>;
    newMustTag: string;
    mustNot: Array<{
      main: string;
      mainName: string;
      alternatives: string[];
      alternativeNames: string[];
    }>;
    newMustNotTag: string;
  }>({
    name: '',
    color: '',
    icon: '',
    must: [],
    newMustTag: '',
    mustNot: [],
    newMustNotTag: ''
  });
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [newTagNames, setNewTagNames] = useState<Record<string, string>>({});
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
    setFormData({
      name: '',
      color: '',
      icon: '',
      must: [],
      newMustTag: '',
      mustNot: [],
      newMustNotTag: ''
    });
    setNewTagInputs({});
    setNewTagNames({});
    setError(null);
  };

  const handleEdit = (expr: TagExpression) => {
    if (expr.id.startsWith('mock-')) {
      setError('サンプルデータは編集できません');
      return;
    }
    setEditingExpr(expr);
    setIsCreating(false);
    // orTermsからmust/mustNotを逆変換（簡易版：最初のtermのincludeをmust、excludeをmustNotとする）
    const must: Array<{
      main: string;
      mainName: string;
      alternatives: string[];
      alternativeNames: string[];
    }> = [];
    const mustNot: Array<{
      main: string;
      mainName: string;
      alternatives: string[];
      alternativeNames: string[];
    }> = [];

    if (expr.orTerms.length > 0) {
      const firstTerm = expr.orTerms[0];
      // includeタグをmustに変換（最初のタグをメイン、それ以外を代替として扱う）
      if (firstTerm.include.length > 0) {
        must.push({
          main: firstTerm.include[0],
          mainName: getTagName(firstTerm.include[0]),
          alternatives: firstTerm.include.slice(1),
          alternativeNames: firstTerm.include.slice(1).map(id => getTagName(id))
        });
      }
      // excludeタグをmustNotに変換
      if (firstTerm.exclude.length > 0) {
        mustNot.push({
          main: firstTerm.exclude[0],
          mainName: getTagName(firstTerm.exclude[0]),
          alternatives: firstTerm.exclude.slice(1),
          alternativeNames: firstTerm.exclude.slice(1).map(id => getTagName(id))
        });
      }
    }

    setFormData({
      name: expr.name || '',
      color: expr.color || '',
      icon: expr.icon || '',
      must,
      newMustTag: '',
      mustNot,
      newMustNotTag: ''
    });
    setNewTagInputs({});
    setNewTagNames({});
    setError(null);
  };

  const handleAddMustTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    // 既に存在するかチェック
    if (formData.must.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは既に追加されています');
      return;
    }
    if (formData.mustNot.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは除外タグに含まれています');
      return;
    }
    setFormData(prev => ({
      ...prev,
      must: [...prev.must, {
        main: trimmed,
        mainName: tagName,
        alternatives: [],
        alternativeNames: []
      }],
      newMustTag: ''
    }));
    setNewTagNames(prev => ({ ...prev, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }));
    setError(null);
  };

  const handleRemoveMust = (index: number) => {
    setFormData(prev => ({
      ...prev,
      must: prev.must.filter((_, i) => i !== index)
    }));
  };

  const handleAddMustAlternative = (mustIndex: number, tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    // 既に存在するかチェック
    if (formData.must.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは既に追加されています');
      return;
    }
    if (formData.mustNot.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは除外タグに含まれています');
      return;
    }
    setFormData(prev => {
      const newMust = [...prev.must];
      newMust[mustIndex] = {
        ...newMust[mustIndex],
        alternatives: [...newMust[mustIndex].alternatives, trimmed],
        alternativeNames: [...newMust[mustIndex].alternativeNames, tagName]
      };
      return { ...prev, must: newMust };
    });
    setNewTagNames(prev => ({ ...prev, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }));
    setError(null);
  };

  const handleRemoveMustAlternative = (mustIndex: number, altIndex: number) => {
    setFormData(prev => {
      const newMust = [...prev.must];
      newMust[mustIndex] = {
        ...newMust[mustIndex],
        alternatives: newMust[mustIndex].alternatives.filter((_, i) => i !== altIndex),
        alternativeNames: newMust[mustIndex].alternativeNames.filter((_, i) => i !== altIndex)
      };
      return { ...prev, must: newMust };
    });
  };

  const handleAddMustNotTag = (tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    if (formData.mustNot.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは既に追加されています');
      return;
    }
    if (formData.must.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは必須タグに含まれています');
      return;
    }
    setFormData(prev => ({
      ...prev,
      mustNot: [...prev.mustNot, {
        main: trimmed,
        mainName: tagName,
        alternatives: [],
        alternativeNames: []
      }],
      newMustNotTag: ''
    }));
    setNewTagNames(prev => ({ ...prev, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }));
    setError(null);
  };

  const handleRemoveMustNot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mustNot: prev.mustNot.filter((_, i) => i !== index)
    }));
  };

  const handleAddMustNotAlternative = (mustNotIndex: number, tagId: string, tagName: string) => {
    if (!tagId.trim()) return;
    const trimmed = tagId.trim();
    // 既に存在するかチェック
    if (formData.mustNot.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは既に追加されています');
      return;
    }
    if (formData.must.some(item => item.main === trimmed || item.alternatives.includes(trimmed))) {
      setError('そのタグは必須タグに含まれています');
      return;
    }
    setFormData(prev => {
      const newMustNot = [...prev.mustNot];
      newMustNot[mustNotIndex] = {
        ...newMustNot[mustNotIndex],
        alternatives: [...newMustNot[mustNotIndex].alternatives, trimmed],
        alternativeNames: [...newMustNot[mustNotIndex].alternativeNames, tagName]
      };
      return { ...prev, mustNot: newMustNot };
    });
    setNewTagNames(prev => ({ ...prev, ...(trimmed.startsWith('new-tag-') ? { [trimmed]: tagName } : {}) }));
    setError(null);
  };

  const handleRemoveMustNotAlternative = (mustNotIndex: number, altIndex: number) => {
    setFormData(prev => {
      const newMustNot = [...prev.mustNot];
      newMustNot[mustNotIndex] = {
        ...newMustNot[mustNotIndex],
        alternatives: newMustNot[mustNotIndex].alternatives.filter((_, i) => i !== altIndex),
        alternativeNames: newMustNot[mustNotIndex].alternativeNames.filter((_, i) => i !== altIndex)
      };
      return { ...prev, mustNot: newMustNot };
    });
  };

  const handleSave = async () => {
    if (formData.must.length === 0 && formData.mustNot.length === 0) {
      setError('最低1つの条件を設定してください');
      return;
    }
    try {
      setLoading(true);
      // must/mustNot を orTerms に変換
      const includeTags: string[][] = [];
      const excludeTags: string[] = [];

      // mustタグを処理：各mustは[main, ...alternatives]のORグループ
      formData.must.forEach(mustItem => {
        includeTags.push([mustItem.main, ...mustItem.alternatives]);
      });

      // mustNotタグを処理：各mustNotは[main, ...alternatives]のORグループ
      formData.mustNot.forEach(mustNotItem => {
        excludeTags.push(...[mustNotItem.main, ...mustNotItem.alternatives]);
      });

      // デカルト積で全組み合わせを生成
      const orTerms = mustMustNotToOrTerms(includeTags, excludeTags);

      // 新規タグを解決
      const processedOrTerms = await resolveNewTagPlaceholders(orTerms, newTagNames);

      if (editingExpr) {
        await tagExpressionService.update(editingExpr.id, {
          orTerms: processedOrTerms,
          name: formData.name || undefined,
          color: formData.color || undefined,
          icon: formData.icon || undefined
        });
      } else {
        await tagExpressionService.create({
          orTerms: processedOrTerms,
          name: formData.name || undefined,
          color: formData.color || undefined,
          icon: formData.icon || undefined
        });
      }

      await loadExpressions();
      setEditingExpr(null);
      setIsCreating(false);
      setFormData({ name: '', color: '', icon: '', must: [], newMustTag: '', mustNot: [], newMustNotTag: '' });
      setNewTagInputs({});
      setNewTagNames({});
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
    setFormData({
      name: '',
      color: '',
      icon: '',
      must: [],
      newMustTag: '',
      mustNot: [],
      newMustNotTag: ''
    });
    setNewTagInputs({});
    setNewTagNames({});
    setError(null);
  };

  const sortedExpressions = React.useMemo(() => {
    return [...expressions].sort((a, b) => {
      const aNamed = Boolean(a.name && a.name.trim());
      const bNamed = Boolean(b.name && b.name.trim());
      if (aNamed === bNamed) return 0;
      return aNamed ? -1 : 1;
    });
  }, [expressions]);

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
              {/* <div className="form-group">
                <label>アイコン <span className="optional">(任意)</span></label>
                <input
                  value={formData.icon || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  disabled={loading}
                  placeholder="例: 📝 ✏️ 📌"
                  maxLength={2}
                />
                <small>絵文字などで分類を表すアイコン</small>
              </div> */}
            </div>
          </div>

          <div className="form-section">
            <h5>🔍 条件設定</h5>
            <div className="condition-builder">
              <div className="must-condition-form">
                <div className="must-section">
                  <h6>✅ 必須タグ (これらの組み合わせを含む)</h6>
                  <div className="tag-input-area">
                    <TagSuggestionInput
                      value={formData.newMustTag}
                      onChange={(v) => setFormData(prev => ({ ...prev, newMustTag: v }))}
                      onSelect={handleAddMustTag}
                      suggestions={getSuggestions(formData.newMustTag)}
                      placeholder="タグ名を入力して追加..."
                      disabled={loading}
                    />
                    <div className="tag-preview">
                      {formData.must.map((mustItem, index: number) => (
                        <div key={index} className="tag-group must-group">
                          <div className="main-tag-chip must-chip">
                            <span className="tag-icon">🏷️</span>
                            <span className="tag-name">{mustItem.mainName}</span>
                            <button type="button" onClick={() => handleRemoveMust(index)} disabled={loading} className="remove-tag">×</button>
                          </div>
                          {mustItem.alternatives.length > 0 && (
                            <div className="alternative-tags">
                              <span className="alt-label">代替:</span>
                              {mustItem.alternatives.map((altTagId, altIndex) => (
                                <span key={altIndex} className="tag-chip alt-chip must-chip">
                                  <span className="tag-name">{mustItem.alternativeNames[altIndex]}</span>
                                  <button type="button" onClick={() => handleRemoveMustAlternative(index, altIndex)} disabled={loading} className="remove-tag">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="add-alternative">
                            <TagSuggestionInput
                              value={formData.must[index]?.newAlternative || ''}
                              onChange={(v) => setFormData(prev => {
                                const newMust = [...prev.must];
                                if (!newMust[index]) return prev;
                                newMust[index] = { ...newMust[index], newAlternative: v };
                                return { ...prev, must: newMust };
                              })}
                              onSelect={(tagId, tagName) => handleAddMustAlternative(index, tagId, tagName)}
                              suggestions={getSuggestions(formData.must[index]?.newAlternative || '')}
                              placeholder="代替タグを追加..."
                              disabled={loading}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="must-not-section">
                  <h6>❌ 除外タグ (これらを含まない)</h6>
                  <div className="tag-input-area">
                    <TagSuggestionInput
                      value={formData.newMustNotTag}
                      onChange={(v) => setFormData(prev => ({ ...prev, newMustNotTag: v }))}
                      onSelect={handleAddMustNotTag}
                      suggestions={getSuggestions(formData.newMustNotTag)}
                      placeholder="タグ名を入力して追加..."
                      disabled={loading}
                    />
                    <div className="tag-preview">
                      {formData.mustNot.map((mustNotItem, index: number) => (
                        <div key={index} className="tag-group must-not-group">
                          <div className="main-tag-chip must-not-chip">
                            <span className="tag-icon">🚫</span>
                            <span className="tag-name">{mustNotItem.mainName}</span>
                            <button type="button" onClick={() => handleRemoveMustNot(index)} disabled={loading} className="remove-tag">×</button>
                          </div>
                          {mustNotItem.alternatives.length > 0 && (
                            <div className="alternative-tags">
                              <span className="alt-label">代替:</span>
                              {mustNotItem.alternatives.map((altTagId, altIndex) => (
                                <span key={altIndex} className="tag-chip alt-chip must-not-chip">
                                  <span className="tag-name">{mustNotItem.alternativeNames[altIndex]}</span>
                                  <button type="button" onClick={() => handleRemoveMustNotAlternative(index, altIndex)} disabled={loading} className="remove-tag">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="add-alternative">
                            <TagSuggestionInput
                              value={formData.mustNot[index]?.newAlternative || ''}
                              onChange={(v) => setFormData(prev => {
                                const newMustNot = [...prev.mustNot];
                                if (!newMustNot[index]) return prev;
                                newMustNot[index] = { ...newMustNot[index], newAlternative: v };
                                return { ...prev, mustNot: newMustNot };
                              })}
                              onSelect={(tagId, tagName) => handleAddMustNotAlternative(index, tagId, tagName)}
                              suggestions={getSuggestions(formData.mustNot[index]?.newAlternative || '')}
                              placeholder="代替タグを追加..."
                              disabled={loading}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {(formData.must.length > 0 || formData.mustNot.length > 0) && (
                  <div className="condition-preview">
                    <div className="preview-icon">👁️</div>
                    <div className="preview-text">
                      <strong>条件プレビュー:</strong>
                      {formData.must.length > 0 && (
                        <span>
                          {formData.must.map((item, i) => {
                            const tags = [item.mainName, ...item.alternativeNames];
                            return `(${tags.join(' OR ')})`;
                          }).join(' AND ')}
                        </span>
                      )}
                      {formData.must.length > 0 && formData.mustNot.length > 0 && ' AND '}
                      {formData.mustNot.length > 0 && (
                        <span>
                          NOT {formData.mustNot.map((item, i) => {
                            const tags = [item.mainName, ...item.alternativeNames];
                            return `(${tags.join(' OR ')})`;
                          }).join(' AND NOT ')}
                        </span>
                      )}
                      のメモ
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>



          <div className="form-actions">
            <button className="save-button primary" onClick={handleSave} disabled={loading || (formData.must.length === 0 && formData.mustNot.length === 0)}>
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
            {sortedExpressions.map((expr) => (
              <div key={expr.id} className="filter-item">
                <div className="filter-info">
                  <div className="filter-header">
                    <div className="filter-name">
                      {expr.icon && <span className="filter-icon">{expr.icon}</span>}
                      <h5>{expr.name || generateExpressionName(expr.orTerms) || '分類'}</h5>
                      {expr.color && <div className="color-indicator" style={{ backgroundColor: expr.color }}></div>}
                    </div>
                    {expr.id.startsWith('mock-') && <span className="mock-badge">サンプル</span>}
                  </div>
                  <div className="filter-conditions">
                    <div className="condition-summary compact">
                      <div className="condition-preview-line">
                        {formatLogicalText(generateExpressionName(expr.orTerms))}
                      </div>
                    </div>
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
