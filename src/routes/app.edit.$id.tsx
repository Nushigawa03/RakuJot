import { useLoaderData, useRouteError, isRouteErrorResponse } from "react-router";
import type { LoaderFunction, ClientLoaderFunctionArgs } from "react-router";
import { getMemo } from "~/features/memos/models/memo.server";
import { getTags } from "~/features/memos/models/tag.server";
import Page from '~/features/memos.edit/components/Page';
import { requireAuthenticatedPageUserId } from "~/features/auth/utils/authMode.server";

// ─── サーバーローダー（SSR / オンライン時） ─────────────
export const loader: LoaderFunction = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    return Response.json({ error: "メモIDが指定されていません。" }, { status: 400 });
  }

  const userId = await requireAuthenticatedPageUserId(request);
  const [memo, availableTags] = await Promise.all([
    getMemo(id, userId),
    getTags(userId)
  ]);

  if (!memo) {
    return Response.json({ error: "メモが見つかりません。" }, { status: 404 });
  }

  return Response.json({ memo, availableTags });
};

// ─── クライアントローダー（オフライン時に IndexedDB から取得） ──
export const clientLoader = async ({ params, serverLoader }: ClientLoaderFunctionArgs) => {
  // オンラインでもまず serverLoader を試し、サーバーにメモがなければ IndexedDB にフォールバック
  if (navigator.onLine) {
    try {
      const data = await serverLoader<{ memo: any; availableTags: any[] }>();
      // サーバーにメモがある場合のみ返す（404 時は { error: "..." } が返り memo は undefined）
      if (data?.memo) {
        return data;
      }
      // サーバーにメモがない → IndexedDB で探す（オフラインで作成されたメモの可能性）
    } catch {
      // サーバー応答失敗 → IndexedDB にフォールバック
    }
  }

  // オフラインまたはサーバー失敗 → IndexedDB から読み込み
  const { getMemo: localGetMemo, getAllTags: localGetAllTags } = await import(
    "~/features/sync/localDb"
  );

  const memo = await localGetMemo(params.id!);
  const allTags = await localGetAllTags();

  if (!memo) {
    throw new Response("メモが見つかりません（オフライン）", { status: 404 });
  }

  // タグIDを {id, name} オブジェクトに変換
  // （useMemoForm は tags: {id, name}[] を期待する）
  const tagIdToObj = new Map(allTags.map(t => [t.id, { id: t.id, name: t.name }]));
  const memoTags = (memo.tags || []).map((tagId: string) =>
    tagIdToObj.get(tagId) || { id: tagId, name: tagId }
  );

  return {
    memo: {
      id: memo.id,
      title: memo.title || '',
      date: memo.date || '',
      tags: memoTags,
      body: memo.body || '',
      embedding: memo.embedding,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
    },
    availableTags: allTags.map((t) => ({ id: t.id, name: t.name })),
  };
};

clientLoader.hydrate = true as const;

// ─── ローディングフォールバック ──────────────────────────
export function HydrateFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>メモを読み込み中...</p>
    </div>
  );
}

// ─── エラーバウンダリ（オフラインでメモが見つからない場合等） ──
export function ErrorBoundary() {
  const error = useRouteError();

  let message = "メモの読み込みに失敗しました。";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "メモが見つかりません。オンラインに接続して同期してください。";
    }
  } else if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      message = "オフラインです。このメモはまだローカルにキャッシュされていません。";
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '1rem', padding: '2rem',
    }}>
      <p style={{ color: '#888', fontSize: '1rem' }}>⚠️ {message}</p>
      <button
        onClick={() => window.history.back()}
        style={{
          padding: '0.5rem 1.5rem', borderRadius: '8px',
          border: '1px solid #ccc', background: 'transparent',
          cursor: 'pointer', fontSize: '0.9rem',
        }}
      >
        ← 戻る
      </button>
    </div>
  );
}

export default function EditMemo() {
  const { memo, availableTags } = useLoaderData() as { memo: any; availableTags: any[] };
  return <Page memo={memo} availableTags={availableTags} />;
}