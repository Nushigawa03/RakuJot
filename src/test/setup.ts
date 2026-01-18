/// <reference types="@testing-library/jest-dom" />
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock window.alert and window.confirm for happy-dom (not available by default)
globalThis.alert = vi.fn();
globalThis.confirm = vi.fn(() => true);

// Clean up after each test
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
