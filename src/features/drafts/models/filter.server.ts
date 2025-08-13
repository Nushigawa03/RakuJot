import { mockFilters, shouldUseMockDatabase } from "./mock/mockData";
import { prisma } from "../../../db.server";
import { FilterBase, FilterTerm } from "../types/filterTypes";

export const getFilters = async (): Promise<FilterBase[]> => {
  try {
    // データベースからフィルタを取得
    const dbFilters = await prisma.filter.findMany();
    
    const dbData = dbFilters.map(filter => ({
      id: filter.id,
      orTerms: filter.orTerms as unknown as FilterTerm[]
    }));

    // モックデータを使用する場合は、モックデータとデータベースのデータを両方表示
    if (shouldUseMockDatabase()) {
      console.log("Using both mock and database filters");
      return [...mockFilters, ...dbData];
    }

    return dbData;
  } catch (error) {
    console.error("フィルタの取得エラー:", error);
    // エラー時はモックデータを返す（モック使用時のみ）
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
