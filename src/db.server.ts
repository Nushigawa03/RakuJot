import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-expect-error type definition missing
import pg from "pg";

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient | undefined;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 開発環境でのホットリロード対策
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter, log: ['error'] });
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient({ adapter, log: ['error'] });
  }
  prisma = global.__db__;
}

export { prisma };