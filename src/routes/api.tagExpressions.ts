import type { LoaderFunction, ActionFunction } from "react-router";
import { getTagExpressions, createTagExpression, updateTagExpression, deleteTagExpression } from "~/features/memos/models/tagExpression.server";

export const loader: LoaderFunction = async () => {
  try {
    // フロントは name の有無でフィルタ/カテゴリを振り分けるため、
    // 統合された TagExpression をそのまま返す
    const combined = await getTagExpressions();
    return Response.json(combined);
  } catch (error) {
    console.error("API tagExpressions loader error:", error);
    return Response.json({ error: "tagExpressions の取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    switch (request.method) {
      case "POST": {
        const { orTerms, name, color, icon } = body;
        const newExpr = await createTagExpression({ orTerms, name: name ?? null, color, icon });
        return Response.json({ success: true, tagExpression: newExpr });
      }

      case "PUT": {
        const { id: updateId, orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon } = body;
        const updatedExpr = await updateTagExpression(updateId, { orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon });
        return Response.json({ success: true, tagExpression: updatedExpr });
      }

      case "DELETE": {
        const { id } = body;
        await deleteTagExpression(id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpressions 操作エラー:", error);
    return Response.json({ error: "tagExpressions の操作に失敗しました" }, { status: 500 });
  }
};
