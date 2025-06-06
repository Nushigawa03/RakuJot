import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { getMemo } from "~/features/drafts/models/memo.server";
import Page from '~/features/drafts.edit/components/Page';

const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return json({ error: "メモIDが指定されていません。" }, { status: 400 });
  }

  const memo = await getMemo(id);

  if (!memo) {
    return json({ error: "メモが見つかりません。" }, { status: 404 });
  }
  return json(memo);
};

export default function EditMemo() {
  const memo = useLoaderData();
  return <Page memo={memo} />;
}