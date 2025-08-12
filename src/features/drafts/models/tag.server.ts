import { mockTags, shouldUseMockDatabase } from "./mock/mockData";
import type { Tag } from "../stores/tags";

// 将来的にはPrismaClientを使用してデータベースからタグを取得
// const prisma = new PrismaClient();

export const getTags = async (): Promise<Tag[]> => {
  try {
    // 現在はモックデータのみ
    // 将来的にはデータベースからの取得も実装
    if (shouldUseMockDatabase()) {
      console.log("Using mock tags");
      return mockTags;
    }

    // データベースからタグを取得する場合の実装
    // const dbTags = await prisma.tag.findMany();
    // return dbTags;
    
    return mockTags; // 暫定的にモックデータを返す
  } catch (error) {
    console.error("タグの取得エラー:", error);
    // エラー時はモックデータを返す
    return mockTags;
  }
};

export const getTag = async (id: string): Promise<Tag | null> => {
  try {
    const tags = await getTags();
    return tags.find(tag => tag.id === id) || null;
  } catch (error) {
    console.error("タグの取得エラー:", error);
    return null;
  }
};

export const getTagById = async (id: string): Promise<string> => {
  try {
    const tag = await getTag(id);
    return tag ? tag.name : id;
  } catch (error) {
    console.error("タグ名の取得エラー:", error);
    return id;
  }
};
