/**
 * セッション管理ユーティリティ
 * Cookie ベースでユーザーセッションを管理
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "~/features/auth/config/authEnvironment.server";

const SESSION_COOKIE_NAME = "rakujot_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
    userId: string;
    createdAt: number;
};

const signPayload = (payload: string): string => {
    return createHmac("sha256", getSessionSecret())
        .update(payload)
        .digest("base64url");
};

const encodePayload = (payload: SessionPayload): string => {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
};

const decodePayload = (payload: string): SessionPayload | null => {
    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as SessionPayload;
    } catch {
        return null;
    }
};

const isValidSignature = (payload: string, signature: string): boolean => {
    const expectedSignature = signPayload(payload);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(provided, expected);
};

/**
 * ユーザーセッションを作成（Cookie に userId を保存）
 */
export const createUserSession = (userId: string): string => {
    const payload = encodePayload({ userId, createdAt: Date.now() });
    const signature = signPayload(payload);
    return `${payload}.${signature}`;
};

/**
 * セッション Cookie のヘッダーを生成
 */
export const getSessionCookieHeader = (sessionValue: string): string => {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=${sessionValue}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=${SESSION_MAX_AGE}`,
    ];

    if (isProduction) {
        cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
};

/**
 * リクエストからユーザー ID を取得
 */
export const getUserIdFromSession = (request: Request): string | null => {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const sessionValue = cookies[SESSION_COOKIE_NAME];
    if (!sessionValue) return null;

    const [payload, signature] = sessionValue.split(".");
    if (!payload || !signature || !isValidSignature(payload, signature)) {
        return null;
    }

    const sessionData = decodePayload(payload);
    return sessionData?.userId || null;
};

/**
 * ログアウト用の Cookie クリアヘッダー
 */
export const getLogoutCookieHeader = (): string => {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=0`,
    ];

    if (isProduction) {
        cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
};

/**
 * Cookie ヘッダーをパース
 */
const parseCookies = (cookieHeader: string): Record<string, string> => {
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        if (name) {
            cookies[name] = valueParts.join("=");
        }
    });
    return cookies;
};
