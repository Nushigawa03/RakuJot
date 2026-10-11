import type { Prisma } from "@prisma/client";
import { prisma } from "~/db.server";
import { ensureTags } from "./tag.server";

type Tx = Prisma.TransactionClient;
const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

/** メモをゴミ箱（TrashedMemo）へ移す */
export const moveMemoToTrash = async (tx: Tx, id: string, userId: string) => {
  const memo = await tx.memo.findFirst({ where: { id, userId }, include: { tags: true } });
  if (!memo) return;
  await tx.trashedMemo.create({
    data: {
      userId,
      originalId: memo.id,
      title: memo.title,
      date: memo.date,
      tagNames: memo.tags.map((t) => t.name),
      body: memo.body,
      embedding: memo.embedding ?? undefined,
      createdAt: iso(memo.createdAt),
      updatedAt: iso(memo.updatedAt),
    },
  });
  await tx.memo.delete({ where: { id: memo.id } });
};

/** ゴミ箱から元の ID で復元する */
export const restoreMemo = async (originalId: string, userId: string) => {
  try {
    await prisma.$transaction(async (tx) => {
      const trashed = await tx.trashedMemo.findFirst({ where: { originalId, userId } });
      if (!trashed) throw new Error("ゴミ箱にメモが見つかりません");
      const tags = await ensureTags(trashed.tagNames, userId, tx);
      await tx.memo.create({
        data: {
          id: trashed.originalId,
          userId,
          title: trashed.title,
          date: trashed.date,
          tags: { connect: tags.map((t) => ({ id: t.id })) },
          body: trashed.body,
          embedding: trashed.embedding ?? undefined,
          createdAt: trashed.createdAt,
          updatedAt: trashed.updatedAt,
        },
      });
      await tx.trashedMemo.deleteMany({ where: { originalId, userId } });
    });
    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの復元に失敗しました。" };
  }
};

export const permanentlyDeleteMemo = async (id: string, userId: string) => {
  try {
    await prisma.trashedMemo.deleteMany({ where: { id, userId } });
    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの完全削除に失敗しました。" };
  }
};

/** 保持期限を過ぎたゴミ箱のメモを削除する */
export const purgeOldTrashedMemos = (days: number, userId: string) =>
  prisma.trashedMemo.deleteMany({ where: { userId, deletedAt: { lt: new Date(Date.now() - days * 86_400_000) } } });
