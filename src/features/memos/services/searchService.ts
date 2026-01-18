// タグAPIやパースAPIなどのサービスクラス
export class SearchService {
  async fetchTags(): Promise<any[]> {
    const response = await fetch('/api/tags');
    if (!response.ok) throw new Error('タグの取得エラー');
    return response.json();
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
