import { useState, type FormEvent } from 'react';
import { Button, Icon, Modal, TagInput, Textarea } from '~/components';
import { useExpressions, useTagNameOf, useTags } from '../hooks/useLocalData';
import { expressionService, tagService } from '../services/tagService';
import { orTermsToRows, rowsToOrTerms, type ConditionRow } from '../utils/expressions';
import type { Tag } from '../types/tags';
import type { TagExpression, TagExpressionTerm } from '../types/tagExpressions';

type Tab = 'tags' | 'expressions';

const TagSettingsModal = ({ onClose, initialTab = 'tags' }: { onClose: () => void; initialTab?: Tab }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <Modal title="タグ設定" onClose={onClose} wide>
      <div className="tabs" role="tablist">
        {(['tags', 'expressions'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'tags' ? 'タグ' : '分類'}
          </button>
        ))}
      </div>
      {tab === 'tags' ? <TagEditor /> : <ExpressionEditor />}
    </Modal>
  );
};

export default TagSettingsModal;

const ItemActions = ({ label, onEdit, onRemove }: { label: string; onEdit: () => void; onRemove: () => void }) => (
  <div className="editor__actions">
    <button type="button" className="icon-btn" onClick={onEdit} title="編集" aria-label={`${label}を編集`}><Icon name="pencil" /></button>
    <button type="button" className="icon-btn icon-btn--danger" onClick={onRemove} title="削除" aria-label={`${label}を削除`}><Icon name="trash" /></button>
  </div>
);

