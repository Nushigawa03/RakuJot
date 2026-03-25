import type { TagExpression, TagExpressionTerm } from "../types/tagExpressions";
import { evaluateExpression } from "../utils/tagExpressionUtils";
import { extractTagIds } from '../utils/tagUtils';
import {
  getAllTagExpressions as localGetAllTagExpressions,
  putTagExpression as localPutTagExpression,
  deleteTagExpression as localDeleteTagExpression,
  type LocalTagExpression,
} from '../../sync/localDb';
import { performSync } from '../../sync/syncService';

export type TagExpressionRaw = any;

/**
 * ローカルID生成
 */
const generateLocalId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `local_${timestamp}_${randomPart}`;
};

class TagExpressionService {
  /**
   * ローカルDB優先で TagExpression を読み込む
   */
  async load(): Promise<TagExpression[]> {
    try {
      const local = await localGetAllTagExpressions();
      if (local.length > 0) {
        return local.map(te => ({
          id: te.id,
          orTerms: te.orTerms,
          name: te.name,
          color: te.color,
          icon: te.icon,
          createdAt: te.createdAt,
          updatedAt: te.updatedAt,
        }));
      }

      // ローカルが空ならサーバーから取得
      if (navigator.onLine) {
        const resp = await fetch('/api/tagExpressions');
        if (!resp.ok) throw new Error('tagExpressions の取得に失敗しました');
        const data = await resp.json();
        const expressions = data as TagExpression[];

        // ローカルDBにキャッシュ
        for (const te of expressions) {
          await localPutTagExpression({
            id: te.id,
            orTerms: te.orTerms,
            name: te.name,
            color: te.color,
            icon: te.icon,
            createdAt: te.createdAt,
            updatedAt: te.updatedAt,
            _syncStatus: 'synced',
          });
        }

        return expressions;
      }

      return [];
    } catch {
      return [];
    }
  }

  async create(data: { orTerms: TagExpressionTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
    const now = new Date().toISOString();
    const localTe: LocalTagExpression = {
      id: generateLocalId(),
      orTerms: data.orTerms,
      name: data.name,
      color: data.color,
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'pending-create',
    };

    await localPutTagExpression(localTe);

    if (navigator.onLine) {
      try {
        const resp = await fetch('/api/tagExpressions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (resp.ok) {
          const result = await resp.json();
          if (result.tagExpression?.id) {
            await localDeleteTagExpression(localTe.id);
            await localPutTagExpression({
              ...localTe,
              id: result.tagExpression.id,
              _syncStatus: 'synced',
            });
          }
          return result;
        }
      } catch {
        // オフライン
      }
    }

    return { success: true, tagExpression: localTe };
  }

  async update(id: string, data: { orTerms?: TagExpressionTerm[]; name?: string | null; color?: string | null; icon?: string | null }) {
    // ローカル更新
    const existing = (await localGetAllTagExpressions()).find(te => te.id === id);
    if (existing) {
      const updated: LocalTagExpression = {
        ...existing,
        ...(data.orTerms !== undefined && { orTerms: data.orTerms }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        updatedAt: new Date().toISOString(),
        _syncStatus: existing._syncStatus === 'pending-create' ? 'pending-create' : 'pending-update',
      };
      await localPutTagExpression(updated);
    }

    if (navigator.onLine) {
      try {
        const resp = await fetch(`/api/tagExpressions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...data }),
        });
        if (resp.ok) {
          const result = await resp.json();
          // ローカルを synced に
          if (existing) {
            await localPutTagExpression({ ...existing, ...data, _syncStatus: 'synced' } as LocalTagExpression);
          }
          return result;
        }
      } catch {
        // オフライン
      }
    }

    return { success: true };
  }

  async delete(id: string) {
    const existing = (await localGetAllTagExpressions()).find(te => te.id === id);
    if (existing) {
      if (existing._syncStatus === 'pending-create') {
        await localDeleteTagExpression(id);
      } else {
        await localPutTagExpression({ ...existing, _syncStatus: 'pending-delete' });
      }
    }

    if (navigator.onLine) {
      try {
        const resp = await fetch('/api/tagExpressions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (resp.ok) {
          await localDeleteTagExpression(id);
          return resp.json();
        }
      } catch {
        // オフライン
      }
    }

    return { success: true };
  }

  findExpressionById(expressions: TagExpression[], id: string): TagExpression | undefined {
    return expressions.find(e => e.id === id);
  }

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
