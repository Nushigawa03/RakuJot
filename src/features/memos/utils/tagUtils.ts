import type { Tag } from '../types/tags';

// タグデータのキャッシュ
let cachedTags: Tag[] = [];
let isTagsCached = false;
let fetchPromise: Promise<Tag[]> | null = null;

// タグデータをAPIから取得
const fetchTags = async (): Promise<Tag[]> => {
  if (isTagsCached) {
    return cachedTags;
  }

  // 既に取得中の場合は同じPromiseを返す
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
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
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const getTagNameById = (id: string): string => {
  // タグがまだ読み込まれていない場合は読み込み中と表示
  if (!isTagsCached && cachedTags.length === 0) {
    return '読み込み中...';
  }

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

// 与えられた tags フィールドから ID の配列を取り出すユーティリティ
export const extractTagIds = (tags: Array<string | { id?: string; name?: string } | any> | undefined): string[] => {
  if (!tags) return [];

  const ids: string[] = [];

  for (const t of tags) {
    if (typeof t === 'string') {
      ids.push(t);
      continue;
    }

    if (t && typeof t === 'object') {
      if (typeof t.id === 'string' && t.id) {
        ids.push(t.id);
        continue;
      }

      // id がないが name があればキャッシュから name -> id を解決する試みをする
      if (typeof t.name === 'string' && t.name) {
        const matched = cachedTags.find(tag => tag.name === t.name);
        if (matched && matched.id) {
          ids.push(matched.id);
          continue;
        }
        // キャッシュに見つからなければ警告して無視する（安全な挙動）
        console.warn('[extractTagIds] tag object has name but no id and name not found in cached tags:', t.name);
        continue;
      }
    }

    // 想定外の値はログに出して無視
    console.warn('[extractTagIds] unexpected tag value ignored:', t);
  }

  return ids;
};