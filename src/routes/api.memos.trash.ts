import type { LoaderFunction, ActionFunction } from "react-router";
import { getTrashedMemos, restoreMemo, permanentlyDeleteMemo } from "~/features/memos/models/memo.server";
import { getDevUserId } from "~/features/auth/utils/devUser.server";

export const loader: LoaderFunction = async () => {
    try {
        const userId = await getDevUserId();
        const trashedMemos = await getTrashedMemos(userId);

        // エラーオブジェクトが返された場合の処理
        if (trashedMemos && typeof trashedMemos === 'object' && 'error' in trashedMemos) {
            console.error("API loader error:", trashedMemos.error);
            return Response.json({ error: trashedMemos.error }, { status: 500 });
        }

        return Response.json(trashedMemos);
    } catch (error) {
        console.error("API loader error:", error);
        return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
};

export const action: ActionFunction = async ({ request }) => {
    try {
        const userId = await getDevUserId();
        const data = await request.json();
        const { id, originalId, action: actionType } = data;

        switch (actionType) {
            case 'restore':
                if (!originalId) {
                    return Response.json({ error: 'originalIDが必要です' }, { status: 400 });
                }
                const restoreResult = await restoreMemo(originalId, userId);
                if (restoreResult && typeof restoreResult === 'object' && 'error' in restoreResult) {
                    return Response.json({ error: restoreResult.error }, { status: 500 });
                }
                return Response.json({ message: 'メモを復元しました' });

            case 'permanent-delete':
                if (!id) {
                    return Response.json({ error: 'IDが必要です' }, { status: 400 });
                }
                const deleteResult = await permanentlyDeleteMemo(id, userId);
                if (deleteResult && typeof deleteResult === 'object' && 'error' in deleteResult) {
                    return Response.json({ error: deleteResult.error }, { status: 500 });
                }
                return Response.json({ message: 'メモを完全削除しました' });

            default:
                return Response.json({ error: 'アクションがサポートされていません' }, { status: 405 });
        }
    } catch (error) {
        console.error("API action error:", error);
        if (error instanceof SyntaxError) {
            return Response.json({ error: "無効なJSONデータです" }, { status: 400 });
        }
        return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
};
