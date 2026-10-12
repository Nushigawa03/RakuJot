/**
 * 同期 API のサーバー側処理: クライアントの未同期変更を適用し、サーバーの全データを返す。
 */
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "~/db.server";
import { ensureTags } from "~/features/memos/models/tag.server";
import { moveMemoToTrash, purgeOldTrashedMemos } from "~/features/memos/models/memo.server";

// クライアントから届くデータは信用せず、型と大きさを検証してから DB に書き込む
const status = z.enum(["pending-create", "pending-update", "pending-delete", "synced"]);
const id = z.string().min(1).max(128);
const optionalText = (max: number) => z.string().max(max).nullish();

const pendingMemoSchema = z.object({
  id,
  title: z.string().max(1_000),
  date: optionalText(200),
  tags: z.array(z.string().max(200)).max(200).default([]), // タグ名
  body: optionalText(200_000),
  updatedAt: z.string().max(64),
  _syncStatus: status,
});
const pendingTagSchema = z.object({ id, name: z.string().trim().min(1).max(200), description: optionalText(2_000), _syncStatus: status });
const pendingTagExpressionSchema = z.object({
  id,
  orTerms: z.array(z.object({ include: z.array(id).max(200), exclude: z.array(id).max(200) })).max(100),
  name: optionalText(200),
  color: optionalText(64),
  icon: optionalText(200),
  _syncStatus: status,
});

type PendingMemo = z.infer<typeof pendingMemoSchema>;
type PendingTag = z.infer<typeof pendingTagSchema>;
type PendingTagExpression = z.infer<typeof pendingTagExpressionSchema>;

/** 1回の同期で受け付ける件数の上限（各要素は個別に検証する） */
const pendingChangesSchema = z.object({
  memos: z.array(z.unknown()).max(5_000).optional(),
  tags: z.array(z.unknown()).max(5_000).optional(),
  tagExpressions: z.array(z.unknown()).max(1_000).optional(),
});

export const parsePendingChanges = (value: unknown) => {
  const result = pendingChangesSchema.safeParse(value ?? {});
  return result.success ? result.data : null;
};

export type PendingChanges = NonNullable<ReturnType<typeof parsePendingChanges>>;

/** クライアントにそのまま見せてよいエラー */
class SyncError extends Error {}

const TRASH_RETENTION_DAYS = 30;
const iso = (d: Date | string | null) => (d instanceof Date ? d.toISOString() : d);

async function applyMemo(memo: PendingMemo, userId: string, idMapping: Array<{ localId: string; serverId: string }>) {
  const fields = { title: memo.title, date: memo.date || "", body: memo.body || "" };
  if (memo._syncStatus === "pending-create") {
    const tags = await ensureTags(memo.tags || [], userId);
    const created = await prisma.memo.create({
      data: { ...fields, userId, tags: { connect: tags.map((t) => ({ id: t.id })) } },
    });
    idMapping.push({ localId: memo.id, serverId: created.id });
  } else if (memo._syncStatus === "pending-update") {
    const existing = await prisma.memo.findFirst({ where: { id: memo.id, userId } });
    // Last-Write-Wins: クライアントの方が新しいときだけ更新する
    if (existing && memo.updatedAt >= existing.updatedAt.toISOString()) {
      const tags = await ensureTags(memo.tags || [], userId);
      await prisma.memo.update({ where: { id: memo.id }, data: { ...fields, tags: { set: tags.map((t) => ({ id: t.id })) } } });
    }
  } else if (memo._syncStatus === "pending-delete") {
    await prisma.$transaction((tx) => moveMemoToTrash(tx, memo.id, userId));
  }
}

async function applyTag(tag: PendingTag, userId: string) {
  const data = { name: tag.name, description: tag.description || null };
  if (tag._syncStatus === "pending-create") {
    if (!(await prisma.tag.findFirst({ where: { name: tag.name, userId } }))) {
      await prisma.tag.create({ data: { ...data, id: tag.id, userId } });
    }
  } else if (tag._syncStatus === "pending-update") {
    await prisma.tag.updateMany({ where: { id: tag.id, userId }, data });
  } else if (tag._syncStatus === "pending-delete") {
    const used = await prisma.memo.count({ where: { userId, tags: { some: { id: tag.id } } } });
    if (used > 0) throw new SyncError(`このタグは${used}個のメモで使用されているため削除できません`);
    await prisma.tag.deleteMany({ where: { id: tag.id, userId } });
  }
}

