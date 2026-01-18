import { prisma } from "../../../db.server";
import type { TagExpression } from "../types/tagExpressions";

export const getTagExpressions = async (userId: string): Promise<TagExpression[]> => {
  try {
    const dbExpressions = await (prisma as any).tagExpression.findMany({
      where: { userId },
    }) as any[];

    const dbTagExpressions = dbExpressions.map((e: any) => ({
      id: e.id,
      orTerms: e.orTerms as unknown as TagExpression['orTerms'],
      name: e.name ?? undefined,
      color: e.color ?? undefined,
      icon: e.icon ?? undefined,
    }));

    return dbTagExpressions;
  } catch (error) {
    console.error("tagExpressions の取得エラー:", error);
    return [];
  }
};

export const getTagExpression = async (id: string, userId: string): Promise<TagExpression | null> => {
  try {
    const all = await getTagExpressions(userId);
    return all.find(e => e.id === id) || null;
  } catch (error) {
    console.error("tagExpression の取得エラー:", error);
    return null;
  }
};

export const createTagExpression = async (data: { orTerms: TagExpression['orTerms']; name?: string | null; color?: string; icon?: string }, userId: string): Promise<TagExpression> => {
  try {
    const newExpr = await (prisma as any).tagExpression.create({
      data: {
        userId,
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

export const updateTagExpression = async (id: string, data: { name?: string | null; orTerms?: TagExpression['orTerms']; color?: string; icon?: string }, userId: string): Promise<TagExpression> => {
  try {
    const updatedExpr = await (prisma as any).tagExpression.updateMany({
      where: { id, userId },
      data: {
        ...(data.orTerms !== undefined && { orTerms: data.orTerms }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color || null }),
        ...(data.icon !== undefined && { icon: data.icon || null }),
      },
    });

    // Fetch the updated expression
    const expr = await (prisma as any).tagExpression.findFirst({
      where: { id, userId },
    });

    if (!expr) {
      throw new Error("tagExpression が見つかりません");
    }

    return {
      id: expr.id,
      name: expr.name ?? undefined,
      orTerms: expr.orTerms,
      color: expr.color ?? undefined,
      icon: expr.icon ?? undefined,
    };
  } catch (error) {
    console.error("tagExpression の更新エラー:", error);
    throw error;
  }
};

export const deleteTagExpression = async (id: string, userId: string): Promise<void> => {
  try {
    await (prisma as any).tagExpression.deleteMany({ where: { id, userId } });
  } catch (error) {
    console.error("tagExpression の削除エラー:", error);
    throw error;
  }
};