import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getMemos, createMemo, deleteMemo, updateMemo } from "~/features/drafts/models/memo.server";

export const loader: LoaderFunction = async () => {
  const memos = await getMemos();
  return json(memos);
};

export const action: ActionFunction = async ({ request }) => {
  const data = await request.json();
  const id = data.id;
  
  switch (request.method) {
    case 'POST':
      const newMemo = await createMemo(data);
      return json(newMemo);
    case 'PUT':
      const updatedMemo = await updateMemo(id, data);
      return json(updatedMemo);
    case 'DELETE':
      await deleteMemo(id);
      return json({ message: 'メモを削除しました' });
    default:
      return json({ error: 'メソッドがサポートされていません' }, { status: 405 });
  }
};