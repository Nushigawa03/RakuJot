import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ConfirmModal } from '~/components';
import { memoService } from '../../services/memoService';
import { useTrashedMemos } from '../../hooks/useLocalData';

const RETENTION_DAYS = 30;
const daysRemaining = (deletedAt: string) =>
  Math.max(0, RETENTION_DAYS - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000));

type Confirm = { title: string; confirmLabel: string; action: () => Promise<void> } | null;

const TrashPage = () => {
  const navigate = useNavigate();
  const trashed = useTrashedMemos();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }[]>, failure: string) => {
    const results = await action();
    const failed = results.find((r) => !r.ok);
    setError(failed ? `${failure}: ${failed.error ?? ''}` : null);
  };

  const ask = (title: string, confirmLabel: string, action: () => Promise<void>) =>
    setConfirm({ title, confirmLabel, action: async () => { setConfirm(null); await action(); } });

  if (!trashed) return <div className="trash"><p className="loading">読み込み中...</p></div>;

  return (
    <div className="trash">
      <header className="trash__header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="戻る">←</button>
        <h1 className="grow">🗑️ ゴミ箱</h1>
        {trashed.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => ask('ゴミ箱を空にする', '空にする', () =>
              run(() => Promise.all(trashed.map((m) => memoService.permanentlyDeleteMemo(m.id))), '一部のメモの削除に失敗しました'))}
          >
            ゴミ箱を空にする
          </Button>
        )}
      </header>

      {error && <p className="error-text">⚠ {error}</p>}

      {trashed.length > 0 && (
        <ul className="trash__list">
          {trashed.map((memo) => (
            <li key={memo.id} className="card trash__item">
              <div className="row row--between">
                <h3>{memo.title}</h3>
                <span className="badge">残り {daysRemaining(memo.deletedAt)} 日</span>
              </div>
              {memo.body && <p className="trash__body">{memo.body.length > 100 ? `${memo.body.slice(0, 100)}...` : memo.body}</p>}
              <div className="row row--between muted">
                <small>🗑️ {new Date(memo.deletedAt).toLocaleString('ja-JP')}</small>
                {memo.tagNames.length > 0 && (
                  <span className="tags">{memo.tagNames.map((tag, i) => <span key={i} className="tag">{tag}</span>)}</span>
                )}
              </div>
              <div className="row">
                <Button size="sm" onClick={() => run(async () => [await memoService.restoreMemo(memo.originalId)], '復元に失敗しました')}>
                  復元
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => ask('メモの完全削除', '完全削除', () =>
                    run(async () => [await memoService.permanentlyDeleteMemo(memo.id)], '削除に失敗しました'))}
                >
                  完全削除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={Boolean(confirm)}
        title={confirm?.title ?? ''}
        message="⚠ 取り消せません"
        isDangerous
        confirmLabel={confirm?.confirmLabel ?? ''}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default TrashPage;
