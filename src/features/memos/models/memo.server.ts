import prismaPackage from "@prisma/client";
const { PrismaClientInitializationError, PrismaClientKnownRequestError } = prismaPackage;
import { prisma } from "~/db.server";
import { mockMemos, shouldUseMockDatabase } from "./mock/mockData";
import { computeMemoEmbedding } from "~/features/App/services/embeddingService";
import { ensureTags } from "./tag.server";

// Helper function to convert Prisma objects to JSON-serializable format
const serializeMemo = (memo: any) => {
  if (!memo) return memo;
  return {
    ...memo,
    createdAt: memo.createdAt instanceof Date ? memo.createdAt.toISOString() : memo.createdAt,
    updatedAt: memo.updatedAt instanceof Date ? memo.updatedAt.toISOString() : memo.updatedAt,
  };
};

export const getMemo = async (id: string) => {
  try {
    // まずモックデータから検索
    if (shouldUseMockDatabase()) {
      const mockMemo = mockMemos.find(memo => memo.id === id);
      if (mockMemo) {
        return mockMemo;
      }
    }

    // モックデータになければデータベースから取得
  const memo = await prisma.memo.findUnique({ where: { id }, include: { tags: true } });
    return serializeMemo(memo);
  } catch (error) {
    console.error("データベースエラー:", error);
    // データベースエラーの場合、モックデータのみから検索
    if (shouldUseMockDatabase()) {
      const mockMemo = mockMemos.find(memo => memo.id === id);
      return mockMemo || { error: "メモの取得に失敗しました。" };
    }
    return { error: "メモの取得に失敗しました。" };
  } finally {
    await prisma.$disconnect();
  }
};

export const getMemos = async () => {
  try {
    const dbMemos = await prisma.memo.findMany({
      orderBy: { createdAt: "desc" },
      include: { tags: true },
    });

    // モックデータを使用する場合は、データベースのデータにモックデータを追加
    if (shouldUseMockDatabase()) {
      console.log("Adding mock database data to existing memos");
      return [...mockMemos, ...dbMemos.map(serializeMemo)];
    }

    return dbMemos.map(serializeMemo);
  } catch (error) {
    console.error("データベースエラー:", error);
    if (error instanceof PrismaClientInitializationError) {
      // データベース接続エラーの場合は、モックデータのみ返す
      if (shouldUseMockDatabase()) {
        console.log("Database connection failed, using mock data only");
        return mockMemos;
      }
      return { error: "データベースに接続できません。サーバーが起動していることを確認してください。" };
    }
    
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return { error: "同じタイトルのメモが既に存在します。" };
        case 'P2025':
          return { error: "参照先のデータが見つかりません。" };
        default:
          return { error: `データベースエラー: ${error.message}` };
      }
    }
    
    return { error: "メモの取得に失敗しました。" };
  }
};

export const createMemo = async (data: any) => {
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
    const ensuredTags = await ensureTags(data.tags || []);
    const tagsToConnect = ensuredTags.map(t => ({ id: t.id }));

    const newMemo = await prisma.memo.create({
      data: {
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
    // データベースエラーでもモックモードの場合はメモを作成したことにする
    if (shouldUseMockDatabase()) {
      console.log("Database error in mock mode, creating mock memo:", data.title);
      const newMockMemo = {
        id: `mock-${Date.now()}`,
        title: data.title,
        body: data.body || "",
        date: data.date || "",
        tags: data.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return newMockMemo;
    }
    return { error: "メモの作成に失敗しました。" };
  }
};


export const deleteMemo = async (id: string) => {
  try {
    // モックデータのIDの場合は処理をスキップ
    if (shouldUseMockDatabase() && id.startsWith('mock-')) {
      console.log("Mock mode: Skipping deletion of mock memo:", id);
      return { success: true };
    }

    await prisma.memo.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの削除に失敗しました。" };
  }
};

export const updateMemo = async (id: string, data: any) => {
  try {
    // モックデータのIDの場合は処理をスキップ
    if (shouldUseMockDatabase() && id.startsWith('mock-')) {
      console.log("Mock mode: Skipping update of mock memo:", id);
      return;
    }

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
      const ensuredTags = await ensureTags(tags || []);
      const tagsToConnect = ensuredTags.map(t => ({ id: t.id }));

      // メモのタグを置換（原子的に置き換え）
      updateData.tags = {
        set: tagsToConnect,
      };
    }

    // If title, date, or body are being updated, recalculate embedding
    if (updateData.title || updateData.date !== undefined || updateData.body) {
      const existing = await prisma.memo.findUnique({ where: { id } });
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
      prisma.memo.update({
        where: { id },
        data: updateData,
        include: { tags: true },
      }),
    ]);

    // Convert Date fields to ISO strings for JSON serialization
    return serializeMemo(updated);
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