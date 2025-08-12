import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getFilters } from "~/features/drafts/models/filter.server";

export const loader: LoaderFunction = async () => {
  try {
    const filters = await getFilters();
    return json(filters);
  } catch (error) {
    console.error("API filters loader error:", error);
    return json({ error: "フィルタの取得に失敗しました" }, { status: 500 });
  }
};
