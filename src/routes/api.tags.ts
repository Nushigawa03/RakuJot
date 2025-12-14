import type { LoaderFunction, ActionFunction } from "react-router";
import { getTags } from "~/features/memos/models/tag.server";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async () => {
  try {
    const tags = await getTags();
    return Response.json(tags);
  } catch (error) {
    console.error("API tags loader error:", error);
    return Response.json({ error: "タグの取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    switch (request.method) {
      case "POST":
        const { name, description } = body;
        const newTag = await prisma.tag.create({
          data: {
            name,
            description: description || null,
          },
        });
        return Response.json({ 
          success: true, 
          tag: {
            id: newTag.id,
            name: newTag.name,
            description: newTag.description ?? undefined
          }
        });

      case "PUT":
        const { id, ...updateData } = body;
        const updatedTag = await prisma.tag.update({
          where: { id },
          data: updateData,
        });
        return Response.json({ success: true, tag: updatedTag });

      case "DELETE":
        const { id: deleteId } = body;
        // タグを使用しているメモがないか確認
        const memoCount = await prisma.memo.count({
          where: {
            tags: {
              some: { id: deleteId }
            }
          }
        });
        
        if (memoCount > 0) {
          return Response.json({ 
            error: `このタグは${memoCount}個のメモで使用されているため削除できません` 
          }, { status: 400 });
        }
        
        await prisma.tag.delete({
          where: { id: deleteId },
        });
        return Response.json({ success: true });

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("タグ操作エラー:", error);
    return Response.json({ error: "タグの操作に失敗しました" }, { status: 500 });
  }
};
