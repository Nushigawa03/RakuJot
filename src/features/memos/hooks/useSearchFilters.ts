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
    queryEmbedding: number[] | undefined;
    filterTags: SearchTag[];
    setFilterTags: (tags: SearchTag[]) => void;
    expressions: TagExpression[];
    activeExpression: string;
    handleExpressionClick: (expression: TagExpression) => void;
    setInputOffset: (offset: number) => void;
}

export const useSearchFilters = (
    onInputOffsetChange: (offset: number) => void
): UseSearchFiltersResult => {
    const [filterQuery, setFilterQuery] = useState<string>('');
    const [dateQuery, setDateQuery] = useState<string>('');
    const [queryEmbedding, setQueryEmbedding] = useState<number[] | undefined>(undefined);
    const [filterTags, setFilterTags] = useState<SearchTag[]>([]);
    const [expressions, setExpressions] = useState<TagExpression[]>([]);
    const { activeExpression, handleExpressionClick } = useTagExpression((query) => setFilterQuery(query));

    // Load tag expressions
    useEffect(() => {
        const loadFiltersAndCategories = async () => {
            try {
                const exprs = await tagExpressionService.load();
                setExpressions(exprs as any);
            } catch (error) {
                console.error('TagExpression の読み込みエラー:', error);
            }
        };
        loadFiltersAndCategories();
    }, []);

    // Generate embedding when dateQuery changes
    useEffect(() => {
        if (dateQuery) {
            const generateQueryEmbedding = async () => {
                try {
                    const response = await fetch('/api/embeddings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ texts: [dateQuery] }),
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
    }, [dateQuery]);

    // Listen for search events dispatched from NavigationBar components
    useEffect(() => {
        const onSearchExecuted = (ev: Event) => {
            try {
                const detail = (ev as CustomEvent).detail;
                if (detail) {
                    if (detail.type === 'clear') {
                        setDateQuery('');
                        setFilterTags([]);
                        return;
                    }
                    if (typeof detail.query === 'string') {
                        setDateQuery(detail.query);
                        onInputOffsetChange(1); // Show list when search is executed
                    }
                    if (detail.type === 'tags' && Array.isArray(detail.tags)) {
                        setFilterTags(detail.tags);
                        onInputOffsetChange(1); // Show list when tags are set
                    }
                }
            } catch (err) {
                console.error('onSearchExecuted handler error', err);
            }
        };

        window.addEventListener('searchExecuted', onSearchExecuted as EventListener);
        return () => window.removeEventListener('searchExecuted', onSearchExecuted as EventListener);
    }, [onInputOffsetChange]);

    return {
        filterQuery,
        setFilterQuery,
        dateQuery,
        setDateQuery,
        queryEmbedding,
        filterTags,
        setFilterTags,
        expressions,
        activeExpression,
        handleExpressionClick,
        setInputOffset: onInputOffsetChange,
    };
};
