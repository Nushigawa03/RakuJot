import type { LoaderFunction, ActionFunction } from "react-router";
import { getTagExpression, updateTagExpression, deleteTagExpression } from "~/features/memos/models/tagExpression.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const expr = await getTagExpression(id);
    if (expr) {
      return Response.json(expr);
    }
    return Response.json({ error: "tagExpression が見つかりません" }, { status: 404 });
  } catch (error) {
    console.error("API tagExpression loader error:", error);
    return Response.json({ error: "tagExpression の取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    switch (request.method) {
      case "PUT": {
        const body = await request.json();
        const { orTerms, name, color, icon } = body;
        const updated = await updateTagExpression(id, { orTerms, name, color, icon });
        return Response.json({ success: true, tagExpression: updated });
      }

      case "DELETE": {
        await deleteTagExpression(id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpression 操作エラー:", error);
    return Response.json({ error: "tagExpression の操作に失敗しました" }, { status: 500 });
  }
};
