import { prisma } from "~/db.server";

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
        });
    } catch (error) {
        console.error("User create error:", error);
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
