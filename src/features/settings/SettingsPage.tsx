import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Icon, Switch } from '~/components';
import { useSettings } from './useSettings';
import { PasskeyRegisterButton } from '~/features/auth/components/PasskeyButtons';
import { deleteCredential, listCredentials, type WebAuthnCredentialSummary } from '~/features/auth/services/webauthnService';

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const passkeyLabel = ({ transports = [] }: WebAuthnCredentialSummary, index: number) => {
  if (transports.includes('internal')) return 'この端末のパスキー';
  if (transports.includes('hybrid')) return 'スマホ連携のパスキー';
  if (transports.some((t) => ['usb', 'nfc', 'ble'].includes(t))) return 'セキュリティキー';
  return `パスキー ${index + 1}`;
};

const Item = ({ label, htmlFor, description, children, inline }: { label: string; htmlFor?: string; description?: string; children: ReactNode; inline?: boolean }) => (
  <div className={`setting ${inline ? 'setting--inline' : ''}`}>
    <div>
      <label className="setting__label" htmlFor={htmlFor}>{label}</label>
      {description && <p className="muted">{description}</p>}
    </div>
    <div className="setting__control">{children}</div>
  </div>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, isLoaded } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [passkeys, setPasskeys] = useState<WebAuthnCredentialSummary[] | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPasskeys = () => listCredentials().catch(() => []).then(setPasskeys);
  useEffect(() => { loadPasskeys(); }, []);

  const removePasskey = async (id: string) => {
    setDeletingId(id);
    const result = await deleteCredential(id);
    setDeletingId(null);
    if (result.success) setPasskeys((list) => list?.filter((p) => p.id !== id) ?? null);
    setFeedback(result.success ? { ok: true, text: 'パスキーを削除しました。' } : { ok: false, text: result.error || 'パスキーの削除に失敗しました。' });
  };

  if (!isLoaded) return null;

  return (
    <div className="settings">
      <header className="settings__header">
        <button type="button" className="icon-btn" onClick={() => navigate('/app')} aria-label="戻る"><Icon name="arrow-left" /></button>
        <h1>設定</h1>
      </header>

      <main className="settings__content">
        <section className="card">
          <h2>ログイン</h2>
          <Item label="パスキー">
            <PasskeyRegisterButton
              onSuccess={() => { setFeedback({ ok: true, text: 'パスキーを登録しました。' }); loadPasskeys(); }}
              onError={(text) => setFeedback({ ok: false, text })}
            />
            {feedback && <p className={feedback.ok ? 'success-text' : 'error-text'}>{feedback.text}</p>}
            {passkeys === null ? <p className="muted">読み込み中...</p> : passkeys.length > 0 && (
              <ul className="passkeys">
                {passkeys.map((p, i) => (
                  <li key={p.id} className="row row--between">
                    <span>{passkeyLabel(p, i)} <small className="muted">{formatDate(p.createdAt)}</small></span>
                    <button type="button" className="btn btn--danger btn--sm" disabled={deletingId === p.id} onClick={() => removePasskey(p.id)}>
                      {deletingId === p.id ? '削除中...' : '削除'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Item>
        </section>

        <section className="card">
          <h2>AI機能</h2>
          <Item inline label="AIを使う" htmlFor="ai-toggle">
            <Switch id="ai-toggle" checked={settings.aiUsageEnabled} onChange={(v) => updateSetting('aiUsageEnabled', v)} />
          </Item>
          <Item label="Gemini APIキー" htmlFor="google-api-key">
            <div className="input-with-button">
              <input
                id="google-api-key"
                className="input"
                type={showApiKey ? 'text' : 'password'}
                value={settings.googleApiKey}
                onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
              />
              <button type="button" className="icon-btn" onClick={() => setShowApiKey((v) => !v)} aria-label={showApiKey ? 'APIキーを隠す' : 'APIキーを表示する'}>
                <Icon name={showApiKey ? 'eye-off' : 'eye'} />
              </button>
            </div>
          </Item>
        </section>

        <section className="card">
          <h2>検索</h2>
          <Item inline label="詳細検索を常に開く" htmlFor="detail-search-toggle">
            <Switch id="detail-search-toggle" checked={settings.detailSearchAlwaysVisible} onChange={(v) => updateSetting('detailSearchAlwaysVisible', v)} />
          </Item>
        </section>

        <section className="card">
          <h2>メモ入力</h2>
          <Item inline label="スマホの入力画面に分類ボタンを表示" htmlFor="mobile-expression-toggle">
            <Switch id="mobile-expression-toggle" checked={settings.mobileInputExpressionButtons} onChange={(v) => updateSetting('mobileInputExpressionButtons', v)} />
          </Item>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
