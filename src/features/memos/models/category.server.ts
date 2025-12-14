import { mockCategories, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import type { Category } from "../types/categories";

// 変更点: DB の Category モデルは廃止し、TagExpression を参照して名前付きものをカテゴリとして返す
export const getCategories = async (): Promise<Category[]> => {
  try {
    const dbExpressions = await (prisma as any).tagExpression.findMany() as any[];

    const dbCategories = dbExpressions
      .filter((e: any) => !!e.name) // name があるものをカテゴリとして扱う
      .map((e: any) => ({
        id: e.id,
        name: e.name as string,
        orTerms: e.orTerms as unknown as Category['orTerms'],
        color: e.color ?? undefined,
        icon: e.icon ?? undefined
      }));

    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database categories");
      return [...mockCategories, ...dbCategories];
    }

    return dbCategories;
  } catch (error) {
    console.error("カテゴリの取得エラー:", error);
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
