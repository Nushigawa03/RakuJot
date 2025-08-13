import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return json({ error: "IDが指定されていません" }, { status: 400 });
    }

    const filter = await prisma.filter.findUnique({
      where: { id },
    });

    if (!filter) {
      return json({ error: "フィルタが見つかりません" }, { status: 404 });
    }

    return json(filter);
  } catch (error) {
    console.error("API filter loader error:", error);
    return json({ error: "フィルタの取得に失敗しました" }, { status: 500 });
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
        const { orTerms } = body;
        const updatedFilter = await prisma.filter.update({
          where: { id },
          data: {
            orTerms: orTerms,
          },
        });
        return json({ success: true, filter: updatedFilter });

      case "DELETE":
        await prisma.filter.delete({
          where: { id },
        });
        return json({ success: true });

      default:
        return json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("フィルタ操作エラー:", error);
    return json({ error: "フィルタの操作に失敗しました" }, { status: 500 });
  }
};
