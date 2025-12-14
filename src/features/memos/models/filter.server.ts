import { mockFilters, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import { FilterBase } from "../types/filterTypes";

// 変更点: DB の Filter モデルは廃止し、TagExpression を参照してフィルタのみ（name がないもの）を返す
export const getFilters = async (): Promise<FilterBase[]> => {
  try {
    const dbExpressions = await (prisma as any).tagExpression.findMany() as any[];

    const dbFilters = dbExpressions
      .filter((e: any) => !e.name) // name がない（匿名）ものをフィルタとして扱う
      .map((e: any) => ({ id: e.id, orTerms: e.orTerms as unknown as FilterBase['orTerms'] }));

    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database filters");
      return [...mockFilters, ...dbFilters];
    }

    return dbFilters;
  } catch (error) {
    console.error("フィルタの取得エラー:", error);
    return shouldUseMockDatabase() ? mockFilters : [];
  }
};

export const getFilter = async (id: string): Promise<FilterBase | null> => {
  try {
    const filters = await getFilters();
    return filters.find(filter => filter.id === id) || null;
  } catch (error) {
    console.error("フィルタの取得エラー:", error);
    return null;
  }
};

export const createFilter = async (data: { orTerms: FilterBase['orTerms'] }): Promise<FilterBase> => {
  try {
    const newExpr = await (prisma as any).tagExpression.create({
      data: {
        orTerms: data.orTerms || [],
        name: null, // フィルタは匿名
      },
    });
    return {
      id: newExpr.id,
      orTerms: newExpr.orTerms
    };
  } catch (error) {
    console.error("フィルタの作成エラー:", error);
    throw error;
  }
};

export const updateFilter = async (id: string, data: { orTerms: FilterBase['orTerms'] }): Promise<FilterBase> => {
  try {
    const updatedExpr = await (prisma as any).tagExpression.update({
      where: { id },
      data: {
        orTerms: data.orTerms,
      },
    });
    return {
      id: updatedExpr.id,
      orTerms: updatedExpr.orTerms
    };
  } catch (error) {
    console.error("フィルタの更新エラー:", error);
    throw error;
  }
};

export const deleteFilter = async (id: string): Promise<void> => {
  try {
    await (prisma as any).tagExpression.delete({
      where: { id },
    });
  } catch (error) {
    console.error("フィルタの削除エラー:", error);
    throw error;
  }
};
