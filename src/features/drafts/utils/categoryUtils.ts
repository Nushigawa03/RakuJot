import type { Category } from '../stores/categories';

export const getCategoryTags = async (
  categoryId: string, 
  getTagNameById: (id: string) => string
): Promise<string[]> => {
  try {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const categories: Category[] = await response.json();
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