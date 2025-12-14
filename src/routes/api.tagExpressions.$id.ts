import type { LoaderFunction, ActionFunction } from "react-router";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const expr = await (prisma as any).tagExpression.findUnique({
      where: { id },
    });

    if (!expr) {
      return Response.json({ error: "tagExpression が見つかりません" }, { status: 404 });
    }

    return Response.json(expr);
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
        return Response.json({ success: true, tagExpression: updated });

      case "DELETE":
        await (prisma as any).tagExpression.delete({
          where: { id },
        });
        return Response.json({ success: true });

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpression 操作エラー:", error);
    return Response.json({ error: "tagExpression の操作に失敗しました" }, { status: 500 });
  }
};
