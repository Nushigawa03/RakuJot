import { mockFilters, mockCategories, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import type { TagExpression } from "../types/filterTypes";

export const getTagExpressions = async (): Promise<TagExpression[]> => {
  try {
    const dbExpressions = await (prisma as any).tagExpression.findMany() as any[];

    const dbTagExpressions = dbExpressions.map((e: any) => ({
      id: e.id,
      orTerms: e.orTerms as unknown as TagExpression['orTerms'],
      name: e.name ?? undefined,
      color: e.color ?? undefined,
      icon: e.icon ?? undefined,
    }));

    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database tagExpressions");
      return ([...mockFilters as unknown as TagExpression[], ...mockCategories as unknown as TagExpression[], ...dbTagExpressions]);
    }

    return dbTagExpressions;
  } catch (error) {
    console.error("tagExpressions の取得エラー:", error);
    return shouldUseMockDatabase() ? ([...mockFilters as unknown as TagExpression[], ...mockCategories as unknown as TagExpression[]]) : [];
  }
};

export const getTagExpression = async (id: string): Promise<TagExpression | null> => {
  try {
    const all = await getTagExpressions();
    return all.find(e => e.id === id) || null;
  } catch (error) {
    console.error("tagExpression の取得エラー:", error);
    return null;
  }
};

export const createTagExpression = async (data: { orTerms: TagExpression['orTerms']; name?: string | null; color?: string; icon?: string }): Promise<TagExpression> => {
  try {
    const newExpr = await (prisma as any).tagExpression.create({
      data: {
        orTerms: data.orTerms || [],
        name: data.name ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
      },
    });
    return {
      id: newExpr.id,
      name: newExpr.name ?? undefined,
      orTerms: newExpr.orTerms,
      color: newExpr.color ?? undefined,
      icon: newExpr.icon ?? undefined,
    };
  } catch (error) {
    console.error("tagExpression の作成エラー:", error);
    throw error;
  }
};

export const updateTagExpression = async (id: string, data: { name?: string | null; orTerms?: TagExpression['orTerms']; color?: string; icon?: string }): Promise<TagExpression> => {
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
      name: updatedExpr.name ?? undefined,
      orTerms: updatedExpr.orTerms,
      color: updatedExpr.color ?? undefined,
      icon: updatedExpr.icon ?? undefined,
    };
  } catch (error) {
    console.error("tagExpression の更新エラー:", error);
    throw error;
  }
};

export const deleteTagExpression = async (id: string): Promise<void> => {
  try {
    await (prisma as any).tagExpression.delete({ where: { id } });
  } catch (error) {
    console.error("tagExpression の削除エラー:", error);
    throw error;
  }
};