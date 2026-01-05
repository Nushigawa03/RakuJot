import { useState } from 'react';
import { memoService } from '../../memos/services/memoService';
import { MemoData } from './useMemoForm';

interface UseMemoAiProps {
    currentMemo: MemoData;
    onApply: (data: MemoData) => Promise<void>;
}

export const useMemoAi = ({ currentMemo, onApply }: UseMemoAiProps) => {
    const [quickEditContent, setQuickEditContent] = useState("");
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<MemoData | null>(null);
    const [autoApplySuggestions, setAutoApplySuggestions] = useState(true);

    const handleAiSuggest = async () => {
        if (!quickEditContent.trim()) return;

        setIsAiProcessing(true);
        try {
            const aiPayload = await memoService.suggestEditForContent(
                currentMemo.body,
                quickEditContent,
                { tagLimit: 10 }
            );

            const suggestion: MemoData = {
                title: aiPayload.title || currentMemo.title || 'AIが提案するタイトル',
                body: aiPayload.body || quickEditContent,
                tags: Array.from(new Set([...currentMemo.tags, ...(aiPayload.tags || [])])),
                date: aiPayload.date || currentMemo.date || new Date().toLocaleDateString('ja-JP'),
            };

            if (autoApplySuggestions) {
                await onApply(suggestion);
                setQuickEditContent("");
                setAiSuggestion(null);
            } else {
                setAiSuggestion(suggestion);
            }
        } catch (error) {
            console.error("AI提案エラー:", error);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleApplySuggestion = async () => {
        if (!aiSuggestion) return;
        await onApply(aiSuggestion);
        setAiSuggestion(null);
        setQuickEditContent("");
    };

    const handleRejectSuggestion = () => {
        setAiSuggestion(null);
    };

    return {
        quickEditContent,
        setQuickEditContent,
        isAiProcessing,
        aiSuggestion,
        setAiSuggestion,
        handleAiSuggest,
        handleApplySuggestion,
        handleRejectSuggestion,
        autoApplySuggestions,
        setAutoApplySuggestions,
    };
};
