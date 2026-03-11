import type { LoaderFunction, ActionFunction } from "react-router";
import { getTag, updateTag, deleteTag } from "~/features/memos/models/tag.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const userId = await requireAuthenticatedUserId(request);
    const tag = await getTag(id, userId);

    if (!tag) {
      return Response.json({ error: "タグが見つかりません" }, { status: 404 });
    }

    return Response.json(tag);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("API tag loader error:", error);
    return Response.json({ error: "タグの取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const userId = await requireAuthenticatedUserId(request);

    switch (request.method) {
      case "PUT":
        const body = await request.json();
        const { name, description } = body;
        const updatedTag = await updateTag(id, { name, description }, userId);
        return Response.json({
          success: true,
          tag: updatedTag
        });

      case "DELETE":
        try {
          await deleteTag(id, userId);
          return Response.json({ success: true });
        } catch (error) {
          if (error instanceof Error && error.message.includes("使用されている")) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("タグ操作エラー:", error);
    return Response.json({ error: "タグの操作に失敗しました" }, { status: 500 });
  }
};
