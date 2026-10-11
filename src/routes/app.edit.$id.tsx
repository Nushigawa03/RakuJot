import { isRouteErrorResponse, useLoaderData, useRouteError, type ClientLoaderFunctionArgs } from "react-router";
import { Loading } from "~/components";
import EditPage, { type EditableMemo } from "~/features/memos.edit/EditPage";
import { requirePageUser } from "~/features/auth/routeAuth.server";

export const loader = requirePageUser;

/** ローカル DB から開く。見つからなければ一度同期してから探す（オフラインでは 404） */
export const clientLoader = async ({ params }: ClientLoaderFunctionArgs): Promise<{ memo: EditableMemo }> => {
  const { getMemo, getAllTags, getCanonicalMemoId } = await import("~/features/sync/localDb");
  const find = async () => getMemo(await getCanonicalMemoId(params.id!));

  let memo = await find();
  if (!memo && navigator.onLine) {
    const { performSync } = await import("~/features/sync/syncService");
    await performSync().catch(console.error);
    memo = await find();
  }
  if (!memo || memo._syncStatus === "pending-delete") throw new Response("メモが見つかりません", { status: 404 });

  const names = new Map((await getAllTags()).map((t) => [t.id, t.name]));
  return {
    memo: {
      id: memo.id,
      title: memo.title || "",
      date: memo.date || "",
      body: memo.body || "",
      tags: memo.tags.map((id) => names.get(id) ?? id),
    },
  };
};
clientLoader.hydrate = true as const;

export const HydrateFallback = () => <Loading message="メモを読み込み中..." />;

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) && error.status === 404
    ? typeof navigator === "undefined" || navigator.onLine ? "メモが見つかりません。" : "オフラインです。このメモはまだこの端末に保存されていません。"
    : "メモの読み込みに失敗しました。";
  return (
    <div className="loading">
      <p>⚠️ {message}</p>
      <button type="button" className="btn btn--secondary" onClick={() => window.history.back()}>← 戻る</button>
    </div>
  );
}

export default function EditMemoRoute() {
  const { memo } = useLoaderData<typeof clientLoader>();
  return <EditPage memo={memo} />;
}
