import { mockCategories, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import type { Category } from "../types/categories";
import { FilterTerm } from "../types/filterTypes";

export const getCategories = async (): Promise<Category[]> => {
  try {
    // データベースからカテゴリを取得
    const dbCategories = await prisma.category.findMany();
    
    const dbData = dbCategories.map(category => ({
      id: category.id,
      name: category.name,
      orTerms: category.orTerms as unknown as FilterTerm[],
      color: category.color ?? undefined,
      icon: category.icon ?? undefined
    }));

    // モックデータを使用する場合は、モックデータとデータベースのデータを両方表示
    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database categories");
      return [...mockCategories, ...dbData];
    }
    
    return dbData;
  } catch (error) {
    console.error("カテゴリの取得エラー:", error);
    // エラー時はモックデータを返す（モック使用時のみ）
    return shouldUseMockDatabase() ? mockCategories : [];
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
