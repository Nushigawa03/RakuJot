import type { ClientLoaderFunctionArgs } from "react-router";

/**
 * オンラインならサーバーで認証を確認し、オフラインなら確認を省略してローカルデータで表示する
 * （IndexedDB にデータがある = 以前ログイン済み）。
 */
export const offlineClientLoader = async ({ serverLoader }: ClientLoaderFunctionArgs) => {
  if (!navigator.onLine) return null;
  try {
    return await serverLoader();
  } catch (error) {
    if (error instanceof Response) throw error; // ログイン画面へのリダイレクトはそのまま
    return null;
  }
};
offlineClientLoader.hydrate = true as const;
