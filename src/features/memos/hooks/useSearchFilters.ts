import { useState, useEffect } from 'react';
import { SearchTag } from '../types/searchTag';
import { TagExpression } from '../types/tagExpressions';
import tagExpressionService from '../services/tagExpressionService';
import { useTagExpression } from './useTagExpression';

export interface UseSearchFiltersResult {
    filterQuery: string;
    setFilterQuery: (query: string) => void;
    dateQuery: string;
    setDateQuery: (query: string) => void;
    textQuery: string;
    setTextQuery: (query: string) => void;
    queryEmbedding: number[] | undefined;
    tagQuery: SearchTag[];
    setTagQuery: (tags: SearchTag[]) => void;
    expressions: TagExpression[];
    activeExpression: string;
    handleExpressionClick: (expression: TagExpression) => void;
    setInputOffset: (offset: number) => void;
}

export const useSearchFilters = (
    onInputOffsetChange?: (offset: number) => void
): UseSearchFiltersResult => {
    const [filterQuery, setFilterQuery] = useState<string>('');
    const [dateQuery, setDateQuery] = useState<string>('');
    const [textQuery, setTextQuery] = useState<string>('');
    const [queryEmbedding, setQueryEmbedding] = useState<number[] | undefined>(undefined);
    const [tagQuery, setTagQuery] = useState<SearchTag[]>([]);
    const [expressions, setExpressions] = useState<TagExpression[]>(() => tagExpressionService.getCachedExpressions());
    const { activeExpression, handleExpressionClick } = useTagExpression((query) => setFilterQuery(query));

    // Load tag expressions
    useEffect(() => {
        const loadFiltersAndCategories = async () => {
            try {
                const localExprs = await tagExpressionService.loadLocal();
                setExpressions(localExprs as any);

                if (navigator.onLine) {
                    const latestExprs = await tagExpressionService.refreshFromServer();
                    setExpressions(latestExprs as any);
                }
            } catch (error) {
                console.error('TagExpression の読み込みエラー:', error);
            }
        };

        const onSyncComplete = () => {
            loadFiltersAndCategories();
        };

        loadFiltersAndCategories();
        window.addEventListener('syncComplete', onSyncComplete);
        return () => window.removeEventListener('syncComplete', onSyncComplete);
    }, []);

    // Generate embedding when textQuery changes (for Semantic Search)
    // Note: Previously used dateQuery, but usually semantic search is for text content.
    // If textQuery is present, use it. If not, maybe use dateQuery if it has text intent?
    // Current design separates them. We use textQuery for embedding ideally.
    useEffect(() => {
        const targetText = textQuery || '';
        if (targetText && targetText.length > 1) { // Min length check
            const generateQueryEmbedding = async () => {
                try {
                    const response = await fetch('/api/embeddings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ texts: [targetText] }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.embeddings && data.embeddings[0]) {
                            setQueryEmbedding(data.embeddings[0]);
                        } else {
                            setQueryEmbedding(undefined);
                        }
                    } else {
                        setQueryEmbedding(undefined);
                    }
                } catch (err) {
                    console.error('[useSearchFilters] Failed to compute query embedding:', err);
                    setQueryEmbedding(undefined);
                }
            };
            generateQueryEmbedding();
        } else {
            setQueryEmbedding(undefined);
        }
    }, [textQuery]);

    // Callback wrapper to handle optional prop
    const handleInputOffsetChange = (offset: number) => {
        if (onInputOffsetChange) {
            onInputOffsetChange(offset);
        }
    };

    // Listen for search events dispatched from NavigationBar components
    useEffect(() => {
        const onSearchExecuted = (ev: Event) => {
            try {
                const detail = (ev as CustomEvent).detail;
                console.log('[useSearchFilters] Received search event:', detail);

                if (detail) {
                    if (detail.type === 'clear') {
                        setDateQuery('');
                        setTextQuery('');
                        setTagQuery([]);
                        handleInputOffsetChange(0);
                        return;
                    }

                    // Unified 'smart' search event
                    if (detail.type === 'smart') {
                        let hasUpdates = false;

                        // Update queries
                        if (detail.dateQuery !== undefined) {
                            setDateQuery(detail.dateQuery || '');
                            hasUpdates = true;
                        }
                        if (detail.textQuery !== undefined) {
                            setTextQuery(detail.textQuery || '');
                            hasUpdates = true;
                        }

                        // Clear sidebar filter if searching globally
                        if (hasUpdates) {
                            setFilterQuery('');
                        }

                        // Update tags
                        if (Array.isArray(detail.tags)) {
                            setTagQuery(detail.tags);
                            hasUpdates = true;
                        } else if (Array.isArray(detail.tagQuery)) {
                            setTagQuery(detail.tagQuery);
                            hasUpdates = true;
                        }

                        if (hasUpdates) {
                            handleInputOffsetChange(1); // Show list
                        }
                        return;
                    }

                    // Legacy/Individual handlers (Migration support)
                    // If still receiving old format (e.g. from unprocessed components)
                    if (typeof detail.query === 'string') {
                        // Ambiguous query: treat as text if no "date:" prefix, else date?
                        // For safety, let's assume legacy "query" meant dateQuery (as per old implementation)
                        // BUT user wants separation.
                        // Ideally everything uses 'smart' type now.
                        if (detail.query.startsWith('date:') || detail.query.includes('date>=')) {
                            setDateQuery(detail.query);
                        } else {
                            setTextQuery(detail.query);
                            setDateQuery('');
                        }
                        handleInputOffsetChange(1);
                    }
                    if (detail.type === 'tags' && Array.isArray(detail.tags)) {
                        setTagQuery(detail.tags);
                        handleInputOffsetChange(1);
                    }
                }
            } catch (err) {
                console.error('onSearchExecuted handler error', err);
            }
        };

        window.addEventListener('searchExecuted', onSearchExecuted as EventListener);
        return () => window.removeEventListener('searchExecuted', onSearchExecuted as EventListener);
    }, []);

    return {
        filterQuery,
        setFilterQuery,
        dateQuery,
        setDateQuery,
        textQuery,
        setTextQuery,
        queryEmbedding,
        tagQuery,
        setTagQuery,
        expressions,
        activeExpression,
        handleExpressionClick,
        setInputOffset: handleInputOffsetChange,
    };
};
