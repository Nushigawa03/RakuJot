/**
 * POST /api/sync — クライアントのローカル変更を適用し、サーバーの全データを返す
 */
import type { ActionFunctionArgs } from "react-router";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";
import { getRefreshSessionCookieHeader } from "~/features/auth/utils/session.server";
import { applyPendingChanges, loadServerData, parsePendingChanges } from "~/features/sync/sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = await request.json().catch(() => null);
    const pendingChanges = parsePendingChanges(body?.pendingChanges);
    if (!pendingChanges) return Response.json({ error: "同期データの形式が正しくありません" }, { status: 400 });
    const { errors, idMapping } = await applyPendingChanges(pendingChanges, userId);
    const syncedAt = new Date().toISOString();
    const serverData = await loadServerData(userId);

    // セッションの有効期限を延長する（sliding window）
    const refreshCookie = getRefreshSessionCookieHeader(request);
    return Response.json(
      { serverData, errors, idMapping, syncedAt },
      refreshCookie ? { headers: { "Set-Cookie": refreshCookie } } : undefined,
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Sync API error:", error);
    return Response.json({ error: "同期中にエラーが発生しました" }, { status: 500 });
  }
};
