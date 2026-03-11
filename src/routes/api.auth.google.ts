import type { ActionFunction } from "react-router";
import { OAuth2Client } from "google-auth-library";
import {
    createUserSession,
    getSessionCookieHeader,
} from "~/features/auth/utils/session.server";
import {
    syncGoogleUser,
} from "~/features/auth/models/user.server";
import { getGoogleClientId } from "~/features/auth/config/authEnvironment.server";
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
        const googleClientId = getGoogleClientId();

        if (!credential) {
            return Response.json(
                { error: "credential が必要です" },
                { status: 400 }
            );
        }

        if (!googleClientId) {
            return Response.json(
                { error: "Google Client ID が設定されていません" },
                { status: 500 }
            );
        }

        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
            return Response.json(
                { error: "無効なトークンです" },
                { status: 400 }
            );
        }

        const user = await syncGoogleUser({
            email: payload.email,
            name: payload.name ?? undefined,
            googleId: payload.sub,
            picture: payload.picture ?? undefined,
        });

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
