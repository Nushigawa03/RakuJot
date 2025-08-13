import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }

    return json({
      id: category.id,
      name: category.name,
      orTerms: category.orTerms,
      color: category.color ?? undefined,
      icon: category.icon ?? undefined
    });
  } catch (error) {
    console.error("API category loader error:", error);
    return json({ error: "カテゴリの取得に失敗しました" }, { status: 500 });
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
        const { name, color, icon } = body;
        const updatedCategory = await prisma.category.update({
          where: { id },
          data: {
            name,
            color: color || null,
            icon: icon || null,
          },
        });
        return json({ 
          success: true, 
          category: {
            id: updatedCategory.id,
            name: updatedCategory.name,
            orTerms: updatedCategory.orTerms,
            color: updatedCategory.color ?? undefined,
            icon: updatedCategory.icon ?? undefined
          }
        });

      case "DELETE":
        await prisma.category.delete({
          where: { id },
        });
        return json({ success: true });

      default:
        return json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("カテゴリ操作エラー:", error);
    return json({ error: "カテゴリの操作に失敗しました" }, { status: 500 });
  }
};
