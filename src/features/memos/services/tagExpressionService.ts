import type { Filter } from "../types/filters";
import type { Category } from "../types/categories";
import type { FilterTerm } from "../types/filterTypes";
import { evaluateExpression } from "../utils/tagExpressionUtils";
import { extractTagIds } from '../utils/tagUtils';

export type TagExpressionRaw = any;

class TagExpressionService {
  async load(): Promise<{ filters: Filter[]; categories: Category[] }> {
    const resp = await fetch('/api/tagExpressions');
    if (!resp.ok) throw new Error('tagExpressions の取得に失敗しました');
    const data = await resp.json();

    const filters = (data as any[]).filter(d => !d.name) as Filter[];
    const categories = (data as any[]).filter(d => !!d.name) as Category[];

    return { filters, categories };
  }

  async create(data: { orTerms: FilterTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
    const resp = await fetch('/api/tagExpressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error('tagExpression の作成に失敗しました');
    return resp.json();
  }

  async update(id: string, data: { orTerms?: FilterTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
    const resp = await fetch(`/api/tagExpressions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!resp.ok) throw new Error('tagExpression の更新に失敗しました');
    return resp.json();
  }

  async delete(id: string) {
    const resp = await fetch('/api/tagExpressions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!resp.ok) throw new Error('tagExpression の削除に失敗しました');
    return resp.json();
  }

  findFilterById(filters: Filter[], id: string): Filter | undefined {
    return filters.find(f => f.id === id);
  }

  findCategoryById(categories: Category[], id: string): Category | undefined {
    return categories.find(c => c.id === id);
  }

  // memo.tags が string[] あるいは Tag[] のどちらでも受け取れるようにする
  matchesExpression(memoTags: Array<string | { id?: string } | any>, orTerms: FilterTerm[] | undefined): boolean {
    if (!orTerms || orTerms.length === 0) return true;
    const ids = extractTagIds(memoTags);
    return evaluateExpression(ids, orTerms as FilterTerm[]);
  }

  isMemoMatchingByExpressionId(memoTags: Array<string | { id?: string } | any>, id: string, filters: Filter[], categories: Category[]): boolean {
    const f = this.findFilterById(filters, id);
    if (f) return this.matchesExpression(memoTags, f.orTerms);
    const c = this.findCategoryById(categories, id);
    if (c) return this.matchesExpression(memoTags, c.orTerms);
    return false;
  }
}

const instance = new TagExpressionService();
export default instance;
export { TagExpressionService };
