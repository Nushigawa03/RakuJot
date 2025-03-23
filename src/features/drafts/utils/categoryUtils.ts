import { categories } from '../stores/categories';
import { getTagNameById } from './tagUtils';

export const getCategoryTags = (categoryId: string): string[] => {
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.tagIds.map(getTagNameById) : [];
};