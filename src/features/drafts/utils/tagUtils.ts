import type { Tag } from '../stores/tags';

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
  
  return id; // 見つからない場合はIDをそのまま返す
};

// タグデータを初期化（コンポーネントの初期化時に呼び出し）
export const initializeTags = async (): Promise<void> => {
  await fetchTags();
};