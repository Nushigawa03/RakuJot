import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return json({ error: "タグが見つかりません" }, { status: 404 });
    }

    return json({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined
    });
  } catch (error) {
    console.error("API tag loader error:", error);
    return json({ error: "タグの取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const { id } = params;
    if (!id) {
      return json({ error: "IDが指定されていません" }, { status: 400 });
    }

    switch (request.method) {
      case "PUT":
        const body = await request.json();
        const { name, description } = body;
        const updatedTag = await prisma.tag.update({
          where: { id },
          data: {
            name,
            description: description || null,
          },
        });
        return json({ 
          success: true, 
          tag: {
            id: updatedTag.id,
            name: updatedTag.name,
            description: updatedTag.description ?? undefined
          }
        });

      case "DELETE":
        await prisma.tag.delete({
          where: { id },
        });
        return json({ success: true });

      default:
        return json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("タグ操作エラー:", error);
    return json({ error: "タグの操作に失敗しました" }, { status: 500 });
  }
};
