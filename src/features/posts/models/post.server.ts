import { prisma } from "~/db.server";
import type { Post, CreatePostDTO } from "../types/post";

export async function getPosts() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function createPost(data: CreatePostDTO, userId: string) {
  return prisma.post.create({
    data: {
      ...data,
      authorId: userId
    }
  });
}