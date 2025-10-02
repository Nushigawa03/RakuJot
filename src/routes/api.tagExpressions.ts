import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getFilters } from "~/features/drafts/models/filter.server";
import { getCategories } from "~/features/drafts/models/category.server";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async () => {
  try {
    // フロントは name の有無でフィルタ/カテゴリを振り分けるため、
    // 匿名の TagExpression (filters) と名前付きの TagExpression (categories) を両方返す
    const [filters, categories] = await Promise.all([getFilters(), getCategories()]);
    const combined = [...filters, ...categories];
    return json(combined);
  } catch (error) {
    console.error("API tagExpressions loader error:", error);
    return json({ error: "tagExpressions の取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    switch (request.method) {
      case "POST":
        const { orTerms, name, color, icon } = body;
        // name が与えられていたらカテゴリ扱い、無ければ匿名 filter
        const newExpr = await (prisma as any).tagExpression.create({
          data: {
            orTerms: orTerms || [],
            name: name ?? null,
            color: color || null,
            icon: icon || null,
          },
        });
        return json({ success: true, tagExpression: newExpr });

      case "PUT":
        const { id: updateId, orTerms: updateOrTerms } = body;
        const updatedExpr = await (prisma as any).tagExpression.update({
          where: { id: updateId },
          data: {
            orTerms: updateOrTerms,
          },
        });
        return json({ success: true, tagExpression: updatedExpr });

      case "DELETE":
        const { id } = body;
        await (prisma as any).tagExpression.delete({
          where: { id },
        });
        return json({ success: true });

      default:
        return json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpressions 操作エラー:", error);
    return json({ error: "tagExpressions の操作に失敗しました" }, { status: 500 });
  }
};
