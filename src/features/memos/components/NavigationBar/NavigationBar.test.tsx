import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NavigationBar from './NavigationBar';

// Mock dependnecies
vi.mock('../../stores/navigationBarStore', () => ({
    useNavigationBarStore: () => ({
        isOrSearch: false,
        isDetailSearch: false,
        toggleOrSearch: vi.fn(),
        toggleDetailSearch: vi.fn(),
    })
}));

vi.mock('../../services/searchService', () => ({
    searchService: {
        fetchTags: vi.fn().mockResolvedValue([]),
        parseSearchQuery: vi.fn(),
    }
}));

// Mock useSmartSearch hook
const mockHandleSearch = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockHandleTagAdd = vi.fn();

vi.mock('../../hooks/useSmartSearch', () => ({
    useSmartSearch: () => ({
        searchQuery: 'test query',
        setSearchQuery: mockSetSearchQuery,
        filterTags: [],
        // suggestions mocks
        suggestions: [],
        showSuggestions: false,
        selectedSuggestionIndex: -1,
        // handlers
        handleSearchChange: vi.fn(),
        handleTagAdd: mockHandleTagAdd,
        handleTagRemove: vi.fn(),
        findTagByName: vi.fn(), // return undefined = text search
        // state
        parsedPreview: null,
        isParsing: false,
        hasSearchConditions: true,
        selectedStartDate: null,
        selectedEndDate: null,
        // main action
        handleSearch: mockHandleSearch,
        handleClearSearch: vi.fn(),
    })
}));

describe('NavigationBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders search input', () => {
        render(<NavigationBar />);
        expect(screen.getByPlaceholderText('さがす...')).toBeInTheDocument();
    });

    it('calls handleSearch when search button is clicked', () => {
        render(<NavigationBar />);
        const button = screen.getByText('🔍');
        fireEvent.click(button);
        expect(mockHandleSearch).toHaveBeenCalled();
    });

    it('calls handleSearch when Enter is pressed in input', () => {
        render(<NavigationBar />);
        const input = screen.getByPlaceholderText('さがす...');

        // Simulate enter press
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        // Since mock useSmartSearch returns 'test query' as searchQuery logic should trigger handleSearch
        // Note: Logic inside NavigationBar checks if foundTag is present. 
        // We mocked findTagByName to return undefined, so it should treat as text search -> handleSearch()
        expect(mockHandleSearch).toHaveBeenCalled();
    });
});
