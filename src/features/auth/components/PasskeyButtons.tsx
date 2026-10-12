import { useEffect, useState } from 'react';
import { Icon } from '~/components';
import { authenticateWithPasskey, isWebAuthnSupported, registerCredential } from '../services/webauthnService';

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
      <Icon name="key" />
      <span>{loading ? '認証中...' : 'パスキーでログイン'}</span>
    </button>
  );
};

/** 設定画面: パスキーを登録 */
export const PasskeyRegisterButton = ({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) => {
  const supported = useSupported();
  const [loading, setLoading] = useState(false);

  if (supported === null) return <div className="passkey-skeleton" />;
  if (!supported) return <p className="muted"><Icon name="alert" /> このブラウザはパスキー非対応</p>;

  const register = async () => {
    setLoading(true);
    const result = await registerCredential();
    setLoading(false);
    if (result.success) onSuccess();
    else onError(result.error || 'パスキーの登録に失敗しました');
  };

  return (
    <button type="button" className="btn btn--primary btn--full" onClick={register} disabled={loading}>
      <Icon name="key" />
      {loading ? '登録中...' : 'パスキーを追加'}
    </button>
  );
};
