import type { LoaderFunction, ActionFunction } from "react-router";
import { getFilter, updateFilter, deleteFilter } from "~/features/memos/models/filter.server";
import { getCategory, updateCategory, deleteCategory } from "~/features/memos/models/category.server";

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return Response.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    // カテゴリまたはフィルタを取得
    const category = await getCategory(id);
    if (category) {
      return Response.json(category);
    }

    const filter = await getFilter(id);
    if (filter) {
      return Response.json(filter);
    }

    return Response.json({ error: "tagExpression が見つかりません" }, { status: 404 });
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
      case "PUT": {
        const body = await request.json();
        const { orTerms, name, color, icon } = body;
        
        // 既存の tagExpression を取得してカテゴリかフィルタか判定
        const category = await getCategory(id);
        const isCategory = !!category;
        
        const updated = isCategory
          ? await updateCategory(id, { orTerms, name, color, icon })
          : await updateFilter(id, { orTerms });
        return Response.json({ success: true, tagExpression: updated });
      }

      case "DELETE": {
        // 既存の tagExpression を取得してカテゴリかフィルタか判定
        const category = await getCategory(id);
        const isCategory = !!category;
        
        if (isCategory) {
          await deleteCategory(id);
        } else {
          await deleteFilter(id);
        }
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "サポートされていないメソッドです" }, { status: 405 });
    }
  } catch (error) {
    console.error("tagExpression 操作エラー:", error);
    return Response.json({ error: "tagExpression の操作に失敗しました" }, { status: 500 });
  }
};
