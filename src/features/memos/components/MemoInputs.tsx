import { useEffect, useState, type KeyboardEvent } from 'react';
import { Button, DatePickerInput, Icon, TagInput, Textarea } from '~/components';
import { memoService } from '../services/memoService';
import { useSettings } from '~/features/settings/useSettings';
import { useExpressions, useTags } from '../hooks/useLocalData';
import { useSearch } from '../searchStore';
import { expressionTagIds } from '../utils/expressions';
import { ExpressionPills } from './Sidebar';

/** 選択中の分類に入るためのタグ名（新規メモに自動でつける） */
function useActiveExpressionTags() {
  const { expressionId } = useSearch();
  const expression = useExpressions().find((e) => e.id === expressionId);
  const tags = useTags();
  if (!expression) return [];
  return expressionTagIds(expression.orTerms).flatMap((id) => tags.find((t) => t.id === id)?.name ?? []);
}

/**
 * 本文だけ入力してすぐ保存するメモ欄。タイトル・タグ・日付は AI が推定し、選択中の分類のタグを加える。
 * fullScreen はスマホの入力画面用（罫線つき・全面）。設定で分類ボタンを出せる。
 */
export const QuickMemoInput = ({ fullScreen = false }: { fullScreen?: boolean }) => {
  const { settings } = useSettings();
  const extraTags = useActiveExpressionTags();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await memoService.createMemoWithAiSuggestions(content, { tagLimit: 10, extraTags });
    setIsSaving(false);
    if (result.ok) setContent('');
    else setError(result.error || '保存に失敗しました。');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className={`quick-input ${fullScreen ? 'quick-input--full' : ''}`}>
      {fullScreen && settings.mobileInputExpressionButtons && (
        <div className="quick-input__expressions"><ExpressionPills namedOnly /></div>
      )}
      <Textarea
        placeholder="メモを入力..."
        value={content}
        onChange={setContent}
        onKeyDown={onKeyDown}
        disabled={isSaving}
        autoResize={!fullScreen}
        lined={fullScreen}
        rows={fullScreen ? undefined : 2}
      />
      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
      <Button full onClick={save} disabled={isSaving || !content.trim()}>
        {isSaving ? '保存中...' : fullScreen ? '保存' : <>保存<span className="hide-sm">（Ctrl+Enter）</span></>}
      </Button>
    </div>
  );
};

/** PC の「新規メモ」: タイトル・日付・タグ・本文を手入力して作成する（Esc でキャンセル） */
export const NewMemoForm = ({ onDone }: { onDone: () => void }) => {
  const allTags = useTags();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onDone();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const addTag = (name: string) => setTags((prev) => (prev.includes(name) ? prev : [...prev, name]));

  const save = async () => {
    if (!title.trim()) return setError('タイトルは必須です。');
    setIsSaving(true);
    const result = await memoService.createMemo({ title, date: date || undefined, tags, body });
    setIsSaving(false);
    if (result.ok) onDone();
    else setError(result.error || 'メモの保存に失敗しました。');
  };

  return (
    <div className="new-memo">
      <input className="input" autoFocus placeholder="タイトル" aria-label="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
      <DatePickerInput label="日付" value={date} onChange={setDate} />
      <div className="field">
        <span className="field__label">タグ</span>
        <TagInput
          chips={tags.map((t) => ({ key: t, label: t }))}
          onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))}
          suggestions={allTags.filter((t) => !tags.includes(t.name))}
          onSelect={(t) => addTag(t.name)}
          onCreate={addTag}
        />
      </div>
      <Textarea placeholder="本文" aria-label="本文" value={body} onChange={setBody} autoResize lined rows={4} />
      {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
      <div className="row">
        <Button onClick={save} disabled={isSaving}>保存</Button>
        <Button variant="secondary" onClick={onDone} disabled={isSaving}>キャンセル (Esc)</Button>
      </div>
    </div>
  );
};
