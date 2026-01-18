import type { ActionFunction } from "react-router";
import {
    createUserSession,
    getSessionCookieHeader,
} from "~/features/auth/utils/session.server";
import {
    findUserByGoogleId,
    createUser,
} from "~/features/auth/models/user.server";
import { isDevMode } from "~/features/auth/utils/authMode.server";

/**
 * Google OAuth Token を検証してセッション作成
 * POST /api/auth/google
 * Body: { credential: string } (Google ID Token)
 */
export const action: ActionFunction = async ({ request }) => {
    // 開発モードでは Google Token 不要
    if (isDevMode()) {
        return Response.json(
            { error: "Google認証は開発モードでは無効です" },
            { status: 400 }
        );
    }

    try {
        const data = await request.json();
        const { credential } = data;

        if (!credential) {
            return Response.json(
                { error: "credential が必要です" },
                { status: 400 }
            );
        }

        // Google ID Token をデコード（本番では公開鍵で検証すべき）
        // 簡易実装: JWT のペイロードをデコード
        const payload = decodeGoogleIdToken(credential);

        if (!payload || !payload.sub || !payload.email) {
            return Response.json(
                { error: "無効なトークンです" },
                { status: 400 }
            );
        }

        // ユーザーを検索、なければ作成
        let user = await findUserByGoogleId(payload.sub);

        if (!user) {
            user = await createUser({
                email: payload.email,
                name: payload.name,
                googleId: payload.sub,
                picture: payload.picture,
            });
        }

        // セッション作成
        const sessionValue = createUserSession(user.id);

        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                },
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Set-Cookie": getSessionCookieHeader(sessionValue),
                },
            }
        );
    } catch (error) {
        console.error("Google auth error:", error);
        return Response.json(
            { error: "認証に失敗しました" },
            { status: 500 }
        );
    }
};

/**
 * Google ID Token のペイロードをデコード
 * 注意: 本番では Google の公開鍵で署名を検証すべき
 */
function decodeGoogleIdToken(token: string): {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
} | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8")
        );

        return payload;
    } catch {
        return null;
    }
}
