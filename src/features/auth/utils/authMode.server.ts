/**
 * 認証モード判定ユーティリティ
 * 開発モードと本番モードで認証動作を切り替え
 */

import { redirect } from "react-router";
import { getDevUserProfile, getPublicAuthConfig } from "~/features/auth/config/authEnvironment.server";
import { getUserIdFromSession } from "./session.server";
import { getDevUserId } from "./devUser.server";

/**
 * 開発モードかどうかを判定
 * - NODE_ENV が development
 * - GOOGLE_CLIENT_ID が未設定
 */
export const isDevMode = (): boolean => {
    return getPublicAuthConfig().isDevMode;
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

export const requireAuthenticatedPageUserId = async (
    request: Request,
    redirectTo: string = "/login"
): Promise<string> => {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
        throw redirect(redirectTo);
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

    const { findUserById } = await import("../models/user.server");
    const user = await findUserById(userId);

    if (user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            isDevMode: isDevMode(),
        };
    }

    if (isDevMode()) {
        const devUser = getDevUserProfile();
        return {
            id: userId,
            email: devUser.email,
            name: devUser.name,
            picture: devUser.picture,
            isDevMode: true,
        };
    }

    return null;
};
