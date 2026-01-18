import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSmartSearch } from './useSmartSearch';
import { searchService } from '../services/searchService';
import { Tag } from '../types/tags';

// Mock searchService
vi.mock('../services/searchService', () => ({
    searchService: {
        parseSearchQuery: vi.fn(),
    },
}));

describe('useSmartSearch', () => {
    const mockTags: Tag[] = [
        { id: '1', name: 'Work' },
        { id: '2', name: 'Personal' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => useSmartSearch(mockTags));
        expect(result.current.searchQuery).toBe('');
        expect(result.current.filterTags).toEqual([]);
        expect(result.current.parsedPreview).toBeNull();
    });

    it('updates search query and debounces parsing', async () => {
        // Setup mock response
        (searchService.parseSearchQuery as any).mockResolvedValue({
            start: '2024-01-01',
            end: '2024-01-31',
            tag: 'Work',
        });

        const { result } = renderHook(() => useSmartSearch(mockTags));

        // Update search query
        act(() => {
            result.current.handleSearchChange('Last month Work');
        });

        expect(result.current.searchQuery).toBe('Last month Work');
        expect(result.current.parsedPreview).toBeNull(); // Should be null immediately

        // Wait for debounce and async call
        await waitFor(() => {
            expect(searchService.parseSearchQuery).toHaveBeenCalledWith('Last month Work');
        });

        // Verify preview logic (start/end/tag should be populated)
        // Note: state updates in hook might be async, waitFor handles it
        await waitFor(() => {
            expect(result.current.parsedPreview).toEqual({
                start: '2024-01-01',
                end: '2024-01-31',
                tag: 'Work',
            });
        });
    });

    it('clears search state correctly', () => {
        const { result } = renderHook(() => useSmartSearch(mockTags));

        // Set some state
        act(() => {
            result.current.setSearchQuery('test');
            result.current.setSelectedStartDate('2024-01-01');
        });

        act(() => {
            result.current.handleClearSearch();
        });

        expect(result.current.searchQuery).toBe('');
        expect(result.current.selectedStartDate).toBeNull();
    });

    it('dispatches search events', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => {
            result.current.setSearchQuery('test query');
        });

        await act(async () => {
            await result.current.handleSearch();
        });

        expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
        // Check for event detail content if needed, but spy interaction is key
    });

    it('performs instant search with parsing when Enter is pressed immediately', async () => {
        // Setup mock response
        (searchService.parseSearchQuery as any).mockResolvedValue({
            start: null,
            end: null,
            tag: 'Work', // AI returns 'Work' tag
        });

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        // Set query "Work"
        act(() => {
            result.current.setSearchQuery('Work');
        });

        // Immediately trigger search
        await act(async () => {
            await result.current.handleSearch();
        });

        // verify parse was called
        expect(searchService.parseSearchQuery).toHaveBeenCalledWith('Work');

        // verify single SMART event was dispatched with consolidated data
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                // expect query is empty because "Work" became a tag
                textQuery: '',
                dateQuery: '',
                // expect tags array contains "Work"
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('handles Date + Tag search (e.g. "Last year Work")', async () => {
        (searchService.parseSearchQuery as any).mockResolvedValue({
            start: '2023-01-01',
            end: '2023-12-31',
            tag: 'Work',
        });

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => result.current.setSearchQuery('Last year Work'));

        await act(async () => {
            await result.current.handleSearch();
        });

        // Unified Smart event should be dispatched
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                // query should utilize buildDateQuery result
                dateQuery: expect.stringContaining('date:'),
                textQuery: expect.stringContaining('Last year'),
                // tag should be present
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('handles Tag + Text search (e.g. "Work Meeting")', async () => {
        (searchService.parseSearchQuery as any).mockResolvedValue({
            start: null,
            end: null,
            tag: 'Work',
        });

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => result.current.setSearchQuery('Work Meeting'));

        await act(async () => {
            await result.current.handleSearch();
        });

        // Unified Smart event
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                // "Meeting" should remain as text query
                textQuery: 'Meeting',
                dateQuery: '',
                // "Work" should be in tags
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('falls back to client-side tag matching when API parsing returns no result', async () => {
        // Mock API returning empty result (simulating failure or no parse)
        (searchService.parseSearchQuery as any).mockResolvedValue({});

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        // Set query "Work" which exists in mockTags
        act(() => result.current.setSearchQuery('Work'));

        await act(async () => {
            await result.current.handleSearch();
        });

        // Should dispatch Smart event with Tag set and Query cleared
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                textQuery: '',
                dateQuery: '',
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });
});
