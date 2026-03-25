/**
 * 生体認証ボタンコンポーネント
 * ログイン画面と設定画面の両方で使用
 */

import React, { useState, useEffect } from "react";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerCredential,
  authenticateWithBiometric,
} from "../services/webauthnService";
import { login } from "~/features/App/utils/AuthManager";

interface BiometricLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

/**
 * ログイン画面用: 生体認証でログイン
 */
export const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  if (!available) return null;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBiometric();
      if (result.success && result.user) {
        login("biometric-session");
        onSuccess?.(result.user);
      } else {
        onError?.(result.error || "認証に失敗しました");
      }
    } catch (e: any) {
      onError?.(e?.message || "認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="biometric-login-button"
      onClick={handleLogin}
      disabled={loading}
      type="button"
    >
      {loading ? "認証中..." : "🔐 生体認証でログイン"}
    </button>
  );
};

interface BiometricRegisterButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * 設定画面用: 生体認証を登録
 */
export const BiometricRegisterButton: React.FC<BiometricRegisterButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  if (!available) return null;

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await registerCredential();
      if (result.success) {
        setRegistered(true);
        onSuccess?.();
      } else {
        onError?.(result.error || "登録に失敗しました");
      }
    } catch (e: any) {
      onError?.(e?.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="biometric-register-button"
      onClick={handleRegister}
      disabled={loading || registered}
      type="button"
    >
      {registered
        ? "✅ 生体認証を登録済み"
        : loading
          ? "登録中..."
          : "🔐 生体認証を登録する"}
    </button>
  );
};
