import { useLoaderData } from "react-router";
import type { LoaderFunction } from "react-router";
import { getMemo } from "~/features/drafts/models/memo.server";
import { getTags } from "~/features/drafts/models/tag.server";
import Page from '~/features/drafts.edit/components/Page';

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return Response.json({ error: "メモIDが指定されていません。" }, { status: 400 });
  }

  const [memo, availableTags] = await Promise.all([
    getMemo(id),
    getTags()
  ]);

  if (!memo) {
    return Response.json({ error: "メモが見つかりません。" }, { status: 404 });
  }
  
  return Response.json({ memo, availableTags });
};

export default function EditMemo() {
  const { memo, availableTags } = useLoaderData() as { memo: any; availableTags: any[] };
  return <Page memo={memo} availableTags={availableTags} />;
}