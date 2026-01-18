import type { LoaderFunction } from "react-router";
import { getCurrentUser, isDevMode } from "~/features/auth/utils/authMode.server";
import { findUserById } from "~/features/auth/models/user.server";
import { getUserIdFromSession } from "~/features/auth/utils/session.server";
import { getDevUserId } from "~/features/auth/utils/devUser.server";

/**
 * 現在のログインユーザー情報を取得
 * GET /api/auth/me
 */
export const loader: LoaderFunction = async ({ request }) => {
    const devMode = isDevMode();

    if (devMode) {
        // 開発モード: devUser を返す
        const userId = await getDevUserId();
        return Response.json({
            user: {
                id: userId,
                email: "dev@example.com",
                name: "開発ユーザー",
                picture: null,
            },
            isDevMode: true,
        });
    }

    // 本番モード: セッションからユーザー取得
    const userId = getUserIdFromSession(request);
    if (!userId) {
        return Response.json({ user: null, isDevMode: false });
    }

    const user = await findUserById(userId);
    if (!user) {
        return Response.json({ user: null, isDevMode: false });
    }

    return Response.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
        },
        isDevMode: false,
    });
};
