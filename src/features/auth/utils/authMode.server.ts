/**
 * 認証モード判定ユーティリティ
 * 開発モードと本番モードで認証動作を切り替え
 */

import { getUserIdFromSession } from "./session.server";
import { getDevUserId } from "./devUser.server";

/**
 * 開発モードかどうかを判定
 * - NODE_ENV が development
 * - GOOGLE_CLIENT_ID が未設定
 */
export const isDevMode = (): boolean => {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;

    // 開発環境で GOOGLE_CLIENT_ID がない場合のみ開発モード
    return isDevelopment && !hasGoogleClientId;
};

/**
 * 認証済みユーザー ID を取得
 * - 開発モード: devUser を自動使用
 * - 本番モード: セッションから取得（なければ null）
 */
export const getAuthenticatedUserId = async (
    request: Request
): Promise<string | null> => {
    // 本番モードではセッションから取得
    if (!isDevMode()) {
        return getUserIdFromSession(request);
    }

    // 開発モード: devUser を自動作成/取得
    try {
        return await getDevUserId();
    } catch (error) {
        console.error("Dev user creation failed:", error);
        return null;
    }
};

/**
 * 認証必須のルート用ヘルパー
 * 認証されていなければ 401 を返す
 */
export const requireAuthenticatedUserId = async (
    request: Request
): Promise<string> => {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
        throw new Response("Unauthorized", { status: 401 });
    }

    return userId;
};

/**
 * 現在のユーザー情報を取得（UI表示用）
 */
export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
    isDevMode: boolean;
};

export const getCurrentUser = async (
    request: Request
): Promise<AuthUser | null> => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return null;

    // 開発モードの場合
    if (isDevMode()) {
        return {
            id: userId,
            email: "dev@example.com",
            name: "開発ユーザー",
            picture: null,
            isDevMode: true,
        };
    }

    // 本番モード: DB からユーザー情報を取得
    const { findUserByEmail } = await import("../models/user.server");
    // セッションにはuserIdが入っているので、それで検索する必要があるが
    // 現状はemailで検索しているので、モデル層を拡張する必要がある
    // 暫定的に null を返す（後で拡張）
    return null;
};
