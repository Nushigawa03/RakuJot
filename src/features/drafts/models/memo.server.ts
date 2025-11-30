import { PrismaClient } from "@prisma/client";
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { mockMemos, shouldUseMockDatabase } from "./mock/mockData";
import { computeMemoEmbedding } from "../services/embeddingService";
import { normalizeTagName } from "../utils/normalizeTagName";

const prisma = new PrismaClient();

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
    return memo;
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
      return [...mockMemos, ...dbMemos];
    }

    return dbMemos;
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
    if (!data.title) {
      return { error: "タイトルが必要です。" };
    }

    // 既存タグ一覧を取得
    const existingTags = await prisma.tag.findMany();
    const normalizedExisting = existingTags.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));
    const tagsToConnect: { name: string }[] = [];
    const tagsToCreate: { name: string }[] = [];
    (data.tags || []).forEach((tagName: string) => {
      const norm = normalizeTagName(tagName);
      const found = normalizedExisting.find(t => t._norm === norm);
      if (found) {
        tagsToConnect.push({ name: found.name });
      } else {
        tagsToCreate.push({ name: tagName });
      }
    });

    const newMemo = await prisma.memo.create({
      data: {
        title: data.title,
        date: data.date || "",
        tags: {
          connect: tagsToConnect,
          create: tagsToCreate,
        },
        body: data.body || "",
        createdAt: new Date().toISOString(),
      },
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

    return newMemo;
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
      return;
    }

    await prisma.memo.delete({
      where: { id },
    });
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

    // If title, date, or body are being updated, recalculate embedding
    if (data.title || data.date || data.body) {
      const existing = await prisma.memo.findUnique({ where: { id } });
      if (existing) {
        const embedding = await computeMemoEmbedding({
          title: data.title || existing.title,
          date: data.date !== undefined ? data.date : existing.date,
          body: data.body || existing.body,
        });
        if (embedding) {
          data = {
            ...data,
            // @ts-ignore - embedding field exists in schema but not yet in generated types
            embedding: embedding,
          };
        }
      }
    }

    await prisma.memo.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの更新に失敗しました。" };
  }
};