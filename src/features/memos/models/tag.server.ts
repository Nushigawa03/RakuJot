import type { Prisma } from "@prisma/client";
import { prisma } from "~/db.server";
import type { Tag } from "../types/tags";
import { normalizeTagName } from "../utils/normalizeTagName";

const toTag = (t: { id: string; name: string; description: string | null }): Tag => ({
  id: t.id,
  name: t.name,
  description: t.description ?? undefined,
});

export const getTags = async (userId: string): Promise<Tag[]> =>
  (await prisma.tag.findMany({ where: { userId } })).map(toTag);

/** タグ名からタグを用意する。表記ゆれ（全角半角・大小文字・空白）は既存タグに寄せ、なければ作成する */
export const ensureTags = async (names: string[], userId: string, db: Prisma.TransactionClient = prisma): Promise<Tag[]> => {
  const unique = [...new Set(names.map((n) => (n || "").trim()).filter(Boolean))];
  if (!unique.length) return [];

  const existing = await db.tag.findMany({ where: { userId } });
  const result: Tag[] = [];
  for (const name of unique) {
    const found = existing.find((t) => normalizeTagName(t.name) === normalizeTagName(name));
    const tag = found ?? (await db.tag.create({ data: { userId, name } }));
    if (!found) existing.push(tag);
    if (!result.some((t) => t.id === tag.id)) result.push(toTag(tag));
  }
  return result;
};
