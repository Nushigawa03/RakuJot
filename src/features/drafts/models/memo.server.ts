import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// モックデータ
const mockDatabase = [
  { id: "1", title: "メモ1", date: "2025-03-20", tags: ["仕事", "重要"], createdAt: new Date().toISOString() },
  { id: "2", title: "メモ2", date: "2024-spring", tags: ["プライベート"], createdAt: new Date().toISOString() },
  { id: "3", title: "メモ3", date: "2024", tags: ["アイデア", "TODO"], createdAt: new Date().toISOString() },
  { id: "4", title: "メモ4", date: "", tags: ["仕事"], createdAt: new Date().toISOString() },
  { id: "5", title: "メモ5", date: "2023-winter", tags: ["重要", "アイデア"], createdAt: new Date().toISOString() },
];

export const getMemo = async (id: string) => {
  try {
    const memo = await prisma.memo.findUnique({ where: { id } });
    return memo;
  } catch (error) {
    console.error("データベースエラー:", error);
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

    const useMockDatabase = process.env.USE_MOCK_DATABASE === "true";
    const combinedMemos = useMockDatabase ? [...mockDatabase, ...dbMemos] : dbMemos;

    return combinedMemos;
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの取得に失敗しました。" };
  }
};

export const createMemo = async (data: any) => {
  try {
    if (!data.title) {
      return { error: "タイトルが必要です。" };
    }

    const newMemo = await prisma.memo.create({
      data: {
        title: data.title,
        date: data.date || "",
        tags: {
          connectOrCreate: data.tags.map((tag) => ({
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
    return { error: "メモの作成に失敗しました。" };
  }
};


export const deleteMemo = async (id: string) => {
  try {
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
    await prisma.memo.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("データベースエラー:", error);
    return { error: "メモの更新に失敗しました。" };
  }
};