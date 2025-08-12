import { mockCategories, shouldUseMockDatabase } from "./mock/mockData";
import type { Category } from "../stores/categories";

// 将来的にはPrismaClientを使用してデータベースからカテゴリを取得
// const prisma = new PrismaClient();

export const getCategories = async (): Promise<Category[]> => {
  try {
    // 現在はモックデータのみ
    // 将来的にはデータベースからの取得も実装
    if (shouldUseMockDatabase()) {
      console.log("Using mock categories");
      return mockCategories;
    }

    // データベースからカテゴリを取得する場合の実装
    // const dbCategories = await prisma.category.findMany();
    // return dbCategories;
    
    return mockCategories; // 暫定的にモックデータを返す
  } catch (error) {
    console.error("カテゴリの取得エラー:", error);
    // エラー時はモックデータを返す
    return mockCategories;
  }
};

export const getCategory = async (id: string): Promise<Category | null> => {
  try {
    const categories = await getCategories();
    return categories.find(category => category.id === id) || null;
  } catch (error) {
    console.error("カテゴリの取得エラー:", error);
    return null;
  }
};
