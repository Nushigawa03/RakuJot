import { Memo } from '../types/memo';

function tagToSearchText(tag: unknown): string {
    if (typeof tag === 'string') return tag;
    if (tag && typeof tag === 'object') {
        const value = tag as { id?: unknown; name?: unknown };
        if (typeof value.name === 'string') return value.name;
        if (typeof value.id === 'string') return value.id;
    }
    return '';
}

const IGNORABLE_TEXT_QUERY_WORDS = new Set([
    'の',
    'とか',
    'など',
    'について',
    'に関する',
    'くらい',
    'ぐらい',
    '頃',
    'ごろ',
]);

function getSearchKeywords(query: string): string[] {
    return query
        .split(/\s+/)
        .map(token => token.trim())
        .filter(token => token && !IGNORABLE_TEXT_QUERY_WORDS.has(token));
}

export interface FuzzySearchOptions {
    /**
     * When true, text search only reorders results and never removes
     * otherwise valid structured matches such as date/tag results.
     */
    keepZeroScoreMemos?: boolean;
    minScore?: number;
}

/**
 * 拡張されたクエリ評価（タグ + 本文/タイトル）
 */
export function evaluateTextQuery(memo: Memo, filterQuery: string, searchBody: boolean = false): boolean {
    const queryParts = getSearchKeywords(filterQuery);
    const memoTags = (memo.tags || []).map(tagToSearchText).filter(Boolean);

    if (queryParts.length === 0) return true;

    // NOT条件（除外タグ/除外ワード）
    const excludeParts: string[] = [];
    for (let i = 0; i < queryParts.length; i++) {
        if (queryParts[i] === 'NOT' && i + 1 < queryParts.length) {
            excludeParts.push(queryParts[i + 1]);
            queryParts[i] = '';
            queryParts[i + 1] = '';
        } else if (queryParts[i].startsWith('-')) {
            excludeParts.push(queryParts[i].substring(1));
            queryParts[i] = '';
        }
    }

    // Check excludes
    if (excludeParts.length > 0) {
        const hasExcludeMatch = excludeParts.some(part => {
            if (memoTags.includes(part)) return true;
            if (searchBody) {
                if (memo.title?.toLowerCase().includes(part.toLowerCase())) return true;
                if (memo.body?.toLowerCase().includes(part.toLowerCase())) return true;
            }
            return false;
        });
        if (hasExcludeMatch) return false;
    }

    const remainingParts = queryParts.filter(part => part !== '');
    if (remainingParts.length === 0) return true;

    // OR条件を処理
    const orGroups: string[][] = [[]];
    let currentGroup = 0;

    for (let i = 0; i < remainingParts.length; i++) {
        const part = remainingParts[i];
        if (part === 'OR') {
            currentGroup++;
            orGroups[currentGroup] = [];
        } else if (part === 'AND') {
            continue;
        } else {
            if (!orGroups[currentGroup]) {
                orGroups[currentGroup] = [];
            }
            orGroups[currentGroup].push(part);
        }
    }

    // Evaluate Groups (OR) -> Each Group (AND)
    return orGroups.some(group => {
        if (group.length === 0) return false;
        return group.every(part => {
            if (memoTags.includes(part)) return true;
            if (searchBody) {
                if (memo.title?.toLowerCase().includes(part.toLowerCase())) return true;
                if (memo.body?.toLowerCase().includes(part.toLowerCase())) return true;
            }
            return false;
        });
    });
}

/**
 * 入力文字列を検索用に正規化する（大文字小文字、全角半角、カタカナひらがなの統一）
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        // カタカナをひらがなに変換
        .replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60))
        // 全角英数字を半角に変換
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, match => String.fromCharCode(match.charCodeAt(0) - 0xfee0));
}

/**
 * 2文字以上のクエリに対して、N-gram(Bigram)ベースの簡易編集距離（あいまいマッチ）スコアを計算する
 * 検索窓をスライドさせて局所的なN-gramの一致率を調べることで、少々の誤字や脱字を許容する
 */
