/**
 * useSmartSearch
 * 
 * 統合検索フック - タグ検索 + AI解析を組み合わせた検索機能を提供
 * useTagSearchを拡張し、以下を追加:
 * - AI解析のdebounce呼び出し
 * - 解析結果のプレビュー状態
 * - クリア機能の統合
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTagSearch } from './useTagSearch';
import { SearchTag } from '../types/searchTag';
import { Tag } from '../types/tags';
import { searchService } from '../services/searchService';
import { buildDateQuery } from '../utils/dateUtils';

// ========================================
// Types
// ========================================

export interface ParsedPreview {
    start: string | null;
    end: string | null;
    tag: string | null;
}

export interface UseSmartSearchReturn {
    // From useTagSearch
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filterTags: SearchTag[];
    setFilterTags: (tags: SearchTag[]) => void;
    suggestions: Tag[];
    setSuggestions: (tags: Tag[]) => void;
    selectedSuggestionIndex: number;
    setSelectedSuggestionIndex: (index: number | ((prev: number) => number)) => void;
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
    selectedTagIndex: number | null;
    setSelectedTagIndex: (index: number | null | ((prev: number | null) => number | null)) => void;
    handleSearchChange: (value: string) => void;
    handleTagAdd: (tagInput: string) => void;
    handleTagRemove: (tag: SearchTag) => void;
    findTagByName: (tagName: string) => Tag | undefined;

    // Smart search specific
    parsedPreview: ParsedPreview | null;
    isParsing: boolean;
    hasSearchConditions: boolean;
    selectedStartDate: string | null;
    selectedEndDate: string | null;
    setSelectedStartDate: (date: string | null) => void;
    setSelectedEndDate: (date: string | null) => void;
    handleSearch: () => Promise<void>;
    handleClearSearch: () => void;
}

// ========================================
// Hook
// ========================================

export function useSmartSearch(availableTags: Tag[]): UseSmartSearchReturn {
    // 基本のタグ検索機能
    const tagSearch = useTagSearch(availableTags);

    // 追加の状態
    const [parsedPreview, setParsedPreview] = useState<ParsedPreview | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);

    // Debounce用タイマー
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 検索条件があるかどうか
    const hasSearchConditions =
        tagSearch.filterTags.length > 0 ||
        tagSearch.searchQuery.trim() !== '' ||
        selectedStartDate !== null ||
        selectedEndDate !== null;

    // AI解析をdebounceで呼び出し
    useEffect(() => {
        const query = tagSearch.searchQuery.trim();

        // 短いクエリや空の場合はスキップ
        if (!query || query.length < 2) {
            setParsedPreview(null);
            return;
        }

        // 既存のタイマーをクリア
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // 500ms後にAI解析を実行
        debounceTimer.current = setTimeout(async () => {
            // 日付が既に設定されている場合はスキップ
            if (selectedStartDate || selectedEndDate) {
                return;
            }

            setIsParsing(true);
            try {
                const result = await searchService.parseSearchQuery(query);
                setParsedPreview({
                    start: result.start ?? null,
                    end: result.end ?? null,
                    tag: result.tag ?? null
                });
            } catch (err) {
                console.warn('[useSmartSearch] parse failed:', err);
                setParsedPreview(null);
            } finally {
                setIsParsing(false);
            }
        }, 500);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [tagSearch.searchQuery, selectedStartDate, selectedEndDate]);

    // 検索実行
    const handleSearch = useCallback(async () => {
        const query = tagSearch.searchQuery.trim();
        let effectiveStart: string | null = selectedStartDate;
        let effectiveEnd: string | null = selectedEndDate;
        let effectiveTag: string | null = null;

        // パースプレビューがない場合でも、検索実行時にパースを試みる（即エンター対応）
        // 日付が未指定の場合のみパースを行う
        if (!selectedStartDate && !selectedEndDate && query) {
            setIsParsing(true);
            try {
                // プレビューがあればそれを使用、なければAPIをコール
                let result = parsedPreview;
                if (!result) {
                    const apiResult = await searchService.parseSearchQuery(query);
                    result = {
                        start: apiResult.start ?? null,
                        end: apiResult.end ?? null,
                        tag: apiResult.tag ?? null
                    };
                }

                if (result) {
                    if (result.start) effectiveStart = result.start;
                    if (result.end) effectiveEnd = result.end;
                    if (result.tag) effectiveTag = result.tag;

                    // UIにも反映（次回レンダリング用）
                    if (result.start) setSelectedStartDate(result.start);
                    if (result.end) setSelectedEndDate(result.end);
                }
            } catch (err) {
                console.warn('[handleSearch] parse failed:', err);
            } finally {
                setIsParsing(false);
            }
        } else if (parsedPreview) {
            // 既にプレビューがある場合（debounce完了後）
            if (parsedPreview.start) effectiveStart = parsedPreview.start;
            if (parsedPreview.end) effectiveEnd = parsedPreview.end;
            if (parsedPreview.tag) effectiveTag = parsedPreview.tag;

            // UI反映
            if (parsedPreview.start) setSelectedStartDate(parsedPreview.start);
            if (parsedPreview.end) setSelectedEndDate(parsedPreview.end);
        }

        // クライアントサイド・フォールバック
        // API解析でタグが特定されなかった場合でも、クエリ全体が既存のタグ名と一致すればタグとみなす
        if (!effectiveTag && query) {
            const found = availableTags.find(t => t.name.toLowerCase() === query.toLowerCase());
            if (found) {
                effectiveTag = found.name;
            }
        }

        // クエリの決定:
        let residualQuery = query;
        let finalDateQuery = '';
        let finalTextQuery = '';
        let tagQuery = [...tagSearch.filterTags];

        // 1. タグ処理
        if (effectiveTag) {
            // タグマッチング
            const foundExact = availableTags.find(t => t.name === effectiveTag);
            const foundCi = availableTags.find(t => t.name.toLowerCase() === effectiveTag!.toLowerCase());
            const foundIncludes = availableTags.find(t => t.name.toLowerCase().includes(effectiveTag!.toLowerCase()));
            const match = foundExact || foundCi || foundIncludes;

            if (match) {
                // タグが見つかった場合はタグ追加 (イベント発行は抑制)
                tagSearch.handleTagAdd(match.name, true);

                // イベント発行用にリストに追加
                const isAlreadyAdded = tagQuery.some(t => t.id === match.id);
                if (!isAlreadyAdded) {
                    tagQuery.push({
                        id: match.id,
                        name: match.name,
                        isExclude: false
                    });
                }

                // クエリからタグ文字列を除去 (case-insensitive replace)
                const regex = new RegExp(effectiveTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                residualQuery = residualQuery.replace(regex, '').trim();
            }
        }

        // クエリがタグや日付で消費されていない部分（残りのクエリ）がある場合
        // クライアントサイド・フォールバック：残りが既存タグと完全一致すればタグとみなす
        if (residualQuery) {
            const found = availableTags.find(t => t.name.toLowerCase() === residualQuery.toLowerCase());
            if (found) {
                // タグとして消費
                tagSearch.handleTagAdd(found.name, true);
                const isAlreadyAdded = tagQuery.some(t => t.id === found.id);
                if (!isAlreadyAdded) {
                    tagQuery.push({
                        id: found.id,
                        name: found.name,
                        isExclude: false
                    });
                }
                residualQuery = '';
            }
        }

        finalTextQuery = residualQuery;

        // 2. 日付クエリ構築
        const { start, end, query: dateQueryBuilt } = buildDateQuery(
            effectiveStart ?? '',
            effectiveEnd ?? ''
        );
        if (start || end) {
            finalDateQuery = dateQueryBuilt;
        }

        // 統合イベント発行
        // type: 'smart' を使用して、クエリとタグを同時に送信する
        try {
            const eventDetail = {
                type: 'smart',
                dateQuery: finalDateQuery,
                textQuery: finalTextQuery,
                tagQuery: tagQuery
            };

            console.log('[useSmartSearch] Dispatching smart search:', eventDetail);

            window.dispatchEvent(new CustomEvent('searchExecuted', {
                detail: eventDetail
            }));
        } catch (e) {
            console.error('[useSmartSearch] Dispatch error:', e);
        }

        // プレビューをクリア
        setParsedPreview(null);
    }, [parsedPreview, selectedStartDate, selectedEndDate, availableTags, tagSearch]);

    // 検索クリア
    const handleClearSearch = useCallback(() => {
        tagSearch.setSearchQuery('');
        tagSearch.setFilterTags([]);
        setSelectedStartDate(null);
        setSelectedEndDate(null);
        setParsedPreview(null);

        try {
            window.dispatchEvent(new CustomEvent('searchExecuted', { detail: { type: 'clear' } }));
        } catch (e) {
            // ignore
        }
    }, [tagSearch]);

    return {
        // From useTagSearch
        ...tagSearch,

        // Smart search specific
        parsedPreview,
        isParsing,
        hasSearchConditions,
        selectedStartDate,
        selectedEndDate,
        setSelectedStartDate,
        setSelectedEndDate,
        handleSearch,
        handleClearSearch,
    };
}
