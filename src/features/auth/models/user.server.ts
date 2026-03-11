import { Prisma } from "@prisma/client";
import { prisma } from "~/db.server";
import {
    sanitizePersistedUserSettings,
    type PersistedUserSettings,
} from "~/features/settings/settings";

const CORE_USER_SELECT = {
    id: true,
    email: true,
    name: true,
    picture: true,
    googleId: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * Models層: User テーブルへの CRUD 操作
 * API Route や他の utils は直接 Prisma を使わず、このファイル経由でアクセスする
 */

/**
 * メールアドレスでユーザーを検索
 */
export const findUserByEmail = async (email: string) => {
    try {
        return await prisma.user.findUnique({
            where: { email },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User findByEmail error:", error);
        return null;
    }
};

/**
 * Google ID でユーザーを検索
 */
export const findUserByGoogleId = async (googleId: string) => {
    try {
        return await prisma.user.findUnique({
            where: { googleId },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User findByGoogleId error:", error);
        return null;
    }
};

/**
 * ユーザー ID でユーザーを検索
 */
export const findUserById = async (id: string) => {
    try {
        return await prisma.user.findUnique({
            where: { id },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User findById error:", error);
        return null;
    }
};

/**
 * ユーザーを作成
 */
export const createUser = async (data: {
    email: string;
    name?: string;
    googleId: string;
    picture?: string;
}) => {
    try {
        return await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                googleId: data.googleId,
                picture: data.picture,
            },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User create error:", error);
        throw error;
    }
};

/**
 * Google ログイン用にユーザーを同期
 */
export const syncGoogleUser = async (data: {
    email: string;
    name?: string;
    googleId: string;
    picture?: string;
}) => {
    try {
        const existingByGoogleId = await prisma.user.findUnique({
            where: { googleId: data.googleId },
            select: CORE_USER_SELECT,
        });

        if (existingByGoogleId) {
            return await prisma.user.update({
                where: { id: existingByGoogleId.id },
                data: {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                },
                select: CORE_USER_SELECT,
            });
        }

        const existingByEmail = await prisma.user.findUnique({
            where: { email: data.email },
            select: CORE_USER_SELECT,
        });

        if (existingByEmail) {
            return await prisma.user.update({
                where: { id: existingByEmail.id },
                data: {
                    googleId: data.googleId,
                    name: data.name ?? existingByEmail.name,
                    picture: data.picture,
                },
                select: CORE_USER_SELECT,
            });
        }

        return await createUser(data);
    } catch (error) {
        console.error("User syncGoogleUser error:", error);
        throw error;
    }
};

/**
 * ユーザー設定を取得
 */
export const getUserSettings = async (
    userId: string
): Promise<{ settings: PersistedUserSettings; hasStoredSettings: boolean }> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });

        const hasStoredSettings = user?.settings != null;

        return {
            settings: sanitizePersistedUserSettings(user?.settings),
            hasStoredSettings,
        };
    } catch (error) {
        console.error("User getSettings error:", error);
        return {
            settings: sanitizePersistedUserSettings(null),
            hasStoredSettings: false,
        };
    }
};

/**
 * ユーザー設定を更新
 */
export const updateUserSettings = async (
    userId: string,
    patch: Partial<PersistedUserSettings>
) => {
    const current = await getUserSettings(userId);
    const nextSettings = sanitizePersistedUserSettings({
        ...current.settings,
        ...patch,
    });

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                settings: nextSettings as unknown as Prisma.InputJsonValue,
            },
            select: { settings: true },
        });

        return sanitizePersistedUserSettings(user.settings);
    } catch (error) {
        console.error("User updateSettings error:", error);
        throw error;
    }
};

/**
 * メールアドレスでユーザーを検索し、存在しなければ作成
 */
export const findOrCreateUserByEmail = async (data: {
    email: string;
    name?: string;
    googleId: string;
    picture?: string;
}) => {
    const existing = await findUserByEmail(data.email);
    if (existing) {
        return existing;
    }
    return await createUser(data);
};
