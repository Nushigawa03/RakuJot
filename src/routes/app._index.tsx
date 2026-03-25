import type { LoaderFunction, ClientLoaderFunctionArgs } from "react-router";
import { requireAuthenticatedPageUserId } from "~/features/auth/utils/authMode.server";
import Page from "~/features/memos/components/Page";

// ─── サーバーローダー（SSR / オンライン時） ─────────────
export const loader: LoaderFunction = async ({ request }) => {
	await requireAuthenticatedPageUserId(request);
	return null;
};

// ─── クライアントローダー（オフライン時に認証をスキップ） ──
export const clientLoader = async ({ serverLoader }: ClientLoaderFunctionArgs) => {
	if (navigator.onLine) {
		try {
			return await serverLoader();
		} catch {
			// サーバー失敗 → オフラインフォールバック
		}
	}

	// オフライン時: 認証チェックをスキップしてローカルデータで表示
	// (IndexedDB にデータがある = 以前ログイン済み)
	return null;
};

clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
			<p style={{ color: '#888', fontSize: '0.9rem' }}>読み込み中...</p>
		</div>
	);
}

export default Page;