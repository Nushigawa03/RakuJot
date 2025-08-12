import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getCategories } from "~/features/drafts/models/category.server";

export const loader: LoaderFunction = async () => {
  try {
    const categories = await getCategories();
    return json(categories);
  } catch (error) {
    console.error("API categories loader error:", error);
    return json({ error: "カテゴリの取得に失敗しました" }, { status: 500 });
  }
};
