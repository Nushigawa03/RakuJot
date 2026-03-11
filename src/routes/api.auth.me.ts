import type { LoaderFunction } from "react-router";
import { getCurrentUser } from "~/features/auth/utils/authMode.server";

/**
 * 現在のログインユーザー情報を取得
 * GET /api/auth/me
 */
export const loader: LoaderFunction = async ({ request }) => {
    const user = await getCurrentUser(request);

    return Response.json({
        user: user
            ? {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  picture: user.picture,
              }
            : null,
        isDevMode: user?.isDevMode ?? false,
    });
};
