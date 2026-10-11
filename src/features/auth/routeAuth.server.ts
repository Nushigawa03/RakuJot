import type { LoaderFunctionArgs } from "react-router";
import { requireAuthenticatedPageUserId } from "./utils/authMode.server";

/** ページ用ローダー: 未ログインならログイン画面へリダイレクト */
export const requirePageUser = async ({ request }: LoaderFunctionArgs) => {
  await requireAuthenticatedPageUserId(request);
  return null;
};
