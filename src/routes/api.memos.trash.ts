import type { ActionFunctionArgs } from "react-router";
import { permanentlyDeleteMemo, restoreMemo } from "~/features/memos/models/memo.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

/** POST /api/memos/trash — { action: 'restore', originalId } | { action: 'permanent-delete', id } */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id, originalId, action } = await request.json();

    if (action === "restore" || action === "permanent-delete") {
      const target = action === "restore" ? originalId : id;
      if (!target) return Response.json({ error: "IDが必要です" }, { status: 400 });
      const result = action === "restore" ? await restoreMemo(target, userId) : await permanentlyDeleteMemo(target, userId);
      if ("error" in result) return Response.json({ error: result.error }, { status: 500 });
      return Response.json({ message: action === "restore" ? "メモを復元しました" : "メモを完全削除しました" });
    }
    return Response.json({ error: "アクションがサポートされていません" }, { status: 405 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) return Response.json({ error: "無効なJSONデータです" }, { status: 400 });
    console.error("API action error:", error);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};
