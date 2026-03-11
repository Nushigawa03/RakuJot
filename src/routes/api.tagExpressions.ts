import type { LoaderFunction, ActionFunction } from "react-router";
import { getTagExpressions, createTagExpression, updateTagExpression, deleteTagExpression } from "~/features/memos/models/tagExpression.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const userId = await requireAuthenticatedUserId(request);
    // フロントは name の有無でフィルタ/カテゴリを振り分けるため、
    // 統合された TagExpression をそのまま返す
    const combined = await getTagExpressions(userId);
    return Response.json(combined);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("API tagExpressions loader error:", error);
    return Response.json({ error: "tagExpressions の取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = await request.json();

    switch (request.method) {
      case "POST": {
        const { orTerms, name, color, icon } = body;
        const newExpr = await createTagExpression({ orTerms, name: name ?? null, color, icon }, userId);
        return Response.json({ success: true, tagExpression: newExpr });
      }

      case "PUT": {
        const { id: updateId, orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon } = body;
        const updatedExpr = await updateTagExpression(updateId, { orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon }, userId);
        return Response.json({ success: true, tagExpression: updatedExpr });
      }

      case "DELETE": {
        const { id } = body;
        await deleteTagExpression(id, userId);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("tagExpressions 操作エラー:", error);
    return Response.json({ error: "tagExpressions の操作に失敗しました" }, { status: 500 });
  }
};
