import { mockTags, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import type { Tag } from "../types/tags";

export const getTags = async (): Promise<Tag[]> => {
  try {
    const dbTags = await prisma.tag.findMany();
    const dbData = dbTags.map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined
    }));

    // モックデータを使用する場合は、モックデータとデータベースのデータを両方表示
    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database tags");
      return [...mockTags, ...dbData];
    }

    return dbData;
  } catch (error) {
    console.error("タグの取得エラー:", error);
    // エラー時はモックデータを返す（モック使用時のみ）
    return shouldUseMockDatabase() ? mockTags : [];
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
