import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { getMemo } from "~/features/drafts/models/memo.server";
import { getTags } from "~/features/drafts/models/tag.server";
import Page from '~/features/drafts.edit/components/Page';

const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return json({ error: "メモIDが指定されていません。" }, { status: 400 });
  }

  const [memo, availableTags] = await Promise.all([
    getMemo(id),
    getTags()
  ]);

  if (!memo) {
    return json({ error: "メモが見つかりません。" }, { status: 404 });
  }
  
  return json({ memo, availableTags });
};

export default function EditMemo() {
  const { memo, availableTags } = useLoaderData() as { memo: any; availableTags: any[] };
  return <Page memo={memo} availableTags={availableTags} />;
}