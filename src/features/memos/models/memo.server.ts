import type { Prisma } from "@prisma/client";

import { prisma } from "~/db.server";
import { computeMemoEmbedding } from "~/features/App/services/embeddingService";
import { ensureTags } from "./tag.server";

type PrismaErrorShape = {
  code?: string;
  name?: string;
  message?: string;
};

const isPrismaClientInitializationError = (
  error: unknown
): error is PrismaErrorShape => {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as PrismaErrorShape).name === "PrismaClientInitializationError"
  );
};

const getPrismaKnownRequestErrorCode = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as PrismaErrorShape).name === "PrismaClientKnownRequestError" &&
    "code" in error &&
    typeof (error as PrismaErrorShape).code === "string"
  ) {
    return (error as PrismaErrorShape).code ?? null;
  }

  return null;
};

// Helper function to convert Prisma objects to JSON-serializable format
const serializeMemo = (memo: any) => {
  if (!memo) return memo;
  return {
    ...memo,
    createdAt: memo.createdAt instanceof Date ? memo.createdAt.toISOString() : memo.createdAt,
    updatedAt: memo.updatedAt instanceof Date ? memo.updatedAt.toISOString() : memo.updatedAt,
  };
};

export const getMemo = async (id: string, userId: string) => {
  try {
    const memo = await prisma.memo.findUnique({ where: { id, userId }, include: { tags: true } });
    return serializeMemo(memo);
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの取得に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const getMemos = async (userId: string) => {
  try {
    const dbMemos = await prisma.memo.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { tags: true },
    });

    return dbMemos.map(serializeMemo);
  } catch (error) {
    console.error("データベースエラー:", error);
    if (isPrismaClientInitializationError(error)) {
      return { error: "データベースに接続できません。サーバーが起動していることを確認してください。" };
    }

    const prismaErrorCode = getPrismaKnownRequestErrorCode(error);
    if (prismaErrorCode) {
      switch (prismaErrorCode) {
        case 'P2002':
          return { error: "同じタイトルのメモが既に存在します。" };
        case 'P2025':
          return { error: "参照先のデータが見つかりません。" };
        default:
          return { error: `データベースエラー: ${(error as Error).message}` };
      }
    }

    return { error: "メモの取得に失敗しました。" };
  }
};

export const createMemo = async (data: any, userId: string) => {
  try {
    // サーバー側バリデーション
    const v = validateMemoInput(data, false);
    if (!v.ok) {
      // 開発時に検証エラーの詳細をサーバーログに出す（本番では抑制）
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('validateMemoInput failed (createMemo):', v.errors);
        }
      } catch (e) {
        // 念のためログ出力で例外が起きても処理を続行
        console.error('ログ出力エラー:', e);
      }
      return { error: "入力が無効です。", details: v.errors };
    }

    // タグを確実に存在させ、接続用オブジェクトを作る（ensureTags で責務を分離）
    const ensuredTags = await ensureTags(data.tags || [], userId);
    const tagsToConnect = ensuredTags.map(t => ({ id: t.id }));

    const newMemo = await prisma.memo.create({
      data: {
        userId,
        title: data.title,
        date: data.date || "",
        tags: {
          connect: tagsToConnect,
        },
        body: data.body || "",
        createdAt: new Date().toISOString(),
      },
      include: { tags: true },
    });

    // Compute and store embedding separately
    const embedding = await computeMemoEmbedding({
      title: newMemo.title,
      date: newMemo.date || "",
      body: newMemo.body || "",
    });

    if (embedding) {
      await prisma.memo.update({
        where: { id: newMemo.id },
        data: {
          // @ts-ignore - embedding field exists in schema but not yet in generated types
          embedding: embedding,
        },
      });
    }

    // Convert Date fields to ISO strings for JSON serialization
    return serializeMemo(newMemo);
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの作成に失敗しました。" };
  }
};


