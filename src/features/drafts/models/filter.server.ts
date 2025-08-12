import { mockFilters, shouldUseMockDatabase } from "./mock/mockData";
import type { Filter } from "../stores/filters";

// 将来的にはPrismaClientを使用してデータベースからフィルタを取得
// const prisma = new PrismaClient();

export const getFilters = async (): Promise<Filter[]> => {
  try {
    // 現在はモックデータのみ
    // 将来的にはデータベースからの取得も実装
    if (shouldUseMockDatabase()) {
      console.log("Using mock filters");
      return mockFilters;
    }

    // データベースからフィルタを取得する場合の実装
    // const dbFilters = await prisma.filter.findMany();
    // return dbFilters;
    
    return mockFilters; // 暫定的にモックデータを返す
  } catch (error) {
    console.error("フィルタの取得エラー:", error);
    // エラー時はモックデータを返す
    return mockFilters;
  }
};

export const getFilter = async (id: string): Promise<Filter | null> => {
  try {
    const filters = await getFilters();
    return filters.find(filter => filter.id === id) || null;
  } catch (error) {
    console.error("フィルタの取得エラー:", error);
    return null;
  }
};