// ─── タグ ─────────────────────────────────────────────
const TagEditor = () => {
  const tags = useTags();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duplicated = (name: string, selfId?: string) => tags.some((t) => t.name === name && t.id !== selfId);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (duplicated(name)) return setError('同じ名前のタグがあります');
    await tagService.createTag(name, '');
    setNewName('');
    setError(null);
  };

  const remove = async (tag: Tag) => {
    if (!confirm(`タグ「${tag.name}」を削除しますか？`)) return;
    const result = await tagService.deleteTag(tag.id);
    setError(result.ok ? null : result.error || 'タグの削除に失敗しました');
  };

  return (
    <section className="editor">
      <form className="editor__add" onSubmit={add}>
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="タグ名" aria-label="タグ名" />
        <Button type="submit" disabled={!newName.trim()}><Icon name="plus" /> タグを追加</Button>
      </form>
      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
      {tags.length > 0 && (
        <ul className="editor__list">
          {tags.map((tag) =>
            editingId === tag.id ? (
              <li key={tag.id}>
                <TagForm
                  tag={tag}
                  onCancel={() => setEditingId(null)}
                  onSave={async (name, description) => {
                    if (duplicated(name, tag.id)) return setError('同じ名前のタグがあります');
                    await tagService.updateTag(tag.id, { name, description });
                    setEditingId(null);
                    setError(null);
                  }}
                />
              </li>
            ) : (
              <li key={tag.id} className="editor__item">
                <div className="editor__body">
                  <strong>{tag.name}</strong>
                  {tag.description && <p className="muted">{tag.description}</p>}
                </div>
                <ItemActions label={tag.name} onEdit={() => setEditingId(tag.id)} onRemove={() => remove(tag)} />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
};

const TagForm = ({ tag, onSave, onCancel }: { tag: Tag; onSave: (name: string, description: string) => void; onCancel: () => void }) => {
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description || '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), description);
  };
  return (
    <form className="editor__form" onSubmit={submit}>
      <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="タグ名" />
      <Textarea value={description} onChange={setDescription} rows={2} placeholder="説明" />
      <div className="row row--end">
        <Button variant="ghost" size="sm" onClick={onCancel}>キャンセル</Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>保存</Button>
      </div>
    </form>
  );
};

// ─── 分類 ─────────────────────────────────────────────
type ExpressionData = Pick<TagExpression, 'name' | 'color' | 'orTerms'>;

const ExpressionEditor = () => {
  const expressions = useExpressions();
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const save = async (id: string | 'new', data: ExpressionData) => {
    if (id === 'new') await expressionService.create(data);
    else await expressionService.update(id, data);
    setEditing(null);
  };

  const remove = async (expr: TagExpression) => {
    if (confirm(expr.name ? `分類「${expr.name}」を削除しますか？` : 'この分類を削除しますか？')) await expressionService.delete(expr.id);
  };

  const sorted = [...expressions.filter((e) => e.name?.trim()), ...expressions.filter((e) => !e.name?.trim())];

  return (
    <section className="editor">
      {editing === 'new' ? (
        <ExpressionForm onSave={(data) => save('new', data)} onCancel={() => setEditing(null)} />
      ) : (
        <Button variant="secondary" onClick={() => setEditing('new')}><Icon name="plus" /> 分類を作成</Button>
      )}
      {sorted.length > 0 && (
        <ul className="editor__list">
          {sorted.map((expr) =>
            editing === expr.id ? (
              <li key={expr.id}>
                <ExpressionForm expr={expr} onSave={(data) => save(expr.id, data)} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={expr.id} className="editor__item">
                <div className="editor__body">
                  <strong className="editor__name">
                    {expr.color && <span className="color-dot" style={{ background: expr.color }} />}
                    {expr.name}
                  </strong>
                  <ConditionSummary orTerms={expr.orTerms} />
                </div>
                <ItemActions label={expr.name || '分類'} onEdit={() => setEditing(expr.id)} onRemove={() => remove(expr)} />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
};

/** 一覧用: 行ごとのタグを並べ、行の間に「または」 */
const ConditionSummary = ({ orTerms }: { orTerms: TagExpressionTerm[] }) => {
  const nameOf = useTagNameOf();
  return (
    <div className="condition-summary">
      {orTermsToRows(orTerms).map((row, i) => (
        <span key={i} className="condition-summary__row">
          {i > 0 && <span className="condition-or">または</span>}
          {row.map((c) => (
            <span key={c.id} className={`chip chip--sm ${c.not ? 'chip--exclude' : ''}`}>{c.not && <Icon name="ban" />}{nameOf(c.id)}</span>
          ))}
        </span>
      ))}
    </div>
  );
};

const ExpressionForm = ({ expr, onSave, onCancel }: { expr?: TagExpression; onSave: (data: ExpressionData) => Promise<void>; onCancel: () => void }) => {
  const tags = useTags();
  const nameOf = useTagNameOf();
  const [name, setName] = useState(expr?.name || '');
  const [color, setColor] = useState(expr?.color || '');
  const [rows, setRows] = useState<ConditionRow[]>(() => (expr?.orTerms.length ? orTermsToRows(expr.orTerms) : [[]]));
  const [error, setError] = useState<string | null>(null);

  const hasConditions = rows.some((row) => row.length);
  const canAddRow = rows[rows.length - 1].length > 0;

  const updateRow = (index: number, fn: (row: ConditionRow) => ConditionRow) => setRows((rs) => rs.map((r, i) => (i === index ? fn(r) : r)));
  const removeRow = (index: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== index) : [[]]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasConditions) return;
    try {
      await onSave({ name: name.trim() || null, color: color || null, orTerms: rowsToOrTerms(rows) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  return (
    <form className="editor__form" onSubmit={submit}>
      <div className="editor__title-row">
        <input type="color" className="color-input" value={color || '#2563eb'} onChange={(e) => setColor(e.target.value)} title="色" aria-label="色" />
        <input className="input" autoFocus={!expr} value={name} onChange={(e) => setName(e.target.value)} placeholder="分類名" aria-label="分類名" />
      </div>

      <div className="conditions">
        {rows.map((row, i) => (
          <div key={i} className="conditions__item">
            {i > 0 && <div className="condition-divider"><span>または</span></div>}
            <div className="conditions__row">
              <TagInput
                className="tag-input--condition"
                chips={row.map((c) => ({
                  key: c.id,
                  label: nameOf(c.id),
                  not: { on: c.not, onToggle: () => updateRow(i, (r) => r.map((x) => (x.id === c.id ? { ...x, not: !x.not } : x))) },
                }))}
                onRemove={(id) => updateRow(i, (r) => r.filter((x) => x.id !== id))}
                suggestions={tags.filter((t) => !row.some((c) => c.id === t.id))}
                onSelect={(t) => updateRow(i, (r) => [...r, { id: t.id, not: false }])}
                onSelectExclude={(t) => updateRow(i, (r) => [...r, { id: t.id, not: true }])}
                placeholder="タグを追加"
              />
              {rows.length > 1 && (
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => removeRow(i)} title="この行を削除" aria-label="この行を削除"><Icon name="x" /></button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="condition-divider condition-divider--add" onClick={() => setRows((rs) => [...rs, []])} disabled={!canAddRow}>
          <span><Icon name="plus" /> または</span>
        </button>
      </div>

      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
      <div className="row row--end">
        <Button variant="ghost" size="sm" onClick={onCancel}>キャンセル</Button>
        <Button type="submit" size="sm" disabled={!hasConditions}>保存</Button>
      </div>
    </form>
  );
};
