import type { Prisma } from "@prisma/client";
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
        return await prisma.user.findFirst({
            where: { email },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User findByEmail error:", error);
        return null;
    }
};

/**
 * 外部アカウントでユーザーを検索
 */
export const findUserByAccount = async (
    provider: string,
    providerAccountId: string
) => {
    try {
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
            select: {
                user: {
                    select: CORE_USER_SELECT,
                },
            },
        });
        return account?.user ?? null;
    } catch (error) {
        console.error("User findByAccount error:", error);
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
    email?: string | null;
    name?: string;
    picture?: string;
}) => {
    try {
        return await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
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
 * 外部ログイン用にユーザーとアカウントを同期
 */
export const syncExternalAccount = async (data: {
    provider: string;
    providerAccountId: string;
    email?: string | null;
    emailVerified?: boolean;
    name?: string;
    picture?: string | null;
}) => {
    try {
        const profileData = {
            email: data.email ?? null,
            name: data.name,
            picture: data.picture ?? null,
        };

        const existingAccount = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: data.provider,
                    providerAccountId: data.providerAccountId,
                },
            },
            select: { id: true, userId: true },
        });

        if (existingAccount) {
            await prisma.account.update({
                where: { id: existingAccount.id },
                data: {
                    email: data.email ?? null,
                    emailVerified: data.emailVerified ?? false,
                    name: data.name,
                    picture: data.picture ?? null,
                },
            });

            return await prisma.user.update({
                where: { id: existingAccount.userId },
                data: profileData,
                select: CORE_USER_SELECT,
            });
        }

        return await prisma.user.create({
            data: {
                ...profileData,
                accounts: {
                    create: {
                        provider: data.provider,
                        providerAccountId: data.providerAccountId,
                        email: data.email ?? null,
                        emailVerified: data.emailVerified ?? false,
                        name: data.name,
                        picture: data.picture ?? null,
                    },
                },
            },
            select: CORE_USER_SELECT,
        });
    } catch (error) {
        console.error("User syncExternalAccount error:", error);
        throw error;
    }
};

/**
 * Google ログイン用にユーザーと Google アカウントを同期
 */
export const syncGoogleUser = async (data: {
    email: string;
    name?: string;
    googleId: string;
    picture?: string;
}) => {
    return syncExternalAccount({
        provider: "google",
        providerAccountId: data.googleId,
        email: data.email,
        emailVerified: true,
        name: data.name,
        picture: data.picture,
    });
};

/**
 * 開発モード用アカウントを同期
 */
export const syncDevUser = async (data: {
    email: string;
    name?: string;
    accountId: string;
    picture?: string | null;
}) => {
    const existingDevAccount = await findUserByAccount("dev", data.accountId);
    if (existingDevAccount) {
        return syncExternalAccount({
            provider: "dev",
            providerAccountId: data.accountId,
            email: data.email,
            emailVerified: true,
            name: data.name,
            picture: data.picture,
        });
    }

    const existingByEmail = await findUserByEmail(data.email);
    if (existingByEmail) {
        await prisma.account.create({
            data: {
                userId: existingByEmail.id,
                provider: "dev",
                providerAccountId: data.accountId,
                email: data.email,
                emailVerified: true,
                name: data.name,
                picture: data.picture ?? null,
            },
        });

        return await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
                email: data.email,
                name: data.name,
                picture: data.picture ?? null,
            },
            select: CORE_USER_SELECT,
        });
    }

    return syncExternalAccount({
        provider: "dev",
        providerAccountId: data.accountId,
        email: data.email,
        emailVerified: true,
        name: data.name,
        picture: data.picture,
    });
};

/**
 * 指定メールのユーザーを検索し、存在しなければプロフィールのみのユーザーを作成
 */
export const findOrCreateUserByEmail = async (data: {
    email: string;
    name?: string;
    picture?: string;
}) => {
    const existing = await findUserByEmail(data.email);
    if (existing) {
        return existing;
    }
    return await createUser(data);
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