async function applyTagExpression(te: PendingTagExpression, userId: string) {
  const data = { orTerms: te.orTerms as Prisma.InputJsonValue, name: te.name || null, color: te.color || null, icon: te.icon || null };
  if (te._syncStatus === "pending-create") await prisma.tagExpression.create({ data: { ...data, id: te.id, userId } });
  else if (te._syncStatus === "pending-update") await prisma.tagExpression.updateMany({ where: { id: te.id, userId }, data });
  else if (te._syncStatus === "pending-delete") await prisma.tagExpression.deleteMany({ where: { id: te.id, userId } });
}

/** 変更を1件ずつ適用し、失敗したものは errors に記録して続行する */
export async function applyPendingChanges(changes: PendingChanges, userId: string) {
  const errors: Array<{ type: string; id: string; error: string }> = [];
  const idMapping: Array<{ localId: string; serverId: string }> = [];
  const validate = <T>(type: string, schema: z.ZodType<T>, items: unknown[] = []): T[] =>
    items.flatMap((item) => {
      const result = schema.safeParse(item);
      if (result.success) return [result.data];
      const itemId = (item as { id?: unknown } | null)?.id;
      errors.push({ type, id: typeof itemId === "string" ? itemId.slice(0, 128) : "", error: "データの形式が正しくありません" });
      return [];
    });
  const run = async <T extends { id: string }>(type: string, items: T[], apply: (item: T) => Promise<void>) => {
    for (const item of items) {
      try {
        await apply(item);
      } catch (e) {
        // DB エラーの詳細（クエリ内容など）はクライアントに返さずログにだけ残す
        if (!(e instanceof SyncError)) console.error(`Sync ${type} ${item.id} failed:`, e);
        errors.push({ type, id: item.id, error: e instanceof SyncError ? e.message : "保存に失敗しました" });
      }
    }
  };
  // タグの作成・変更 → メモ → タグの削除 の順に適用する
  // （改名後のタグ名でメモを保存しても重複タグを作らず、メモから外したタグは削除できるように）
  const tags = validate("tag", pendingTagSchema, changes.tags);
  await run("tag", tags.filter((t) => t._syncStatus !== "pending-delete"), (t) => applyTag(t, userId));
  await run("memo", validate("memo", pendingMemoSchema, changes.memos), (m) => applyMemo(m, userId, idMapping));
  await run("tag", tags.filter((t) => t._syncStatus === "pending-delete"), (t) => applyTag(t, userId));
  await run("tagExpression", validate("tagExpression", pendingTagExpressionSchema, changes.tagExpressions), (te) => applyTagExpression(te, userId));
  return { errors, idMapping };
}

export async function loadServerData(userId: string) {
  await purgeOldTrashedMemos(TRASH_RETENTION_DAYS, userId).catch((e) => console.error("Trash cleanup failed:", e));
  const [memos, tags, tagExpressions, trashedMemos] = await Promise.all([
    prisma.memo.findMany({ where: { userId }, include: { tags: true }, orderBy: { createdAt: "desc" } }),
    prisma.tag.findMany({ where: { userId } }),
    prisma.tagExpression.findMany({ where: { userId } }),
    prisma.trashedMemo.findMany({ where: { userId }, orderBy: { deletedAt: "desc" } }),
  ]);
  return {
    memos: memos.map((m) => ({ ...m, createdAt: iso(m.createdAt), updatedAt: iso(m.updatedAt), tags: m.tags.map((t) => t.id) })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, description: t.description ?? undefined })),
    tagExpressions: tagExpressions.map((te) => ({
      id: te.id, orTerms: te.orTerms, name: te.name, color: te.color, icon: te.icon,
      createdAt: iso(te.createdAt), updatedAt: iso(te.updatedAt),
    })),
    trashedMemos: trashedMemos.map((tm) => ({ ...tm, deletedAt: iso(tm.deletedAt) })),
  };
}
