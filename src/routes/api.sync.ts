/**
 * バルク同期 API エンドポイント
 * POST /api/sync
 *
 * クライアントのローカル変更をサーバーに適用し、
 * サーバーの変更をクライアントに返す。
 */

import type { ActionFunction } from "react-router";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";
import { prisma } from "~/db.server";
import { ensureTags } from "~/features/memos/models/tag.server";
import { computeMemoEmbedding } from "~/features/App/services/embeddingService";

interface SyncRequest {
  lastSyncAt: string | null;
  pendingChanges: {
    memos: PendingMemo[];
    tags: PendingTag[];
    tagExpressions: PendingTagExpression[];
    trashedMemos: PendingTrashedMemo[];
  };
}

interface PendingMemo {
  id: string;
  title: string;
  date?: string;
  tags: string[];       // tag names
  body?: string;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
}

interface PendingTag {
  id: string;
  name: string;
  description?: string;
  _syncStatus: string;
}

interface PendingTagExpression {
  id: string;
  orTerms: any[];
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  _syncStatus: string;
}

interface PendingTrashedMemo {
  id: string;
  originalId: string;
  title: string;
  date?: string | null;
  tagNames: string[];
  body?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  _syncStatus: string;
}

// ─── Helper: メモの日付シリアライズ ───────────────────
const serializeMemo = (memo: any) => ({
  ...memo,
  createdAt: memo.createdAt instanceof Date ? memo.createdAt.toISOString() : memo.createdAt,
  updatedAt: memo.updatedAt instanceof Date ? memo.updatedAt.toISOString() : memo.updatedAt,
  tags: Array.isArray(memo.tags)
    ? memo.tags.map((t: any) => (typeof t === 'string' ? t : t.id))
    : [],
});

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const userId = await requireAuthenticatedUserId(request);
    const body: SyncRequest = await request.json();
    const { lastSyncAt, pendingChanges } = body;

    // ─── 1. クライアントの pending changes をサーバーに適用 ───
    const errors: Array<{ type: string; id: string; error: string }> = [];

    // Memo changes
    for (const memo of pendingChanges.memos) {
      try {
        if (memo._syncStatus === 'pending-create') {
          const ensuredTags = await ensureTags(memo.tags || [], userId);
          const newMemo = await prisma.memo.create({
            data: {
              userId,
              title: memo.title,
              date: memo.date || "",
              tags: { connect: ensuredTags.map(t => ({ id: t.id })) },
              body: memo.body || "",
            },
          });
          // Compute embedding in background (non-blocking)
          computeMemoEmbedding({ title: newMemo.title, date: newMemo.date || "", body: newMemo.body || "" })
            .then(embedding => {
              if (embedding) {
                prisma.memo.update({ where: { id: newMemo.id }, data: { embedding } }).catch(() => { });
              }
            }).catch(() => { });
        } else if (memo._syncStatus === 'pending-update') {
          const existing = await prisma.memo.findFirst({ where: { id: memo.id, userId } });
          if (existing) {
            // Last-Write-Wins: クライアントの updatedAt がサーバーより新しい場合のみ更新
            const serverUpdatedAt = existing.updatedAt instanceof Date
              ? existing.updatedAt.toISOString()
              : existing.updatedAt;
            if (memo.updatedAt >= serverUpdatedAt) {
              const ensuredTags = await ensureTags(memo.tags || [], userId);
              await prisma.memo.update({
                where: { id: memo.id },
                data: {
                  title: memo.title,
                  date: memo.date || "",
                  body: memo.body || "",
                  tags: { set: ensuredTags.map(t => ({ id: t.id })) },
                },
              });
              // Recompute embedding
              computeMemoEmbedding({ title: memo.title, date: memo.date || "", body: memo.body || "" })
                .then(embedding => {
                  if (embedding) {
                    prisma.memo.update({ where: { id: memo.id }, data: { embedding } }).catch(() => { });
                  }
                }).catch(() => { });
            }
          }
        } else if (memo._syncStatus === 'pending-delete') {
          const existing = await prisma.memo.findFirst({
            where: { id: memo.id, userId },
            include: { tags: true },
          });
          if (existing) {
            // ゴミ箱に移動
            await prisma.$transaction(async (tx) => {
              await tx.trashedMemo.create({
                data: {
                  userId,
                  originalId: existing.id,
                  title: existing.title,
                  date: existing.date,
                  tagNames: existing.tags.map((t: any) => t.name),
                  body: existing.body,
                  embedding: existing.embedding as any,
                  createdAt: existing.createdAt instanceof Date ? existing.createdAt.toISOString() : existing.createdAt,
                  updatedAt: existing.updatedAt instanceof Date ? existing.updatedAt.toISOString() : existing.updatedAt,
                },
              });
              await tx.memo.delete({ where: { id: existing.id } });
            });
          }
        }
      } catch (e: any) {
        errors.push({ type: 'memo', id: memo.id, error: e?.message || '不明なエラー' });
      }
    }

    // Tag changes (tags are managed server-side via ensureTags; client can create)
    for (const tag of pendingChanges.tags) {
      try {
        if (tag._syncStatus === 'pending-create') {
          const existing = await prisma.tag.findFirst({ where: { name: tag.name, userId } });
          if (!existing) {
            await prisma.tag.create({
              data: { userId, name: tag.name, description: tag.description || null },
            });
          }
        }
      } catch (e: any) {
        errors.push({ type: 'tag', id: tag.id, error: e?.message || '不明なエラー' });
      }
    }

    // TagExpression changes
    for (const te of pendingChanges.tagExpressions) {
      try {
        if (te._syncStatus === 'pending-create') {
          await prisma.tagExpression.create({
            data: {
              userId,
              orTerms: te.orTerms as any,
              name: te.name || null,
              color: te.color || null,
              icon: te.icon || null,
            },
          });
        } else if (te._syncStatus === 'pending-update') {
          await prisma.tagExpression.updateMany({
            where: { id: te.id, userId },
            data: {
              orTerms: te.orTerms as any,
              name: te.name || null,
              color: te.color || null,
              icon: te.icon || null,
            },
          });
        } else if (te._syncStatus === 'pending-delete') {
          await prisma.tagExpression.deleteMany({
            where: { id: te.id, userId },
          });
        }
      } catch (e: any) {
        errors.push({ type: 'tagExpression', id: te.id, error: e?.message || '不明なエラー' });
      }
    }

    // ─── 2. サーバーの現在のデータを全件取得 ───
    const syncedAt = new Date().toISOString();

    const [serverMemos, serverTags, serverTagExpressions, serverTrashedMemos] = await Promise.all([
      prisma.memo.findMany({
        where: { userId },
        include: { tags: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tag.findMany({ where: { userId } }),
      prisma.tagExpression.findMany({ where: { userId } }),
      prisma.trashedMemo.findMany({
        where: { userId },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

    return Response.json({
      serverData: {
        memos: serverMemos.map(serializeMemo),
        tags: serverTags.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
        })),
        tagExpressions: serverTagExpressions.map((te: any) => ({
          id: te.id,
          orTerms: te.orTerms,
          name: te.name,
          color: te.color,
          icon: te.icon,
          createdAt: te.createdAt instanceof Date ? te.createdAt.toISOString() : te.createdAt,
          updatedAt: te.updatedAt instanceof Date ? te.updatedAt.toISOString() : te.updatedAt,
        })),
        trashedMemos: serverTrashedMemos,
      },
      errors,
      syncedAt,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Sync API error:", error);
    return Response.json({ error: "同期中にエラーが発生しました" }, { status: 500 });
  }
};
