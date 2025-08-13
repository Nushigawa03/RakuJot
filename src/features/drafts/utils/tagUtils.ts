import type { Tag } from '../types/tags';

// タグデータのキャッシュ
let cachedTags: Tag[] = [];
let isTagsCached = false;

// タグデータをAPIから取得
const fetchTags = async (): Promise<Tag[]> => {
  if (isTagsCached) {
    return cachedTags;
  }

  try {
    const response = await fetch('/api/tags');
    if (response.ok) {
      const tags = await response.json();
      cachedTags = tags;
      isTagsCached = true;
      return tags;
    } else {
      console.error('タグの取得に失敗しました');
      return [];
    }
  } catch (error) {
    console.error('タグの取得エラー:', error);
    return [];
  }
};

export const getTagNameById = (id: string): string => {
  // キャッシュからタグを検索
  const tag = cachedTags.find((tag: Tag) => tag.id === id);
  if (tag) {
    return tag.name;
  }
  
  // IDが見つからない場合、タグNameが誤って渡されていないかチェック
  const matchingTagByName = cachedTags.find((tag: Tag) => tag.name === id);
  if (matchingTagByName) {
    // タグNameが渡されている場合、より明確にエラーを示す
    return `[ERROR: NAME_AS_ID] "${id}" (正しいID: ${matchingTagByName.id})`;
  }
  
  // IDもNameも見つからない場合
  return `[ERROR: UNKNOWN_TAG] "${id}"`;
};

// タグデータを初期化（コンポーネントの初期化時に呼び出し）
export const initializeTags = async (): Promise<void> => {
  await fetchTags();
};