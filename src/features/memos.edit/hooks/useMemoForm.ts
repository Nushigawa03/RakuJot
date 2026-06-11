import { useState, useEffect, useRef, useCallback } from 'react';

export interface Tag {
    id: string;
    name: string;
}

export interface MemoData {
    title: string;
    body: string;
    date: string;
    tags: string[];
}

interface UseMemoFormProps {
    initialMemo: {
        title: string;
        body: string;
        date?: string;
        tags?: Tag[];
    };
    onSubmit: (title: string, body: string, tags: string[], date: string) => Promise<boolean>;
}

export const useMemoForm = ({ initialMemo, onSubmit }: UseMemoFormProps) => {
    const [title, setTitle] = useState(initialMemo.title || "");
    const [body, setBody] = useState(initialMemo.body || "");
    const [date, setDate] = useState(initialMemo.date || "");
    const [selectedTags, setSelectedTags] = useState<string[]>(
        initialMemo.tags?.map(t => t.name) || []
    );

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // History management
    const [history, setHistory] = useState<MemoData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const initialStateRef = useRef<MemoData>({
        title: initialMemo.title || "",
        body: initialMemo.body || "",
        date: initialMemo.date || "",
        tags: initialMemo.tags?.map(t => t.name) || []
    });
    const latestStateRef = useRef<MemoData>(initialStateRef.current);
    const lastSubmittedJsonRef = useRef(JSON.stringify(initialStateRef.current));
    const saveInFlightRef = useRef<Promise<boolean> | null>(null);

    // Initialize history
    useEffect(() => {
        const initial = initialStateRef.current;
        setHistory([initial]);
        setHistoryIndex(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    useEffect(() => {
        latestStateRef.current = { title, body, date, tags: selectedTags };
    }, [title, body, date, selectedTags]);

    // Auto-save & History Capture Effect
    useEffect(() => {
        // Skip initial mount or external updates if we want to be strict, 
        // but simple comparison is enough.
        // We only want to auto-save if the current state differs from the "last saved" or "current history point".

        const timer = setTimeout(() => {
            // Check if current state differs from history[historyIndex]
            const currentState = { title, body, date, tags: selectedTags };

            // Allow auto-save if we have changes
            // Note: simple JSON stringify is "dirty" but effective for simple objects
            const currentJson = JSON.stringify(currentState);
            const historyJson = history[historyIndex] ? JSON.stringify(history[historyIndex]) : "";

            if (currentJson !== historyJson) {
                // Determine if we should push to history or just update current
                // For a "timed" auto-save, we usually push to history so Undo works for this "session".

                // 1. Push to history
                setHistory(prev => {
                    const newHistory = prev.slice(0, historyIndex + 1);
                    newHistory.push(currentState);
                    return newHistory;
                });
                setHistoryIndex(prev => prev + 1);

                // 2. Persist to server
                void flushSave(currentState);
            }
        }, 1500); // 1.5s delay after typing stops

        return () => clearTimeout(timer);
    }, [title, body, date, selectedTags, historyIndex]); // Dependencies on form state

    // Auto-clear lastSaved indicator
    useEffect(() => {
        if (lastSaved) {
            const timer = setTimeout(() => {
                setLastSaved(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [lastSaved]);

    const saveToHistory = useCallback((snapshot?: MemoData) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            const stateToSave = snapshot ?? { title, body, date, tags: selectedTags };
            newHistory.push(stateToSave);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex, title, body, date, selectedTags]);

    const performSave = async (
        targetTitle: string,
        targetBody: string,
        targetTags: string[],
        targetDate: string
    ): Promise<boolean> => {
        setIsSaving(true);
        try {
            const ok = await onSubmit(targetTitle, targetBody, targetTags, targetDate);
            if (ok) {
                lastSubmittedJsonRef.current = JSON.stringify({
                    title: targetTitle,
                    body: targetBody,
                    date: targetDate,
                    tags: targetTags
                });
                setLastSaved(new Date());
                return true;
            }
            return false;
        } catch (err) {
            console.error("Save error:", err);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const flushSave = useCallback((snapshot?: MemoData): Promise<boolean> => {
        const data = snapshot ?? latestStateRef.current;
        const json = JSON.stringify(data);
        if (json === lastSubmittedJsonRef.current) {
            return Promise.resolve(true);
        }

        const savePromise = performSave(data.title, data.body, data.tags, data.date);
        saveInFlightRef.current = savePromise;
        savePromise.finally(() => {
            if (saveInFlightRef.current === savePromise) {
                saveInFlightRef.current = null;
            }
        });
        return savePromise;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const flushLatest = () => {
            void flushSave();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushLatest();
            }
        };

        window.addEventListener('pagehide', flushLatest);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', flushLatest);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            flushLatest();
        };
    }, [flushSave]);

    const setAllState = (data: MemoData) => {
        setTitle(data.title);
        setBody(data.body);
        setDate(data.date);
        setSelectedTags(data.tags);
    };

    // Debounced save for undo/redo to allow rapid firing
    const undoRedoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerDebouncedSave = (data: MemoData) => {
        if (undoRedoTimeoutRef.current) {
            clearTimeout(undoRedoTimeoutRef.current);
        }
        undoRedoTimeoutRef.current = setTimeout(() => {
            void flushSave(data);
        }, 500);
    };

    const handleDiscardChanges = () => {
        if (history.length > 0) {
            const initial = history[0];
            // 1. Update UI immediately
            setAllState(initial);
            setHistoryIndex(0);
            // 2. Debounce save (or save immediately but non-blocking?) 
            // Discard is usually a "reset to clean state", so ensuring it eventually saves is good.
            // Using debouncer ensures consistancy with undo/redo behavior requested.
            triggerDebouncedSave(initial);
        }
    };

    const handleUndo = () => {
        // Check if current state is different from the current history point (dirty)
        // If so, "Undo" should just revert to the current history point without moving the index back.
        const currentState = { title, body, date, tags: selectedTags };
        const currentJson = JSON.stringify(currentState);
        const historyJson = history[historyIndex] ? JSON.stringify(history[historyIndex]) : "";

        if (currentJson !== historyJson) {
            // Revert dirty changes to last known active history state
            setAllState(history[historyIndex]);
            // No history index change, just "reset"
            return;
        }

        // Standard Undo
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            // 1. Update UI immediately
            setAllState(prevState);
            setHistoryIndex(prev => prev - 1);
            // 2. Debounce save
            triggerDebouncedSave(prevState);
        }
    };

    const handleRedo = () => {
        // Redo is simpler, usually just moves forward if we are not at tip.
        // If we are dirty and not at tip... behavior is ambiguous, but standard is:
        // If you make new changes while in the past, you usually fork history or lose future.
        // Here we just allow redo if possible.
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            // 1. Update UI immediately
            setAllState(nextState);
            setHistoryIndex(prev => prev + 1);
            // 2. Debounce save
            triggerDebouncedSave(nextState);
        }
    };

    return {
        // State
        title, setTitle,
        body, setBody,
        date, setDate,
        selectedTags, setSelectedTags,
        isSaving,
        lastSaved,
        historyIndex,
        historyLength: history.length,

        // Actions
        performSave,
        saveToHistory,
        handleDiscardChanges,
        handleUndo,
        handleRedo
    };
};
