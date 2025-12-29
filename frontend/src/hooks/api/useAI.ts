/**
 * AI Query Hooks
 * React Query hooks for AI API
 */

import { useMutation } from '@tanstack/react-query';
import { aiApi } from '@/api/services/ai.api';
import type { ChatMessage, AISummaryLength, AIRewriteTone } from '@/types';
import { toast } from 'sonner';

/**
 * Hook for AI chat
 */
export const useAIChat = () => {
    return useMutation({
        mutationFn: ({ message, documentText, history }: {
            message: string;
            documentText: string;
            history?: ChatMessage[];
        }) => aiApi.chat(message, documentText, history),
        onError: (error: Error) => {
            toast.error(error.message || 'AI chat failed');
        },
    });
};

/**
 * Hook for document summarization
 */
export const useAISummarize = () => {
    return useMutation({
        mutationFn: ({ documentText, length }: {
            documentText: string;
            length?: AISummaryLength;
        }) => aiApi.summarize(documentText, length),
        onError: (error: Error) => {
            toast.error(error.message || 'Summarization failed');
        },
    });
};

/**
 * Hook for text rewriting
 */
export const useAIRewrite = () => {
    return useMutation({
        mutationFn: ({ text, tone }: {
            text: string;
            tone?: AIRewriteTone;
        }) => aiApi.rewrite(text, tone),
        onError: (error: Error) => {
            toast.error(error.message || 'Rewriting failed');
        },
    });
};

/**
 * Hook for generating questions
 */
export const useAIQuestions = () => {
    return useMutation({
        mutationFn: ({ documentText, count }: {
            documentText: string;
            count?: number;
        }) => aiApi.generateQuestions(documentText, count),
        onError: (error: Error) => {
            toast.error(error.message || 'Question generation failed');
        },
    });
};

/**
 * Hook for extracting key information
 */
export const useAIExtract = () => {
    return useMutation({
        mutationFn: (documentText: string) => aiApi.extractKeyInfo(documentText),
        onError: (error: Error) => {
            toast.error(error.message || 'Information extraction failed');
        },
    });
};
