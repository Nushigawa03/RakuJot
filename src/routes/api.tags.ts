import type { LoaderFunction, ActionFunction } from "react-router";
import { getTags, createTag, updateTag, deleteTag } from "~/features/memos/models/tag.server";
import { getDevUserId } from "~/features/auth/utils/devUser.server";

export const loader: LoaderFunction = async () => {
  try {
    const userId = await getDevUserId();
    const tags = await getTags(userId);
    return Response.json(tags);
  } catch (error) {
    console.error("API tags loader error:", error);
    return Response.json({ error: "タグの取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const userId = await getDevUserId();
    const body = await request.json();

    switch (request.method) {
      case "POST":
        const { name, description } = body;
        const newTag = await createTag({ name, description }, userId);
        return Response.json({
          success: true,
          tag: newTag
        });

      case "PUT":
        const { id, ...updateData } = body;
        const updatedTag = await updateTag(id, updateData, userId);
        return Response.json({ success: true, tag: updatedTag });

      case "DELETE":
        const { id: deleteId } = body;
        try {
          await deleteTag(deleteId, userId);
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
    console.error("タグ操作エラー:", error);
    return Response.json({ error: "タグの操作に失敗しました" }, { status: 500 });
  }
};
