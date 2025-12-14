import { useState, useEffect, useCallback } from 'react';

export interface Tag {
  id: string;
  name: string;
  description?: string;
}

export const useTagSuggestions = () => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 全タグを取得
  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error('タグの取得に失敗しました');
      }
      const tags = await response.json();
      setAllTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // タグ名でフィルタリング（サジェスト機能）
  const getSuggestions = useCallback((input: string, limit = 10): Tag[] => {
    if (!input.trim()) return allTags.slice(0, limit);
    
    const lowercaseInput = input.toLowerCase();
    return allTags
      .filter(tag => tag.name.toLowerCase().includes(lowercaseInput))
      .slice(0, limit);
  }, [allTags]);

  // 指定したタグIDが存在するかチェック
  const tagExists = useCallback((tagId: string): boolean => {
    // 新規タグの場合は存在しない
    if (tagId.startsWith('new-tag-')) return false;
    return allTags.some(tag => tag.id === tagId);
  }, [allTags]);

  // タグIDからタグ名を取得
  const getTagName = useCallback((tagId: string): string => {
    // 新規タグの場合、IDから名前を抽出する必要がある
    // FilterEditorで一時的に保存された名前を取得するため、
    // 実際には別の方法で管理する必要がある
    const tag = allTags.find(tag => tag.id === tagId);
    return tag ? tag.name : tagId; // 見つからない場合はIDをそのまま返す
  }, [allTags]);

  return {
    allTags,
    loading,
    error,
    getSuggestions,
    tagExists,
    getTagName,
    refreshTags: loadTags
  };
};