function calculateFuzzyMatchScore(query: string, text: string): number {
    const normQ = normalizeString(query);
    const normT = normalizeString(text);

    if (normT.includes(normQ)) return 1.0;
    if (normQ.length <= 2) return 0; // 短すぎる場合は誤字許容しない

    const qLen = normQ.length;
    // クエリ長に対して少し幅を持たせたウィンドウでテキストをスライド検査する
    const windowSize = qLen + Math.min(qLen, 5);

    const qBigrams = new Set<string>();
    for (let i = 0; i < qLen - 1; i++) {
        qBigrams.add(normQ.slice(i, i + 2));
    }

    if (qBigrams.size === 0) return 0;

    let maxRatio = 0;
    const step = Math.max(1, Math.floor(qLen / 2));

    for (let i = 0; i <= normT.length - qLen; i += step) {
        const windowText = normT.slice(i, i + windowSize);
        let matchCount = 0;

        qBigrams.forEach(bg => {
            if (windowText.includes(bg)) matchCount++;
        });

        const ratio = matchCount / qBigrams.size;
        if (ratio > maxRatio) {
            maxRatio = ratio;
        }
    }

    // N-gramの半分以上が一致していれば（例：1文字違いなど）、誤字とみなして部分点を与える
    if (maxRatio >= 0.5) {
        return parseFloat((maxRatio * 0.7).toFixed(2));
    }

    return 0;
}

/**
 * 検索クエリを用いてメモの検索スコアを計算し、類似度順に並び変える。
 * セマンティック分散表現は使用せず、独自の実装でテキストスコアリングを行う。
 */
export function sortMemosByFuzzyScore(
    memos: Memo[],
    effectiveTextQuery: string,
    options: FuzzySearchOptions = {}
): Memo[] {
    if (!effectiveTextQuery.trim()) {
        return memos;
    }

    const query = effectiveTextQuery.toLowerCase().trim();
    const keywords = getSearchKeywords(query);

    if (keywords.length === 0) {
        return memos;
    }

    const scoredMemos = memos.map((memo, index) => {
        let score = 0;

        const title = (memo.title || '').toLowerCase();
        const body = (memo.body || '').toLowerCase();
        const tags = (memo.tags || []).map(tagToSearchText).filter(Boolean).map(t => t.toLowerCase());

        // Custom Fuzzy Scoring via keywords
        keywords.forEach(kw => {
            const normKw = normalizeString(kw);

            const titleFuzzy = calculateFuzzyMatchScore(kw, memo.title || '');
            if (titleFuzzy > 0) {
                score += 4.0 * titleFuzzy;
                if (normalizeString(title) === normKw) score += 2.0;
            }

            let maxTagFuzzy = 0;
            tags.forEach(t => {
                const fuzzy = calculateFuzzyMatchScore(kw, t);
                if (fuzzy > maxTagFuzzy) maxTagFuzzy = fuzzy;
                if (normalizeString(t) === normKw) score += 1.0;
            });
            score += 2.0 * maxTagFuzzy;

            const bodyFuzzy = calculateFuzzyMatchScore(kw, memo.body || '');
            if (bodyFuzzy > 0) {
                const safeKw = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const normBody = normalizeString(memo.body || '');
                const count = (normBody.match(new RegExp(safeKw, 'g')) || []).length;
                score += 0.35 * Math.min(count, 3);
                score += 0.9 * bodyFuzzy;
            }
        });

        const coverage = keywords.length > 0
            ? keywords.filter(kw => {
                return calculateFuzzyMatchScore(kw, memo.title || '') > 0 ||
                    calculateFuzzyMatchScore(kw, memo.body || '') > 0 ||
                    tags.some(t => calculateFuzzyMatchScore(kw, t) > 0);
            }).length / keywords.length
            : 1;

        score *= coverage;

        return { memo, searchScore: score, index };
    });

    scoredMemos.sort((a, b) => {
        if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
        return a.index - b.index;
    });

    const minScore = options.minScore ?? 0.6;
    return scoredMemos
        .filter(item => options.keepZeroScoreMemos || item.searchScore >= minScore)
        .map(item => item.memo);
}
