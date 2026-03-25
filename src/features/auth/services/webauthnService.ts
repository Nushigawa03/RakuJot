/**
 * WebAuthn クライアントサービス
 * ブラウザの Credential Management API を使った生体認証
 */

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

/**
 * ブラウザが WebAuthn をサポートしているか
 */
export const isWebAuthnSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
};

/**
 * プラットフォーム認証器（Touch ID, Face ID, Windows Hello 等）が使用可能か
 */
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * 生体認証を登録（ログイン済みユーザーが呼び出す）
 */
export const registerCredential = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. サーバーからチャレンジを取得
    const challengeResp = await fetch("/api/auth/webauthn/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "challenge" }),
    });

    if (!challengeResp.ok) {
      const err = await challengeResp.json().catch(() => ({}));
      return { success: false, error: err?.error || "チャレンジの取得に失敗しました" };
    }

    const options = await challengeResp.json();

    // 2. ブラウザの認証器で登録
    const attestationResponse = await startRegistration({ optionsJSON: options });

    // 3. サーバーに検証結果を送信
    const verifyResp = await fetch("/api/auth/webauthn/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "verify",
        attestationResponse,
      }),
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.json().catch(() => ({}));
      return { success: false, error: err?.error || "検証に失敗しました" };
    }

    return { success: true };
  } catch (error: any) {
    if (error.name === "NotAllowedError") {
      return { success: false, error: "認証がキャンセルされました" };
    }
    console.error("WebAuthn registration error:", error);
    return { success: false, error: error?.message || "登録に失敗しました" };
  }
};

/**
 * 生体認証でログイン
 */
export const authenticateWithBiometric = async (
  email?: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    // 1. サーバーからチャレンジを取得
    const challengeResp = await fetch("/api/auth/webauthn/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "challenge", email }),
    });

    if (!challengeResp.ok) {
      const err = await challengeResp.json().catch(() => ({}));
      return { success: false, error: err?.error || "チャレンジの取得に失敗しました" };
    }

    const options = await challengeResp.json();
    const { sessionKey, ...authOptions } = options;

    // 2. ブラウザの認証器で認証
    const assertionResponse = await startAuthentication({ optionsJSON: authOptions });

    // 3. サーバーに検証結果を送信
    const verifyResp = await fetch("/api/auth/webauthn/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "verify",
        assertionResponse,
        sessionKey,
      }),
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.json().catch(() => ({}));
      return { success: false, error: err?.error || "認証に失敗しました" };
    }

    const result = await verifyResp.json();
    return { success: true, user: result.user };
  } catch (error: any) {
    if (error.name === "NotAllowedError") {
      return { success: false, error: "認証がキャンセルされました" };
    }
    console.error("WebAuthn authentication error:", error);
    return { success: false, error: error?.message || "認証に失敗しました" };
  }
};
