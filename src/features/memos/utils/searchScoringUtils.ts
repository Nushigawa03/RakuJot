import type { Memo } from '../types/memo';

/** 検索語として意味を持たない助詞・接続表現 */
export const FILLER_WORDS = ['の', 'とか', 'など', 'について', 'に関する', 'くらい', 'ぐらい', '頃', 'ごろ'];

export interface FuzzySearchOptions {
  /** true のとき、テキスト検索は並び替えのみ行い、日付・タグで絞り込んだ結果を消さない */
  keepZeroScoreMemos?: boolean;
  minScore?: number;
  /** タグ ID → タグ名（タグ名もスコア対象にする） */
  tagName?: (id: string) => string;
}

/** 大文字小文字・全角半角・カタカナひらがなを揃える */
const normalize = (s: string) =>
  s.toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

/**
 * 部分一致なら 1、3文字以上のクエリはバイグラムの局所一致率が半分以上なら部分点（誤字許容）。
 */
function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (t.includes(q)) return 1;
  if (q.length <= 2) return 0;

  const bigrams = new Set<string>();
  for (let i = 0; i < q.length - 1; i++) bigrams.add(q.slice(i, i + 2));
  const windowSize = q.length + Math.min(q.length, 5);
  const step = Math.max(1, Math.floor(q.length / 2));
  let best = 0;
  for (let i = 0; i <= t.length - q.length; i += step) {
    const win = t.slice(i, i + windowSize);
    let hits = 0;
    bigrams.forEach((bg) => { if (win.includes(bg)) hits++; });
    best = Math.max(best, hits / bigrams.size);
  }
  return best >= 0.5 ? Number((best * 0.7).toFixed(2)) : 0;
}

/** テキストクエリでメモをスコアリングし、スコア順（同点は元の順）に並べる */
export function sortMemosByFuzzyScore<T extends Memo>(memos: T[], textQuery: string, options: FuzzySearchOptions = {}): T[] {
  const keywords = textQuery.toLowerCase().trim().split(/\s+/).filter((w) => w && !FILLER_WORDS.includes(w));
  if (!keywords.length) return memos;

  const scored = memos.map((memo, index) => {
    const title = memo.title || '';
    const body = memo.body || '';
    const date = memo.date || '';
    const tags = (memo.tags || []).map((id) => (options.tagName?.(id) ?? id).toLowerCase());
    let score = 0;
    let covered = 0;

    for (const kw of keywords) {
      const nkw = normalize(kw);
      const titleScore = fuzzyScore(kw, title);
      const bodyScore = fuzzyScore(kw, body);
      const dateScore = fuzzyScore(kw, date);
      const tagScores = tags.map((t) => fuzzyScore(kw, t));

      if (titleScore) score += 4 * titleScore + (normalize(title) === nkw ? 2 : 0);
      score += 2 * Math.max(0, ...tagScores) + tags.filter((t) => normalize(t) === nkw).length;
      if (bodyScore) {
        const count = normalize(body).split(nkw).length - 1;
        score += 0.35 * Math.min(count, 3) + 0.9 * bodyScore;
      }
      if (dateScore) score += 1.4 * dateScore + (normalize(date) === nkw ? 1 : 0);
      if (titleScore || bodyScore || dateScore || tagScores.some(Boolean)) covered++;
    }

    return { memo, index, score: score * (covered / keywords.length) };
  });

  const minScore = options.minScore ?? 0.6;
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((s) => options.keepZeroScoreMemos || s.score >= minScore)
    .map((s) => s.memo);
}
