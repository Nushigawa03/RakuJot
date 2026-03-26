import { tagService } from './tagService';
import { refreshTags } from '../utils/tagUtils';

// タグAPIやパースAPIなどのサービスクラス
export class SearchService {
  async fetchTags(): Promise<any[]> {
    try {
      const localTags = await tagService.getTags();

      // ローカルがあれば即返し、オンライン時は裏で更新
      if (localTags.length > 0) {
        if (navigator.onLine) {
          refreshTags().catch((error) => {
            console.warn('[searchService] タグのバックグラウンド更新に失敗:', error);
          });
        }
        return localTags;
      }

      // ローカルが空の時のみオンライン取得を待つ
      if (navigator.onLine) {
        await refreshTags();
        return tagService.getTags();
      }

      return localTags;
    } catch {
      return [];
    }
  }

  async parseSearchQuery(text: string): Promise<{ start?: string, end?: string, tag?: string }> {
    try {
      const resp = await fetch('/api/parseSearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) {
        console.warn('[searchService] parseSearch API returned status:', resp.status);
        return {};
      }
      return await resp.json();
    } catch (e) {
      console.warn('[searchService] parseSearch request failed:', e);
      return {};
    }
  }
}

// シングルトンインスタンスをエクスポート
export const searchService = new SearchService();
