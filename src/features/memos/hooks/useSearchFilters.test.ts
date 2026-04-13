import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchFilters } from './useSearchFilters';

// Mock dependencies
vi.mock('../services/tagExpressionService', () => ({
    default: {
        load: vi.fn().mockResolvedValue([]),
        getCachedExpressions: vi.fn().mockReturnValue([]),
    }
}));

// Mock useTagExpression hook
vi.mock('./useTagExpression', () => ({
    useTagExpression: () => ({
        activeExpression: '',
        handleExpressionClick: vi.fn(),
    })
}));

describe('useSearchFilters', () => {
    const mockOnInputOffsetChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles unified "smart" search event correctly', () => {
        const { result } = renderHook(() => useSearchFilters(mockOnInputOffsetChange));

        // Simulate smart search event with both date and tags
        act(() => {
            window.dispatchEvent(new CustomEvent('searchExecuted', {
                detail: {
                    type: 'smart',
                    dateQuery: 'date:2024-01-01...',
                    tagQuery: [{ id: '1', name: 'Work', isExclude: false }]
                }
            }));
        });

        // Check if state is updated
        expect(result.current.dateQuery).toBe('date:2024-01-01...');
        expect(result.current.tagQuery).toEqual([{ id: '1', name: 'Work', isExclude: false }]);
        expect(mockOnInputOffsetChange).toHaveBeenCalledWith(1);
    });

    it('handles "clear" event correctly', () => {
        const { result } = renderHook(() => useSearchFilters(mockOnInputOffsetChange));

        // Set initial state via smart event
        act(() => {
            window.dispatchEvent(new CustomEvent('searchExecuted', {
                detail: {
                    type: 'smart',
                    textQuery: 'foo',
                    tagQuery: [{ id: '1', name: 'bar', isExclude: false }]
                }
            }));
        });

        expect(result.current.textQuery).toBe('foo');
        expect(result.current.tagQuery).toEqual([{ id: '1', name: 'bar', isExclude: false }]);

        // Simulate clear event
        act(() => {
            window.dispatchEvent(new CustomEvent('searchExecuted', {
                detail: { type: 'clear' }
            }));
        });

        // Verify cleared state
        expect(result.current.dateQuery).toBe('');
        expect(result.current.textQuery).toBe('');
        expect(result.current.tagQuery).toEqual([]);
        expect(mockOnInputOffsetChange).toHaveBeenCalledWith(0);
    });
});
