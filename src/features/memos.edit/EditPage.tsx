import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, DatePickerInput, Icon, Switch, TagInput, Textarea } from '~/components';
import { memoService } from '~/features/memos/services/memoService';
import { useTags } from '~/features/memos/hooks/useLocalData';
import { useSettings } from '~/features/settings/useSettings';
import { getCanonicalMemoId, subscribeLocalDb } from '~/features/sync/localDb';
import { todayString } from '~/features/memos/utils/dateUtils';
import { useMemoForm, type MemoData } from './useMemoForm';

export type EditableMemo = MemoData & { id: string };

const EditPage = ({ memo }: { memo: EditableMemo }) => {
  const navigate = useNavigate();
  const [memoId, setMemoId] = useState(memo.id);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useMemoForm(memo, async (data) => {
    const result = await memoService.updateMemo(memoId, data);
    setError(result.ok ? null : result.error || 'メモの更新に失敗しました。');
    return result.ok;
  });

  // 新規メモが同期で正式 ID に変わったら URL も差し替える
  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeLocalDb(async () => {
      const canonical = await getCanonicalMemoId(memoId);
      if (alive && canonical !== memoId) {
        setMemoId(canonical);
        navigate(`/app/edit/${canonical}`, { replace: true });
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [memoId, navigate]);

  const remove = async () => {
    await memoService.deleteMemo(memoId);
    navigate('/app');
  };

  const history = (
    <div className="row">
      <Button variant="ghost" size="sm" onClick={form.undo} disabled={!form.canUndo} title="元に戻す" aria-label="元に戻す"><Icon name="undo" /></Button>
      <Button variant="ghost" size="sm" onClick={form.redo} disabled={!form.canRedo} title="やり直す" aria-label="やり直す"><Icon name="redo" /></Button>
    </div>
  );

  return (
    <div className="edit">
      <header className="edit__header">
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}><Icon name="arrow-left" /> <span className="hide-sm">戻る</span></Button>
        {/* 履歴操作はヘッダーに置き、本文の位置を閲覧表示と揃える */}
        {editMode && history}
        <span className={`edit__status ${error ? 'is-error' : ''}`} role="status">
          {form.isSaving ? <><Icon name="save" /> 保存中...</> : error ? <><Icon name="alert" /> {error}</> : form.lastSaved
            ? <><Icon name="check" /> {form.lastSaved.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に保存済み</> : null}
        </span>
        <Button variant="secondary" size="sm" onClick={form.discard} disabled={!form.canDiscard} title="変更を破棄">
          <Icon name="reset" /> <span className="hide-sm">変更を破棄</span>
        </Button>
        <Button variant="danger" size="sm" onClick={remove} title="ゴミ箱へ移動"><Icon name="trash" /> <span className="hide-sm">削除</span></Button>
        <Button size="sm" onClick={() => setEditMode((v) => !v)}>
          {editMode ? <><Icon name="book-open" /> <span className="hide-sm">閲覧</span></> : <><Icon name="pencil" /> <span className="hide-sm">編集</span></>}
        </Button>
      </header>

      {editMode ? <MemoEditor form={form} /> : (
        <div className="edit__view">
          <article className="edit__display">
            <h1>{form.data.title || '(タイトルなし)'}</h1>
            {form.data.date && <div className="muted">{form.data.date}</div>}
            {form.data.tags.length > 0 && (
              <div className="tags">{form.data.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
            )}
            <div className="edit__body">{form.data.body}</div>
          </article>
          <QuickAiEdit form={form} toolbar={history} />
        </div>
      )}
    </div>
  );
};

export default EditPage;

type Form = ReturnType<typeof useMemoForm>;

const MemoEditor = ({ form }: { form: Form }) => {
  const allTags = useTags();
  const { data, update } = form;
  const addTag = (name: string) => !data.tags.includes(name) && update({ tags: [...data.tags, name] });
  return (
    // 閲覧表示と同じレイアウトのまま、各要素をその場で編集できるようにする
    <article className="edit__display edit__display--editing">
      <Textarea
        autoResize
        rows={1}
        className="edit__inline edit__inline--title"
        placeholder="タイトル"
        aria-label="タイトル"
        value={data.title}
        onChange={(title) => update({ title: title.replace(/\n/g, ' ') })}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      />
      <div className="edit__inline-meta">
        <DatePickerInput label="日付" placeholder="日付を追加" value={data.date} onChange={(date) => update({ date })} />
      </div>
      <TagInput
        chips={data.tags.map((t) => ({ key: t, label: t }))}
        onRemove={(t) => update({ tags: data.tags.filter((x) => x !== t) })}
        suggestions={allTags.filter((t) => !data.tags.includes(t.name))}
        onSelect={(t) => addTag(t.name)}
        onCreate={addTag}
        placeholder="+ タグ"
      />
      <Textarea
        autoResize
        className="edit__inline edit__inline--body"
        placeholder="本文を入力…"
        aria-label="本文"
        value={data.body}
        onChange={(body) => update({ body })}
      />
    </article>
  );
};

/** 「明後日に変更」のような指示を AI に渡してメモを書き換える */
const QuickAiEdit = ({ form, toolbar }: { form: Form; toolbar: React.ReactNode }) => {
  const { settings, updateSetting } = useSettings();
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const current = form.data;
    setIsProcessing(true);
    setError(null);
    const suggestion = await memoService.suggestEdit(current.body, instruction);
    if (suggestion && (await form.applyNow({
      title: suggestion.title || current.title,
      body: suggestion.body,
      tags: [...new Set([...current.tags, ...suggestion.tags])],
      date: suggestion.date || current.date || todayString(),
    }))) {
      setInstruction('');
    } else {
      setError('AI の処理に失敗しました');
    }
    setIsProcessing(false);
  };

  return (
    <section className="quick-edit">
      <div className="row row--between">
        <h3><Icon name="sparkles" /> AI で編集</h3>
        {toolbar}
      </div>
      {settings.aiUsageEnabled ? (
        <>
          <Textarea placeholder="「明後日に変更」など" value={instruction} onChange={setInstruction} rows={4} disabled={isProcessing} />
          {error && <p className="error-text"><Icon name="alert" /> {error}</p>}
          <Button full onClick={submit} disabled={!instruction.trim() || isProcessing}>{isProcessing ? '書き換え中...' : '書き換える'}</Button>
        </>
      ) : (
        <label className="row row--between" htmlFor="quick-ai-toggle">
          AI を使う
          <Switch id="quick-ai-toggle" checked={false} onChange={(v) => updateSetting('aiUsageEnabled', v)} />
        </label>
      )}
    </section>
  );
};
