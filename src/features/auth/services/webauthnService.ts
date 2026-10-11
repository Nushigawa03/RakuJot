/**
 * WebAuthn（パスキー）クライアント
 */
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

export type WebAuthnCredentialSummary = {
  id: string;
  transports: string[];
  createdAt: string;
};

type Result<T = object> = { success: boolean; error?: string } & Partial<T>;

export const isWebAuthnSupported = () => typeof window !== 'undefined' && browserSupportsWebAuthn();

/** Touch ID / Face ID / Windows Hello などが使えるか */
export const isPlatformAuthenticatorAvailable = async () => {
  try {
    return isWebAuthnSupported() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
};

const post = async (url: string, body: unknown, failure: string) => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || failure);
  return data;
};

const toResult = (error: any, failure: string): Result => {
  if (error?.name === 'NotAllowedError') return { success: false, error: '認証がキャンセルされました' };
  console.error('WebAuthn error:', error);
  return { success: false, error: error?.message || failure };
};

export const listCredentials = async (): Promise<WebAuthnCredentialSummary[]> => {
  const resp = await fetch('/api/auth/webauthn/credentials', { credentials: 'include' });
  const data = resp.ok ? await resp.json() : null;
  return Array.isArray(data?.credentials) ? data.credentials : [];
};

export const deleteCredential = async (id: string): Promise<Result> => {
  const resp = await fetch('/api/auth/webauthn/credentials', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  });
  if (resp.ok) return { success: true };
  return { success: false, error: (await resp.json().catch(() => ({})))?.error || 'パスキーの削除に失敗しました' };
};

/** ログイン済みユーザーのパスキーを登録する */
export const registerCredential = async (): Promise<Result> => {
  const url = '/api/auth/webauthn/register';
  try {
    const options = await post(url, { phase: 'challenge' }, 'チャレンジの取得に失敗しました');
    const attestationResponse = await startRegistration({ optionsJSON: options });
    await post(url, { phase: 'verify', attestationResponse }, '検証に失敗しました');
    return { success: true };
  } catch (error) {
    return toResult(error, '登録に失敗しました');
  }
};

/** パスキーでログインする */
export const authenticateWithPasskey = async (): Promise<Result<{ user: { id: string } }>> => {
  const url = '/api/auth/webauthn/login';
  try {
    const { sessionKey, ...optionsJSON } = await post(url, { phase: 'challenge' }, 'チャレンジの取得に失敗しました');
    const assertionResponse = await startAuthentication({ optionsJSON });
    const result = await post(url, { phase: 'verify', assertionResponse, sessionKey }, '認証に失敗しました');
    return { success: true, user: result.user };
  } catch (error) {
    return toResult(error, '認証に失敗しました');
  }
};
