import type { ActionFunction } from "react-router";
import { parseSearchQuery } from "~/features/memos/services/searchParser.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json();
  const text = (body?.text || "").toString();

  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  const result = await parseSearchQuery(text);
  return Response.json(result);
};
