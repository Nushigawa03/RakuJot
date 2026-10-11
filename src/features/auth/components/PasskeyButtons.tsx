import { useEffect, useState } from 'react';
import { authenticateWithPasskey, isWebAuthnSupported, registerCredential } from '../services/webauthnService';

const PasskeyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 7a4 4 0 1 0-3.3 3.94" />
    <path d="M14 11h7v3h-3v3h-3v3h-3v-5" />
  </svg>
);

/** SSR では判定できないため、マウント後に WebAuthn 対応を確認する */
const useSupported = () => {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => setSupported(isWebAuthnSupported()), []);
  return supported;
};

/** ログイン画面: パスキーでログイン */
export const PasskeyLoginButton = ({ onSuccess, onError }: { onSuccess: (user: { id: string }) => void; onError: (error: string) => void }) => {
  const supported = useSupported();
  const [loading, setLoading] = useState(false);
  if (supported === null) return <div className="passkey-skeleton" />;
  if (!supported) return null;

  const login = async () => {
    setLoading(true);
    const result = await authenticateWithPasskey();
    setLoading(false);
    if (result.success && result.user) onSuccess(result.user);
    else onError(result.error || 'パスキー認証に失敗しました');
  };

  return (
    <button type="button" className="passkey-button" onClick={login} disabled={loading}>
      <PasskeyIcon />
      <span>{loading ? '認証中...' : 'パスキーでログイン'}</span>
    </button>
  );
};

/** 設定画面: パスキーを登録 */
export const PasskeyRegisterButton = ({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) => {
  const supported = useSupported();
  const [loading, setLoading] = useState(false);

  if (supported === null) return <div className="passkey-skeleton" />;
  if (!supported) return <p className="muted">⚠ このブラウザはパスキー非対応</p>;

  const register = async () => {
    setLoading(true);
    const result = await registerCredential();
    setLoading(false);
    if (result.success) onSuccess();
    else onError(result.error || 'パスキーの登録に失敗しました');
  };

  return (
    <button type="button" className="btn btn--primary btn--full" onClick={register} disabled={loading}>
      <PasskeyIcon />
      {loading ? '登録中...' : 'パスキーを追加'}
    </button>
  );
};
