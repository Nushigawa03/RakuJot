import type { ActionFunctionArgs } from "react-router";
import { aiMemoEditor, aiMemoProcessor } from "~/features/App/services/aiMemoProcessor.server";
import { getTags } from "~/features/memos/models/tag.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

/** AI に送る文字数の上限（サーバーの API キーの使いすぎを防ぐ） */
const MAX_INPUT_LENGTH = 20_000;
const MAX_API_KEY_LENGTH = 200;

/**
 * POST /api/memos/ai
 * - { content }                               → タイトル・タグ・日付を推定
 * - { mode: 'edit', original, instruction }   → 編集指示を適用
 * googleApiKey を渡すとユーザー自身の API キーを使う
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const data = await request.json();
    const rawKey = typeof data?.googleApiKey === "string" ? data.googleApiKey.trim() : "";
    const apiKey = rawKey && rawKey.length <= MAX_API_KEY_LENGTH ? rawKey : undefined;

    if (data?.mode === "edit") {
      const original = String(data.original ?? "");
      const instruction = String(data.instruction ?? "");
      if (!original.trim() && !instruction.trim()) {
        return Response.json({ error: "original and instruction required for edit mode" }, { status: 400 });
      }
      if (original.length + instruction.length > MAX_INPUT_LENGTH) {
        return Response.json({ error: "input too long" }, { status: 413 });
      }
      return Response.json(await aiMemoEditor(original, instruction, await getTags(userId), apiKey));
    }

    const content = String(data?.content ?? "");
    if (!content.trim()) return Response.json({ error: "content required" }, { status: 400 });
    if (content.length > MAX_INPUT_LENGTH) return Response.json({ error: "input too long" }, { status: 413 });
    return Response.json(await aiMemoProcessor(content, await getTags(userId), apiKey));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("AI route error", e);
    return Response.json({ error: "AI processing failed" }, { status: 500 });
  }
};
