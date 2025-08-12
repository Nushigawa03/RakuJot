import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getMemos, createMemo, deleteMemo, updateMemo } from "~/features/drafts/models/memo.server";

export const loader: LoaderFunction = async () => {
  try {
    const memos = await getMemos();
    
    // エラーオブジェクトが返された場合の処理
    if (memos && typeof memos === 'object' && 'error' in memos) {
      console.error("API loader error:", memos.error);
      return json({ error: memos.error }, { status: 500 });
    }
    
    return json(memos);
  } catch (error) {
    console.error("API loader error:", error);
    return json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const data = await request.json();
    const id = data.id;
    
    switch (request.method) {
      case 'POST':
        const newMemo = await createMemo(data);
        if (newMemo && typeof newMemo === 'object' && 'error' in newMemo) {
          return json({ error: newMemo.error }, { status: 500 });
        }
        return json(newMemo, { status: 201 });
        
      case 'PUT':
        if (!id) {
          return json({ error: 'IDが必要です' }, { status: 400 });
        }
        const updatedMemo = await updateMemo(id, data);
        if (updatedMemo && typeof updatedMemo === 'object' && 'error' in updatedMemo) {
          return json({ error: updatedMemo.error }, { status: 500 });
        }
        return json(updatedMemo);
        
      case 'DELETE':
        if (!id) {
          return json({ error: 'IDが必要です' }, { status: 400 });
        }
        const deleteResult = await deleteMemo(id);
        if (deleteResult && typeof deleteResult === 'object' && 'error' in deleteResult) {
          return json({ error: deleteResult.error }, { status: 500 });
        }
        return json({ message: 'メモを削除しました' });
        
      default:
        return json({ error: 'メソッドがサポートされていません' }, { status: 405 });
    }
  } catch (error) {
    console.error("API action error:", error);
    if (error instanceof SyntaxError) {
      return json({ error: "無効なJSONデータです" }, { status: 400 });
    }
    return json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};