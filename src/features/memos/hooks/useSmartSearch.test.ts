import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSmartSearch } from './useSmartSearch';
import { Tag } from '../types/tags';

describe('useSmartSearch', () => {
    const mockTags: Tag[] = [
        { id: '1', name: 'Work' },
        { id: '2', name: 'Personal' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        });
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => useSmartSearch(mockTags));
        expect(result.current.searchQuery).toBe('');
        expect(result.current.filterTags).toEqual([]);
        expect(result.current.parsedPreview).toBeNull();
    });

    it('updates search query and debounces local parsing', async () => {
        const { result } = renderHook(() => useSmartSearch(mockTags));

        // Update search query
        act(() => {
            result.current.handleSearchChange('2024年3月 Work');
        });

        expect(result.current.searchQuery).toBe('2024年3月 Work');
        expect(result.current.parsedPreview).toBeNull(); // Should be null immediately

        // Verify preview logic (start/end/tag should be populated)
        await waitFor(() => {
            expect(result.current.parsedPreview).toEqual({
                start: '2024-03-01',
                end: '2024-03-31',
                tag: 'Work',
                query: '2024年3月 Work',
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

    it('handles Date + Tag search (e.g. "2024年3月 Work")', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => result.current.setSearchQuery('2024年3月 Work'));

        await act(async () => {
            await result.current.handleSearch();
        });

        // Unified Smart event should be dispatched
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                // query should utilize buildDateQuery result
                dateQuery: 'date:2024-03-01..2024-03-31',
                textQuery: '',
                // tag should be present
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('does not leave connector words as text query after extracting date and tag', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => result.current.setSearchQuery('2024年3月とかのWork'));

        await act(async () => {
            await result.current.handleSearch();
        });

        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                dateQuery: 'date:2024-03-01..2024-03-31',
                textQuery: '',
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('overrides an existing selected date when the search bar contains a date', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useSmartSearch(mockTags));

        act(() => {
            result.current.setSelectedStartDate('2023-01-01');
            result.current.setSelectedEndDate('2023-12-31');
            result.current.setSearchQuery('2024年3月 Work');
        });

        await act(async () => {
            await result.current.handleSearch();
        });

        expect(result.current.selectedStartDate).toBe('2024-03-01');
        expect(result.current.selectedEndDate).toBe('2024-03-31');
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'smart',
                dateQuery: 'date:2024-03-01..2024-03-31',
                tagQuery: expect.arrayContaining([expect.objectContaining({ name: 'Work' })])
            })
        }));
    });

    it('handles Tag + Text search (e.g. "Work Meeting")', async () => {
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

    it('handles exact tag matches locally', async () => {
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
