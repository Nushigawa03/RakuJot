import type { ActionFunction } from "react-router";
import { getLogoutCookieHeader } from "~/features/auth/utils/session.server";
import { assertSameOrigin } from "~/features/auth/utils/requestGuard.server";

/**
 * ログアウト
 * POST /api/auth/logout
 */
export const action: ActionFunction = async ({ request }) => {
    assertSameOrigin(request);
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": getLogoutCookieHeader(),
        },
    });
};
