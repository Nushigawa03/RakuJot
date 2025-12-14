import type { LoaderFunction, ActionFunction } from "react-router";
import { getFilters, createFilter, updateFilter, deleteFilter } from "~/features/memos/models/filter.server";
import { getCategories, createCategory, updateCategory, deleteCategory } from "~/features/memos/models/category.server";

export const loader: LoaderFunction = async () => {
  try {
    // フロントは name の有無でフィルタ/カテゴリを振り分けるため、
    // 匿名の TagExpression (filters) と名前付きの TagExpression (categories) を両方返す
    const [filters, categories] = await Promise.all([getFilters(), getCategories()]);
    const combined = [...filters, ...categories];
    return Response.json(combined);
  } catch (error) {
    console.error("API tagExpressions loader error:", error);
    return Response.json({ error: "tagExpressions の取得に失敗しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();

    switch (request.method) {
      case "POST": {
        const { orTerms, name, color, icon } = body;
        // name が与えられていたらカテゴリ扱い、無ければ匿名 filter
        const newExpr = name 
          ? await createCategory({ orTerms, name, color, icon })
          : await createFilter({ orTerms });
        return Response.json({ success: true, tagExpression: newExpr });
      }

      case "PUT": {
        const { id: updateId, orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon } = body;
        // 既存の tagExpression を取得してカテゴリかフィルタか判定
        const combined = [...await getFilters(), ...await getCategories()];
        const existing = combined.find(e => e.id === updateId);
        const isCategory = existing && 'name' in existing && existing.name;
        
        const updatedExpr = isCategory
          ? await updateCategory(updateId, { orTerms: updateOrTerms, name: updateName, color: updateColor, icon: updateIcon })
          : await updateFilter(updateId, { orTerms: updateOrTerms });
        return Response.json({ success: true, tagExpression: updatedExpr });
      }

      case "DELETE": {
        const { id } = body;
        // 既存の tagExpression を取得してカテゴリかフィルタか判定
        const combined = [...await getFilters(), ...await getCategories()];
        const existing = combined.find(e => e.id === id);
        const isCategory = existing && 'name' in existing && existing.name;
        
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
    console.error("tagExpressions 操作エラー:", error);
    return Response.json({ error: "tagExpressions の操作に失敗しました" }, { status: 500 });
  }
};
