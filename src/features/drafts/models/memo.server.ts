import { PrismaClient } from "@prisma/client";
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { mockMemos, shouldUseMockDatabase } from "./mock/mockData";

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
    const memo = await prisma.memo.findUnique({ where: { id } });
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

    // 常にデータベースに作成を試行
    const newMemo = await prisma.memo.create({
      data: {
        title: data.title,
        date: data.date || "",
        tags: {
          connectOrCreate: (data.tags || []).map((tag: string) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        body: data.body || "",
        createdAt: new Date().toISOString(),
      },
    });

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

    await prisma.memo.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの更新に失敗しました。" };
  }
};