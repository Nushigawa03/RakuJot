import { tags } from '../stores/tags';

export const getTagNameById = (id: string): string => {
  const tag = tags.find((tag) => tag.id === id);
  return tag ? tag.name : '不明なタグ';
};