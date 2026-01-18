import { prisma } from "../../../db.server";
import type { Tag } from "../types/tags";
import { normalizeTagName } from "../utils/normalizeTagName";

export const getTags = async (userId: string): Promise<Tag[]> => {
  try {
    const dbTags = await prisma.tag.findMany({
      where: { userId },
    });
    const dbData = dbTags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined
    }));

    return dbData;
  } catch (error) {
    console.error("タグの取得エラー:", error);
    return [];
  }
};

export const getTag = async (id: string, userId: string): Promise<Tag | null> => {
  try {
    const tags = await getTags(userId);
    return tags.find(tag => tag.id === id) || null;
  } catch (error) {
    console.error("タグの取得エラー:", error);
    return null;
  }
};

export const getTagById = async (id: string, userId: string): Promise<string> => {
  try {
    const tag = await getTag(id, userId);
    return tag ? tag.name : id;
  } catch (error) {
    console.error("タグ名の取得エラー:", error);
    return id;
  }
};

export const createTag = async (data: { name: string; description?: string }, userId: string): Promise<Tag> => {
  try {
    const newTag = await prisma.tag.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
      },
    });
    return {
      id: newTag.id,
      name: newTag.name,
      description: newTag.description ?? undefined
    };
  } catch (error) {
    console.error("タグの作成エラー:", error);
    throw error;
  }
};

export const updateTag = async (id: string, data: { name?: string; description?: string }, userId: string): Promise<Tag> => {
  try {
    const updatedTag = await prisma.tag.updateMany({
      where: { id, userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
    });

    // Fetch the updated tag
    const tag = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!tag) {
      throw new Error("タグが見つかりません");
    }

    return {
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined
    };
  } catch (error) {
    console.error("タグの更新エラー:", error);
    throw error;
  }
};

export const deleteTag = async (id: string, userId: string): Promise<void> => {
  try {
    // タグを使用しているメモがないか確認
    const memoCount = await prisma.memo.count({
      where: {
        userId,
        tags: {
          some: { id }
        }
      }
    });

    if (memoCount > 0) {
      throw new Error(`このタグは${memoCount}個のメモで使用されているため削除できません`);
    }

    await prisma.tag.deleteMany({
      where: { id, userId },
    });
  } catch (error) {
    console.error("タグの削除エラー:", error);
    throw error;
  }
};

export const ensureTags = async (names: string[], userId: string): Promise<Tag[]> => {
  if (!names || names.length === 0) return [];

  const uniqueNames = Array.from(new Set(names.map(n => (n || "").trim()).filter(Boolean)));

  // 既存タグを取得して正規化で比較
  const existingTags = await prisma.tag.findMany({
    where: { userId },
  });
  const normalizedExisting = existingTags.map((t) => ({ ...t, _norm: normalizeTagName(t.name) }));

  const toCreate: string[] = [];
  const ensured: Tag[] = [];

  uniqueNames.forEach(name => {
    const norm = normalizeTagName(name);
    const found = normalizedExisting.find((t: any) => t._norm === norm);
    if (found) {
      ensured.push({ id: found.id, name: found.name, description: found.description ?? undefined });
    } else {
      toCreate.push(name);
    }
  });

  if (toCreate.length > 0) {
    // create をトランザクションでまとめる
    const creates = toCreate.map(n => prisma.tag.create({ data: { userId, name: n, description: null } }));
    const created = await prisma.$transaction(creates);
    created.forEach((t: any) => ensured.push({ id: t.id, name: t.name, description: t.description ?? undefined }));
  }

  return ensured;
};
