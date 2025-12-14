import type { Category } from '../types/categories';
import tagExpressionService from '../services/tagExpressionService';

export const getCategoryTags = async (
  categoryId: string,
  getTagNameById: (id: string) => string
): Promise<string[]> => {
  try {
    const { categories } = await tagExpressionService.load();
    const category = categories.find((cat) => cat.id === categoryId);

    if (category?.orTerms) {
      // orTermsの最初のtermのinclude配列をタグIDとして使用
      const tagIds = category.orTerms[0]?.include || [];
      return tagIds.map(getTagNameById);
    }

    return [];
  } catch (error) {
    console.error('Error fetching category tags:', error);
    return [];
  }
};