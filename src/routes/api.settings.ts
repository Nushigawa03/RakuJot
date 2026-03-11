import type { ActionFunction, LoaderFunction } from "react-router";
import {
    getUserSettings,
    updateUserSettings,
} from "~/features/auth/models/user.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";
import { sanitizePersistedUserSettingsPatch } from "~/features/settings/settings";

export const loader: LoaderFunction = async ({ request }) => {
    try {
        const userId = await requireAuthenticatedUserId(request);
        const result = await getUserSettings(userId);

        return Response.json(result);
    } catch (error) {
        if (error instanceof Response) {
            return error;
        }

        console.error("Settings loader error:", error);
        return Response.json({ error: "設定の取得に失敗しました" }, { status: 500 });
    }
};

export const action: ActionFunction = async ({ request }) => {
    try {
        const userId = await requireAuthenticatedUserId(request);

        if (request.method !== "PATCH" && request.method !== "PUT") {
            return Response.json(
                { error: "サポートされていないメソッドです" },
                { status: 405 }
            );
        }

        const body = await request.json();
        const patch = sanitizePersistedUserSettingsPatch(body);

        if (!patch || Object.keys(patch).length === 0) {
            return Response.json(
                { error: "有効な設定が指定されていません" },
                { status: 400 }
            );
        }

        const settings = await updateUserSettings(userId, patch);
        return Response.json({ success: true, settings });
    } catch (error) {
        if (error instanceof Response) {
            return error;
        }

        console.error("Settings action error:", error);
        return Response.json({ error: "設定の保存に失敗しました" }, { status: 500 });
    }
};