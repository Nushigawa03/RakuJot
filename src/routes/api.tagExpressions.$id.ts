import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const expr = await (prisma as any).tagExpression.findUnique({
      where: { id },
    });

    if (!expr) {
      return json({ error: "tagExpression が見つかりません" }, { status: 404 });
    }

    return json(expr);
  } catch (error) {
    console.error("API tagExpression loader error:", error);
    return json({ error: "tagExpression の取得に失敗しました" }, { status: 500 });
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
        const { orTerms, name, color, icon } = body;
        const updated = await (prisma as any).tagExpression.update({
          where: { id },
          data: {
            orTerms,
            name: name ?? null,
            color: color || null,
            icon: icon || null,
          },
        });
        return json({ success: true, tagExpression: updated });

      case "DELETE":
        await (prisma as any).tagExpression.delete({
          where: { id },
        });
        return json({ success: true });

      default:
        return json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpression 操作エラー:", error);
    return json({ error: "tagExpression の操作に失敗しました" }, { status: 500 });
  }
};
