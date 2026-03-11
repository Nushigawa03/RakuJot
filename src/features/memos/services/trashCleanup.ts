import { purgeOldTrashedMemos } from '../models/memo.server';

/**
 * ゴミ箱の古いメモを自動削除するクリーンアップスクリプト
 * サーバー起動時や定期的に実行することを想定
 */
export async function runTrashCleanup(days: number = 30, userId: string) {
    console.log(`Running trash cleanup (deleting items older than ${days} days)...`);

    try {
        const result = await purgeOldTrashedMemos(days, userId);

        if (result && 'error' in result) {
            console.error('Trash cleanup failed:', result.error);
            return { success: false, error: result.error };
        }

        if (result && 'count' in result) {
            console.log(`Trash cleanup completed. Deleted ${result.count} items.`);
            return { success: true, count: result.count };
        }

        return { success: true, count: 0 };
    } catch (error) {
        console.error('Trash cleanup error:', error);
        return { success: false, error: error };
    }
}
