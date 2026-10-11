import type { Memo } from '../types/memo';
import type { Tag } from '../types/tags';
import type { SearchTag } from '../types/searchTag';
import type { TagExpression } from '../types/tagExpressions';
import { buildDateQuery, parseFuzzyDate } from './dateUtils';
import { DEFAULT_SEMANTIC_DATE_THRESHOLD, evaluateDateQuery } from './dateQueryEvaluator';
import { FILLER_WORDS, sortMemosByFuzzyScore } from './searchScoringUtils';
import { evaluateExpression } from './expressions';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 優先度順（長い・具体的な表現を先に評価する）
const DATE_PATTERNS = [
  /\d{4}年\d{1,2}月\d{1,2}日/, /\d{4}年\d{1,2}月/, /\d{4}年\s*[春夏秋冬]/, /(?:一昨年|去年|今年|来年)の?[春夏秋冬]/,
  /\d{4}年/, /\d{4}-\d{2}-\d{2}/, /一昨年/, /先々月/, /先月/, /来月/, /去年/, /来年/, /今年/, /今日/, /昨日/, /明日/, /[春夏秋冬]/,
];
const DATE_WORDS = /(\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|\d{4}年|\d{4}-\d{2}-\d{2}|一昨年|先々月|先月|来月|去年|今年|来年|今日|昨日|明日|春|夏|秋|冬)/g;
const RESIDUAL_FILLERS = [...FILLER_WORDS, 'らへん', 'あたり', '関連', '関係', 'のため', 'のための', 'の記録'];
const EDGE_FILLERS = RESIDUAL_FILLERS.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|');

/** 日付やタグを取り除いた残りの検索語から、前後の助詞などを落とす */
function normalizeResidual(value: string): string {
  let s = value.replace(/[　\s・]+/g, ' ').trim();
  for (let i = 0; i < 3; i++) {
    s = s.replace(new RegExp(`^(?:${EDGE_FILLERS})+`), '').replace(new RegExp(`(?:${EDGE_FILLERS})+$`), '').replace(/[　\s・]+/g, ' ').trim();
  }
  return s.split(' ').every((t) => RESIDUAL_FILLERS.includes(t)) ? '' : s;
}

interface ClientParsedResult {
  start: string | null;
  end: string | null;
  tag: string | null;
  residualQuery: string;
}

/** 検索文字列から日付表現とタグをオフラインで抽出する */
export function clientParseSearch(text: string, tagNames: string[]): ClientParsedResult {
  const s = (text || '').trim();
  const dateWord = DATE_PATTERNS.map((p) => s.match(p)?.[0]).find(Boolean);
  const result: ClientParsedResult = {
    start: dateWord ? parseFuzzyDate(dateWord, false) : null,
    end: dateWord ? parseFuzzyDate(dateWord, true) : null,
    tag: null,
    residualQuery: '',
  };

  let rest = normalizeResidual(s.replace(DATE_WORDS, ''));
  const parts = rest.split(/\s+|の/).filter(Boolean).map((p) => p.toLowerCase());
  const lowerTags = tagNames.map((t) => t.toLowerCase());
  // 完全一致を優先し、なければ3文字以上の語で部分一致
  let part = parts.find((p) => lowerTags.includes(p));
  let index = part ? lowerTags.indexOf(part) : -1;
  let consumed = tagNames[index];
  if (index < 0) {
    part = parts.find((p) => p.length >= 3 && lowerTags.some((t) => t.includes(p)));
    index = part ? lowerTags.findIndex((t) => t.includes(part!)) : -1;
    consumed = part!;
  }
  if (index >= 0) {
    result.tag = tagNames[index];
    rest = rest.replace(new RegExp(escapeRegExp(consumed), 'gi'), '').trim();
  }
  result.residualQuery = normalizeResidual(rest);
  return result;
}

interface SmartQueryResult {
  dateQuery: string;
  semanticDateQuery: string;
  textQuery: string;
  tags: SearchTag[];
  startDate: string | null;
  endDate: string | null;
}

/**
 * 検索バーの入力を「日付クエリ・タグ・残りのテキスト」に分解する。
 * 入力に日付が含まれていれば詳細検索の日付より優先する。
 */
export function parseSmartQuery(
  query: string,
  availableTags: Tag[],
  current: { tags: SearchTag[]; startDate: string | null; endDate: string | null },
): SmartQueryResult {
  const q = query.trim();
  const parsed = clientParseSearch(q, availableTags.map((t) => t.name));
  const fromQuery = Boolean(parsed.start || parsed.end);
  const startDate = fromQuery ? parsed.start : current.startDate;
  const endDate = fromQuery ? parsed.end : current.endDate;

  const tags = [...current.tags];
  const addTag = (name: string) => {
    const tag = availableTags.find((t) => t.name === name) || availableTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (tag && !tags.some((t) => t.id === tag.id)) tags.push({ id: tag.id, name: tag.name, isExclude: false });
    return Boolean(tag);
  };
  if (parsed.tag) addTag(parsed.tag);
  let textQuery = parsed.residualQuery;
  if (textQuery && addTag(textQuery)) textQuery = '';

  const date = buildDateQuery(startDate ?? '', endDate ?? '');
  const hasDate = Boolean(date.start || date.end);
  return {
    dateQuery: hasDate ? date.query : '',
    // 意味検索用には正規化前の曖昧な日付表現を使う
    semanticDateQuery: hasDate ? (fromQuery ? q : [startDate, endDate].filter(Boolean).join(' から ')) : '',
    textQuery,
    tags,
    startDate,
    endDate,
  };
}

interface MemoFilter {
  expression?: TagExpression;
  dateQuery: string;
  textQuery: string;
  tags: SearchTag[];
  queryEmbedding?: number[];
  tagName?: (id: string) => string;
}

/** 分類・タグ・日付で絞り込んだ後、テキストでスコア順に並べる（同点は元の並び順を維持） */
export function filterMemos<T extends Memo>(memos: T[], f: MemoFilter): T[] {
  let result = memos;
  if (f.expression) result = result.filter((m) => evaluateExpression(m.tags, f.expression!.orTerms));
  if (f.tags.length) {
    result = result.filter((m) => f.tags.every((t) => m.tags.includes(t.id) !== t.isExclude));
  }
  if (f.dateQuery) {
    const config = { queryEmbedding: f.queryEmbedding, semanticThreshold: DEFAULT_SEMANTIC_DATE_THRESHOLD };
    result = result.filter((m) => evaluateDateQuery(m, f.dateQuery, config));
  }
  // 構造化フィルタがあるときはテキストで結果を消さず、並び替えだけに使う
  const structured = Boolean(f.expression || f.dateQuery || f.tags.length);
  return sortMemosByFuzzyScore(result, f.textQuery, { keepZeroScoreMemos: structured, tagName: f.tagName });
}
