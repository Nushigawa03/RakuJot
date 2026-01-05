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

    // Initialize history
    useEffect(() => {
        const initial: MemoData = {
            title: initialMemo.title || "",
            body: initialMemo.body || "",
            date: initialMemo.date || "",
            tags: initialMemo.tags?.map(t => t.name) || []
        };
        setHistory([initial]);
        setHistoryIndex(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

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
            performSave(data.title, data.body, data.tags, data.date);
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
