import type { LoaderFunction, ActionFunction } from "react-router";
import { getMemos, createMemo, deleteMemo, updateMemo } from "~/features/memos/models/memo.server";
import { getDevUserId } from "~/features/auth/utils/devUser.server";

export const loader: LoaderFunction = async () => {
  try {
    const userId = await getDevUserId();
    const memos = await getMemos(userId);

    // エラーオブジェクトが返された場合の処理
    if (memos && typeof memos === 'object' && 'error' in memos) {
      console.error("API loader error:", memos.error);
      return Response.json({ error: memos.error }, { status: 500 });
    }

    return Response.json(memos);
  } catch (error) {
    console.error("API loader error:", error);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const userId = await getDevUserId();
    const data = await request.json();
    const id = data.id;

    switch (request.method) {
      case 'POST':
        const newMemo = await createMemo(data, userId);
        if (newMemo && typeof newMemo === 'object' && 'error' in newMemo) {
          return Response.json({ error: newMemo.error }, { status: 500 });
        }
        return Response.json(newMemo, { status: 201 });

      case 'PUT':
        if (!id) {
          return Response.json({ error: 'IDが必要です' }, { status: 400 });
        }
        const updatedMemo = await updateMemo(id, data, userId);
        if (updatedMemo && typeof updatedMemo === 'object' && 'error' in updatedMemo) {
          return Response.json({ error: updatedMemo.error }, { status: 500 });
        }
        return Response.json(updatedMemo);

      case 'DELETE':
        if (!id) {
          return Response.json({ error: 'IDが必要です' }, { status: 400 });
        }
        const deleteResult = await deleteMemo(id, userId);
        if (deleteResult && typeof deleteResult === 'object' && 'error' in deleteResult) {
          return Response.json({ error: deleteResult.error }, { status: 500 });
        }
        return Response.json({ message: 'メモを削除しました' });

      default:
        return Response.json({ error: 'メソッドがサポートされていません' }, { status: 405 });
    }
  } catch (error) {
    console.error("API action error:", error);
    if (error instanceof SyntaxError) {
      return Response.json({ error: "無効なJSONデータです" }, { status: 400 });
    }
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};