export const deleteMemo = async (id: string, userId: string) => {
  try {

    // トランザクションでMemoからTrashedMemoへ移動
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 元のメモを取得（タグ含む）
      const memo = await tx.memo.findFirst({
        where: { id, userId },
        include: { tags: true },
      });

      if (!memo) {
        throw new Error("メモが見つかりません");
      }

      // TrashedMemoに挿入
      await tx.trashedMemo.create({
        data: {
          userId,
          originalId: memo.id,
          title: memo.title,
          date: memo.date,
          tagNames: memo.tags.map(t => t.name),
          body: memo.body,
          embedding: memo.embedding as any,
          createdAt: memo.createdAt instanceof Date ? memo.createdAt.toISOString() : memo.createdAt,
          updatedAt: memo.updatedAt instanceof Date ? memo.updatedAt.toISOString() : memo.updatedAt,
        },
      });

      // 元のメモを削除
      await tx.memo.delete({
        where: { id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの削除に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const getTrashedMemos = async (userId: string) => {
  try {
    const trashedMemos = await prisma.trashedMemo.findMany({
      where: { userId },
      orderBy: { deletedAt: "desc" },
    });
    return trashedMemos;
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "ゴミ箱のメモ取得に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const restoreMemo = async (originalId: string, userId: string) => {
  try {
    // トランザクションでTrashedMemoからMemoへ復元
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // ゴミ箱からメモを取得
      const trashedMemo = await tx.trashedMemo.findFirst({
        where: { originalId, userId },
      });

      if (!trashedMemo) {
        throw new Error("ゴミ箱にメモが見つかりません");
      }

      // タグを確実に存在させる
      const ensuredTags = await ensureTags(trashedMemo.tagNames, userId);
      const tagsToConnect = ensuredTags.map(t => ({ id: t.id }));

      // Memoテーブルに復元（元のIDを使用）
      await tx.memo.create({
        data: {
          id: trashedMemo.originalId,
          userId,
          title: trashedMemo.title,
          date: trashedMemo.date,
          tags: {
            connect: tagsToConnect,
          },
          body: trashedMemo.body,
          embedding: trashedMemo.embedding as any,
          createdAt: trashedMemo.createdAt,
          updatedAt: trashedMemo.updatedAt,
        },
      });

      // ゴミ箱から削除
      await tx.trashedMemo.deleteMany({
        where: { originalId, userId },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの復元に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const permanentlyDeleteMemo = async (id: string, userId: string) => {
  try {
    await prisma.trashedMemo.deleteMany({
      where: { id, userId },
    });
    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの完全削除に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const purgeOldTrashedMemos = async (days: number = 30, userId: string) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.trashedMemo.deleteMany({
      where: {
        userId,
        deletedAt: {
          lt: cutoffDate,
        },
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "古いメモの削除に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const updateMemo = async (id: string, data: any, userId: string) => {
  try {

    // Validate partial input on the original incoming data BEFORE we transform it
    // (e.g. converting tags to Prisma `{ set: [...] }`), otherwise the validator
    // will see non-array structures and fail (tags must be an array).
    const v = validateMemoInput(data, true);
    if (!v.ok) {
      // 開発時に検証エラーの詳細をサーバーログに出す（本番では抑制）
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('validateMemoInput failed (updateMemo):', v.errors);
        }
      } catch (e) {
        console.error('ログ出力エラー:', e);
      }
      return { error: "入力が無効です。", details: v.errors };
    }

    // タグの処理を分離（検証は済んでいるのでここで DB 操作を行う）
    const { tags, ...updateData } = data;

    // タグが指定されている場合の処理
    if (tags !== undefined) {
      // タグを確実に存在させ、接続用オブジェクトを作る（ensureTags で責務を分離）
      const ensuredTags = await ensureTags(tags || [], userId);
      const tagsToConnect = ensuredTags.map(t => ({ id: t.id }));

      // メモのタグを置換（原子的に置き換え）
      updateData.tags = {
        set: tagsToConnect,
      };
    }

    // If title, date, or body are being updated, recalculate embedding
    if (updateData.title || updateData.date !== undefined || updateData.body) {
      const existing = await prisma.memo.findFirst({ where: { id, userId } });
      if (existing) {
        const embedding = await computeMemoEmbedding({
          title: updateData.title || existing.title,
          date: updateData.date !== undefined ? updateData.date : existing.date,
          body: updateData.body || existing.body,
        });
        if (embedding) {
          updateData.embedding = embedding;
        }
      }
    }

    // Apply update in a transaction for atomicity
    const [updated] = await prisma.$transaction([
      prisma.memo.updateMany({
        where: { id, userId },
        data: updateData,
      }),
    ]);

    // Fetch the updated memo with tags
    const updatedMemo = await prisma.memo.findFirst({
      where: { id, userId },
      include: { tags: true },
    });

    if (!updatedMemo) {
      return { error: "メモの更新に失敗しました。" };
    }

    // Convert Date fields to ISO strings for JSON serialization
    return serializeMemo(updatedMemo);
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの更新に失敗しました。" };
  }
};

// Server-side input validation for memo create/update
const validateMemoInput = (data: any, partial = false) => {
  const errors: Record<string, string> = {};

  if (!partial || data.title !== undefined) {
    if (data.title === undefined || typeof data.title !== 'string' || !data.title.trim()) {
      errors.title = 'タイトルは必須です';
    } else if (data.title.length > 200) {
      errors.title = 'タイトルは200文字以内で入力してください';
    }
  }

  if (!partial || data.body !== undefined) {
    if (data.body !== undefined && typeof data.body !== 'string') {
      errors.body = '本文は文字列である必要があります';
    } else if (typeof data.body === 'string' && data.body.length > 10000) {
      errors.body = '本文が長すぎます';
    }
  }

  if (!partial || data.tags !== undefined) {
    if (data.tags !== undefined) {
      // Expect tags to be an array of non-empty strings (string[]).
      if (!Array.isArray(data.tags)) {
        const actualType = data.tags === null ? 'null' : typeof data.tags;
        errors.tags = `tags は文字列の配列 (string[]) である必要があります。現在の型: ${actualType}`;
      } else {
        for (let i = 0; i < data.tags.length; i++) {
          const t = data.tags[i];
          const tType = t === null ? 'null' : typeof t;
          if (typeof t !== 'string' || !t.trim()) {
            errors[`tags[${i}]`] = `タグは空でない文字列である必要があります（現在の型: ${tType}）`;
          } else if (t.length > 100) {
            errors[`tags[${i}]`] = 'タグが長すぎます';
          }
        }
      }
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
};