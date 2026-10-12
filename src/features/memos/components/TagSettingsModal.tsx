import { useState } from 'react';
import { Button, Icon, Modal, TagInput, Textarea } from '~/components';
import { useExpressions, useTagNameOf, useTags } from '../hooks/useLocalData';
import { expressionService, tagService } from '../services/tagService';
import { describeExpression, draftToOrTerms, LogicText, orTermsToDraft, type ExpressionDraft } from '../utils/expressions';
import type { Tag } from '../types/tags';
import type { TagExpression } from '../types/tagExpressions';

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

// ─── タグ ─────────────────────────────────────────────
const TagEditor = () => {
  const tags = useTags();
  const [editing, setEditing] = useState<Tag | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const open = (tag: Tag | 'new') => {
    setEditing(tag);
    setForm(tag === 'new' ? { name: '', description: '' } : { name: tag.name, description: tag.description || '' });
    setError(null);
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) return setError('タグ名は必須です');
    if (tags.some((t) => t.name === name && (editing === 'new' || t.id !== editing?.id))) return setError('同じ名前のタグがあります');
    if (editing === 'new') await tagService.createTag(name, form.description);
    else if (editing) await tagService.updateTag(editing.id, { name, description: form.description });
    setEditing(null);
  };

  const remove = async (tag: Tag) => {
    if (!confirm(`タグ「${tag.name}」を削除しますか？`)) return;
    const result = await tagService.deleteTag(tag.id);
    setError(result.ok ? null : result.error || 'タグの削除に失敗しました');
  };

  return (
    <section className="editor">
      <div className="editor__head">
        <span className="muted">{tags.length}個</span>
        <Button size="sm" onClick={() => open('new')}><Icon name="plus" /> タグを追加</Button>
      </div>
      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
      {editing && (
        <div className="card editor__form">
          <label className="field">
            <span className="field__label">タグ名 *</span>
            <input className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">説明</span>
            <Textarea value={form.description} onChange={(description) => setForm({ ...form, description })} rows={3} />
          </label>
          <div className="row">
            <Button onClick={save} disabled={!form.name.trim()}>{editing === 'new' ? 'タグを追加' : '保存'}</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>キャンセル</Button>
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <ul className="editor__grid">
          {tags.map((tag) => (
            <li key={tag.id} className="card editor__item">
              <div>
                <strong>{tag.name}</strong>
                {tag.description && <p className="muted">{tag.description}</p>}
              </div>
              <div className="row row--end">
                <Button variant="secondary" size="sm" onClick={() => open(tag)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => remove(tag)}>削除</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// ─── 分類 ─────────────────────────────────────────────
interface ExpressionForm extends ExpressionDraft {
  name: string;
  color: string;
}

const EMPTY_FORM: ExpressionForm = { name: '', color: '', must: [], mustNot: [] };

const ExpressionEditor = () => {
  const expressions = useExpressions();
  const tags = useTags();
  const nameOf = useTagNameOf();
  const [editing, setEditing] = useState<TagExpression | 'new' | null>(null);
  const [form, setForm] = useState<ExpressionForm>(EMPTY_FORM);
  /** 編集中の式がエディタで表現できない形（例: A OR (B AND NOT C)）なら元の条件を保持する */
  const [legacyTerms, setLegacyTerms] = useState<TagExpression['orTerms'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const used = new Set([...form.must.flat(), ...form.mustNot]);
  const available = tags.filter((t) => !used.has(t.id));
  const hasConditions = form.must.length > 0 || form.mustNot.length > 0;

  const open = (expr: TagExpression | 'new') => {
    setEditing(expr);
    setError(null);
    if (expr === 'new') {
      setForm(EMPTY_FORM);
      setLegacyTerms(null);
      return;
    }
    const draft = orTermsToDraft(expr.orTerms);
    setForm({ name: expr.name || '', color: expr.color || '', ...(draft ?? { must: [], mustNot: [] }) });
    setLegacyTerms(draft ? null : expr.orTerms);
  };

  const updateGroup = (index: number, ids: string[]) =>
    setForm((f) => ({ ...f, must: ids.length ? f.must.map((g, i) => (i === index ? ids : g)) : f.must.filter((_, i) => i !== index) }));

  const save = async () => {
    if (!hasConditions && !legacyTerms) return setError('最低1つの条件を設定してください');
    try {
      const data = {
        orTerms: hasConditions ? draftToOrTerms(form) : legacyTerms!,
        name: form.name.trim() || null,
        color: form.color || null,
      };
      if (editing === 'new') await expressionService.create(data);
      else if (editing) await expressionService.update(editing.id, data);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const remove = async (expr: TagExpression) => {
    if (confirm('この分類を削除しますか？')) await expressionService.delete(expr.id);
  };

  const groupText = (ids: string[]) => (ids.length > 1 ? `(${ids.map(nameOf).join(' OR ')})` : nameOf(ids[0]));
  const preview = [...form.must.map(groupText), ...form.mustNot.map((id) => `NOT ${nameOf(id)}`)].join(' AND ');
  const sorted = [...expressions.filter((e) => e.name?.trim()), ...expressions.filter((e) => !e.name?.trim())];

  return (
    <section className="editor">
      <div className="editor__head">
        <span />
        <Button size="sm" onClick={() => open('new')}><Icon name="plus" /> 分類を作成</Button>
      </div>
      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}

      {editing && (
        <div className="card editor__form">
          <div className="row">
            <label className="field grow">
              <span className="field__label">分類名</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="仕事、個人など" />
            </label>
            <label className="field">
              <span className="field__label">色</span>
              <input type="color" className="color-input" value={form.color || '#2563eb'} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </label>
          </div>

          <div className="field">
            <span className="field__label"><Icon name="circle-plus" /> 含む</span>
            {form.must.map((group, i) => (
              <TagInput
                key={i}
                chips={group.map((id) => ({ key: id, label: nameOf(id) }))}
                onRemove={(id) => updateGroup(i, group.filter((x) => x !== id))}
                suggestions={available}
                onSelect={(t) => updateGroup(i, [...group, t.id])}
                placeholder="OR でタグを追加"
              />
            ))}
            <TagInput
              chips={[]}
              onRemove={() => {}}
              suggestions={available}
              onSelect={(t) => setForm((f) => ({ ...f, must: [...f.must, [t.id]] }))}
              placeholder="AND でタグを追加"
            />
          </div>

          <div className="field">
            <span className="field__label"><Icon name="circle-minus" /> 除外</span>
            <TagInput
              chips={form.mustNot.map((id) => ({ key: id, label: nameOf(id), className: 'chip--exclude' }))}
              onRemove={(id) => setForm((f) => ({ ...f, mustNot: f.mustNot.filter((x) => x !== id) }))}
              suggestions={available}
              onSelect={(t) => setForm((f) => ({ ...f, mustNot: [...f.mustNot, t.id] }))}
              placeholder="除外するタグを追加"
            />
          </div>

          {(hasConditions || legacyTerms) && (
            <p className="editor__preview">
              <Icon name="eye" /> <LogicText text={hasConditions ? preview : describeExpression(legacyTerms!, nameOf)} /> のメモ
              {!hasConditions && <small className="muted"><Icon name="alert" /> タグを追加すると今の条件は置き換わります</small>}
            </p>
          )}

          <div className="row">
            <Button onClick={save} disabled={!hasConditions && !legacyTerms}>分類を保存</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>キャンセル</Button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="editor__list">
          {sorted.map((expr) => (
            <li key={expr.id} className="card editor__item">
              <div>
                <strong className="editor__name">
                  {expr.name || '（名前なし）'}
                  {expr.color && <span className="color-dot" style={{ background: expr.color }} />}
                </strong>
                <p className="muted"><LogicText text={describeExpression(expr.orTerms, nameOf)} /></p>
              </div>
              <div className="row row--end">
                <Button variant="secondary" size="sm" onClick={() => open(expr)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => remove(expr)}>削除</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
