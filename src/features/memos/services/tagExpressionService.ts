import type { TagExpression, TagExpressionTerm } from "../types/tagExpressions";
import { evaluateExpression } from "../utils/tagExpressionUtils";
import { extractTagIds } from '../utils/tagUtils';

export type TagExpressionRaw = any;

class TagExpressionService {
  async load(): Promise<TagExpression[]> {
    const resp = await fetch('/api/tagExpressions');
    if (!resp.ok) throw new Error('tagExpressions の取得に失敗しました');
    const data = await resp.json();
    return data as TagExpression[];
  }

  async create(data: { orTerms: TagExpressionTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
    const resp = await fetch('/api/tagExpressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error('tagExpression の作成に失敗しました');
    return resp.json();
  }

  async update(id: string, data: { orTerms?: TagExpressionTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
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

  findExpressionById(expressions: TagExpression[], id: string): TagExpression | undefined {
    return expressions.find(e => e.id === id);
  }

  // memo.tags が string[] あるいは Tag[] のどちらでも受け取れるようにする
  matchesExpression(memoTags: Array<string | { id?: string } | any>, orTerms: TagExpressionTerm[] | undefined): boolean {
    if (!orTerms || orTerms.length === 0) return true;
    const ids = extractTagIds(memoTags);
    return evaluateExpression(ids, orTerms as TagExpressionTerm[]);
  }

  isMemoMatchingByExpressionId(memoTags: Array<string | { id?: string } | any>, id: string, expressions: TagExpression[]): boolean {
    const expr = this.findExpressionById(expressions, id);
    if (!expr) return false;
    return this.matchesExpression(memoTags, expr.orTerms);
  }
}

const instance = new TagExpressionService();
export default instance;
export { TagExpressionService };
