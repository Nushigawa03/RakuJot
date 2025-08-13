import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getCategories } from "~/features/drafts/models/category.server";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async () => {
  try {
    const categories = await getCategories();
    return json(categories);
  } catch (error) {
    console.error("API categories loader error:", error);
    return json({ error: "カテゴリの取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    switch (request.method) {
      case "POST":
        const { name, orTerms, color, icon } = body;
        const newCategory = await prisma.category.create({
          data: {
            name,
            orTerms: orTerms || [],
            color: color || null,
            icon: icon || null,
          },
        });
        return json({ 
          success: true, 
          category: {
            id: newCategory.id,
            name: newCategory.name,
            orTerms: newCategory.orTerms,
            color: newCategory.color ?? undefined,
            icon: newCategory.icon ?? undefined
          }
        });

      case "PUT":
        const { id, ...updateData } = body;
        const updatedCategory = await prisma.category.update({
          where: { id },
          data: updateData,
        });
        return json({ success: true, category: updatedCategory });

      case "DELETE":
        const { id: deleteId } = body;
        await prisma.category.delete({
          where: { id: deleteId },
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
