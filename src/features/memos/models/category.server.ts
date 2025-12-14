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

export const createCategory = async (data: { name: string; orTerms: Category['orTerms']; color?: string; icon?: string }): Promise<Category> => {
  try {
    const newExpr = await (prisma as any).tagExpression.create({
      data: {
        orTerms: data.orTerms || [],
        name: data.name,
        color: data.color || null,
        icon: data.icon || null,
      },
    });
    return {
      id: newExpr.id,
      name: newExpr.name,
      orTerms: newExpr.orTerms,
      color: newExpr.color ?? undefined,
      icon: newExpr.icon ?? undefined
    };
  } catch (error) {
    console.error("カテゴリの作成エラー:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, data: { name?: string; orTerms?: Category['orTerms']; color?: string; icon?: string }): Promise<Category> => {
  try {
    const updatedExpr = await (prisma as any).tagExpression.update({
      where: { id },
      data: {
        ...(data.orTerms !== undefined && { orTerms: data.orTerms }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color || null }),
        ...(data.icon !== undefined && { icon: data.icon || null }),
      },
    });
    return {
      id: updatedExpr.id,
      name: updatedExpr.name,
      orTerms: updatedExpr.orTerms,
      color: updatedExpr.color ?? undefined,
      icon: updatedExpr.icon ?? undefined
    };
  } catch (error) {
    console.error("カテゴリの更新エラー:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await (prisma as any).tagExpression.delete({
      where: { id },
    });
  } catch (error) {
    console.error("カテゴリの削除エラー:", error);
    throw error;
  }
};
