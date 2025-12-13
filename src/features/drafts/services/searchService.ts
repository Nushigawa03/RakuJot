// タグAPIやパースAPIなどのサービスクラス
export class SearchService {
  async fetchTags(): Promise<any[]> {
    const response = await fetch('/api/tags');
    if (!response.ok) throw new Error('タグの取得エラー');
    return response.json();
  }

  async parseSearchQuery(text: string): Promise<{ start?: string, end?: string, tag?: string }> {
    const resp = await fetch('/api/parseSearch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) throw new Error('parseSearch API error');
    return resp.json();
  }
}

// シングルトンインスタンスをエクスポート
export const searchService = new SearchService();
