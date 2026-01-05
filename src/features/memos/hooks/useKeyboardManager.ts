import { useEffect } from 'react';

/**
 * Custom hook to manage keyboard visibility on mobile devices.
 * Updates --kbd-height CSS variable based on Visual Viewport changes.
 */
export const useKeyboardManager = (): void => {
    useEffect(() => {
        const updateKeyboardInset = () => {
            try {
                const vv = (window as any).visualViewport;
                if (vv && typeof vv.height === 'number') {
                    const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
                    document.documentElement.style.setProperty('--kbd-height', `${keyboardHeight}px`);
                } else {
                    document.documentElement.style.setProperty('--kbd-height', `0px`);
                }
            } catch (e) {
                // Silently ignore errors in browsers that don't support Visual Viewport
            }
        };

        const vv = (window as any).visualViewport;
        if (vv && typeof vv.addEventListener === 'function') {
            vv.addEventListener('resize', updateKeyboardInset);
            vv.addEventListener('scroll', updateKeyboardInset);
        }
        window.addEventListener('resize', updateKeyboardInset);
        window.addEventListener('focusin', updateKeyboardInset);
        window.addEventListener('focusout', updateKeyboardInset);

        // Initial update
        updateKeyboardInset();

        return () => {
            try {
                if (vv && typeof vv.removeEventListener === 'function') {
                    vv.removeEventListener('resize', updateKeyboardInset);
                    vv.removeEventListener('scroll', updateKeyboardInset);
                }
            } catch { }
            window.removeEventListener('resize', updateKeyboardInset);
            window.removeEventListener('focusin', updateKeyboardInset);
            window.removeEventListener('focusout', updateKeyboardInset);
            document.documentElement.style.setProperty('--kbd-height', `0px`);
        };
    }, []);
};
