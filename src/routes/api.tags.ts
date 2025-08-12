import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getTags } from "~/features/drafts/models/tag.server";

export const loader: LoaderFunction = async () => {
  try {
    const tags = await getTags();
    return json(tags);
  } catch (error) {
    console.error("API tags loader error:", error);
    return json({ error: "タグの取得に失敗しました" }, { status: 500 });
  }
};
