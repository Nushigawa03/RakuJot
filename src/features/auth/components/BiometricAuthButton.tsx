/**
 * パスキー認証ボタンコンポーネント
 * ログイン画面と設定画面の両方で使用
 */

import React, { useEffect, useState } from "react";
import {
  getWebAuthnStatus,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  registerCredential,
  authenticateWithBiometric,
} from "../services/webauthnService";
import { login } from "~/features/App/utils/AuthManager";
import "./BiometricAuthButton.css";

interface BiometricLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

const PasskeyIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 7a4 4 0 1 0-3.3 3.94" />
    <path d="M14 11h7v3h-3v3h-3v3h-3v-5" />
  </svg>
);

/**
 * ログイン画面用: パスキーでログイン
 */
export const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    setChecking(false);
  }, []);

  if (checking) {
    return <div className="passkey-button-skeleton" />;
  }

  if (!supported) return null;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBiometric();
      if (result.success && result.user) {
        login("passkey-session");
        onSuccess?.(result.user);
      } else {
        onError?.(result.error || "パスキー認証に失敗しました");
      }
    } catch (e: any) {
      onError?.(e?.message || "パスキー認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="passkey-button passkey-button--login"
      onClick={handleLogin}
      disabled={loading}
      type="button"
    >
      <PasskeyIcon />
      <span>{loading ? "認証中..." : "パスキーでログイン"}</span>
    </button>
  );
};

interface BiometricRegisterButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * 設定画面用: パスキーを登録
 */
export const BiometricRegisterButton: React.FC<BiometricRegisterButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [supported, setSupported] = useState(false);
  const [hasPlatformAuthenticator, setHasPlatformAuthenticator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [credentialCount, setCredentialCount] = useState(0);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      const webAuthnSupported = isWebAuthnSupported();
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      const status = webAuthnSupported
        ? await getWebAuthnStatus()
        : { supported: false, registered: false, credentialCount: 0 };

      if (cancelled) return;

      setSupported(webAuthnSupported && status.supported);
      setHasPlatformAuthenticator(platformAvailable);
      setRegistered(status.registered);
      setCredentialCount(status.credentialCount);
      setStatusLoaded(true);
    };

    loadStatus().catch(() => {
      if (!cancelled) {
        setSupported(isWebAuthnSupported());
        setStatusLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!statusLoaded) {
    return <div className="passkey-button-skeleton" />;
  }

  if (!supported) {
    return (
      <div className="passkey-unavailable">
        このブラウザではパスキーを使用できません。
      </div>
    );
  }

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await registerCredential();
      if (result.success) {
        setRegistered(true);
        setCredentialCount((count) => Math.max(1, count + 1));
        onSuccess?.();
      } else {
        onError?.(result.error || "パスキーの登録に失敗しました");
      }
    } catch (e: any) {
      onError?.(e?.message || "パスキーの登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? "登録中..."
    : registered
      ? "パスキーを追加登録"
      : "パスキーを登録";

  return (
    <div className="passkey-register">
      <button
        className="passkey-button passkey-button--register"
        onClick={handleRegister}
        disabled={loading}
        type="button"
      >
        <PasskeyIcon />
        <span>{buttonLabel}</span>
      </button>
      <div className="passkey-register__status">
        {registered
          ? `登録済み: ${credentialCount}件`
          : hasPlatformAuthenticator
            ? "Windows Hello / 端末の生体認証を利用できます"
            : "スマホやセキュリティキーのパスキーを利用できます"}
      </div>
    </div>
  );
};
